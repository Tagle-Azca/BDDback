const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const Reporte = require("../models/Reportes");
const Notificacion = require("../models/Notification");
const PlayerRegistry = require("../models/playerRegistry");
const Fraccionamiento = require("../models/fraccionamiento");

const validarFraccionamiento = async (req, res, next) => {
  try {
    const fracc = await Fraccionamiento.findById(req.params.fraccId);
    
    if (!fracc) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }
    
    req.fraccionamiento = fracc;
    next();
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const validarUsuarioEnFraccionamiento = (fraccionamiento, residenteId) => {
  for (const residencia of fraccionamiento.residencias) {
    const residente = residencia.residentes.find(r => 
      r._id.toString() === residenteId && r.activo === true
    );
    if (residente) return true;
  }
  return false;
};

const manejarError = (res, error, mensaje = "Error interno del servidor", status = 500) => {
  console.error(mensaje, error);
  res.status(status).json({ error: mensaje });
};

const buscarNotificacionPendiente = async (fraccId, numeroCasa) => {
  let notificacion = await Notificacion.findOne({
    fraccId: fraccId,
    residencia: numeroCasa?.toString(),
    respondida: false
  }).sort({ fecha: -1 });
  
  if (!notificacion) {
    notificacion = await Notificacion.findOne({
      fraccId: fraccId,
      residencia: numeroCasa?.toString(),
      respondida: { $exists: false }
    }).sort({ fecha: -1 });
  }
  
  return notificacion;
};

const crearReporteUnico = async (notificacion, estatus, autorizadoPor) => {
  const reporteExistente = await Reporte.findOne({
    fraccId: notificacion.fraccId,
    numeroCasa: notificacion.residencia,
    nombre: notificacion.title,
    tiempo: notificacion.fecha
  });

  if (reporteExistente) {
    console.log(`Ya existe reporte para esta notificación: ${reporteExistente._id}`);
    return reporteExistente;
  }

  const nuevoReporte = new Reporte({
    fraccId: notificacion.fraccId,
    numeroCasa: notificacion.residencia,
    nombre: notificacion.title,
    motivo: notificacion.body,
    foto: notificacion.foto,
    tiempo: notificacion.fecha,
    estatus: estatus,
    autorizadoPor: autorizadoPor
  });

  return await nuevoReporte.save();
};


router.post("/send-notification", async (req, res) => {
  try {
    const { title, body, fraccId, residencia, foto, reporteId } = req.body;

    const playersEnCasa = await PlayerRegistry.find({ 
      fraccId: fraccId, 
      residencia: residencia.toString() 
    });

    if (playersEnCasa.length === 0) {
      return res.status(400).json({ 
        error: "No hay dispositivos registrados en esta casa"
      });
    }

    const playerIds = [...new Set(playersEnCasa
      .map(player => player.playerId)
      .filter(id => id && id.trim() !== ''))];

    if (playerIds.length === 0) {
      return res.status(400).json({ 
        error: "No hay Player IDs válidos para esta casa"
      });
    }

    // PAYLOAD SIMPLIFICADO - Solo lo esencial para iOS
    const payload = {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      big_picture: foto,
      priority: 10,
      content_available: true,
      ios_sound: "default",
      data: { 
        fraccId, 
        residencia, 
        foto, 
        nombre: title, 
        motivo: body, 
        tipo: 'solicitud_acceso',
        reporteId: reporteId,
        action: 'show_notification_widget'
      }
    };

    console.log("📤 Enviando payload:", JSON.stringify(payload, null, 2));

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    const resultado = await response.json();
    console.log("📥 Respuesta OneSignal:", JSON.stringify(resultado, null, 2));

    await Notificacion.create({ title, body, fraccId, residencia, foto });

    res.json({ 
      mensaje: "Notificación enviada", 
      dispositivos: playerIds.length,
      playerIds: playerIds,
      reporteId: reporteId, 
      resultado 
    });

  } catch (error) {
    console.error("Error enviando notificación:", error);
    res.status(500).json({ error: "Error al enviar notificación" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { playerId, fraccId, residencia } = req.body;
    
    if (!playerId || playerId.trim() === '') {
      return res.status(400).json({ error: "Player ID es requerido" });
    }
    
    await PlayerRegistry.deleteMany({ 
      playerId: playerId, 
      fraccId, 
      residencia: residencia.toString()
    });
    
    await PlayerRegistry.create({
      playerId: playerId,                    
      fraccId: fraccId,
      residencia: residencia.toString(),   
      createdAt: new Date()
    });
    
    res.json({ 
      success: true, 
      message: "Dispositivo registrado exitosamente"
    });
    
  } catch (error) {
    console.error("Error registrando dispositivo:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/devices/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    
    const playersRegistry = await PlayerRegistry.find({ 
      fraccId, 
      residencia: residencia.toString() 
    });
    
    const devices = playersRegistry.map(p => ({
      playerId: p.playerId,
      createdAt: p.createdAt
    }));
    
    res.json({
      casa: residencia,
      fraccionamiento: fraccId,
      totalDevices: devices.length,
      devices: devices,
      playerIds: devices.map(d => d.playerId)
    });
    
  } catch (error) {
    console.error("Error verificando dispositivos:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/clear/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    
    const deleted = await PlayerRegistry.deleteMany({ 
      fraccId, 
      residencia: residencia.toString() 
    });
    
    res.json({
      mensaje: "Registros eliminados",
      eliminados: deleted.deletedCount
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:fraccId/notificacion/abrir-puerta', validarFraccionamiento, async (req, res) => {
  const { residenteId, reporteId, residenteNombre } = req.body;  
  
  try {
    const usuarioValido = validarUsuarioEnFraccionamiento(req.fraccionamiento, residenteId);
    if (!usuarioValido) {
      return res.json({ success: false, message: "Residente no autorizado en este fraccionamiento" });
    }

    await Fraccionamiento.updateOne(
      { _id: req.params.fraccId }, 
      { $set: { puerta: true } }
    );
    
    setTimeout(async () => {
      try {
        await Fraccionamiento.updateOne(
          { _id: req.params.fraccId }, 
          { $set: { puerta: false } }
        );
      } catch (error) {
        console.error('Error cerrando puerta automáticamente:', error);
      }
    }, 10000);

    const residente = req.fraccionamiento.residencias
      .flatMap(r => r.residentes)
      .find(r => r._id.toString() === residenteId);
    
    if (residente) {
      const numeroCasa = req.fraccionamiento.residencias
        .find(r => r.residentes.some(res => res._id.toString() === residenteId))?.numero;
      
      console.log(`Buscando notificación pendiente para casa: ${numeroCasa}`);
      
      const notificacion = await buscarNotificacionPendiente(req.params.fraccId, numeroCasa);

      if (notificacion) {
        console.log(`Encontrada notificación: ${notificacion._id}`);
        console.log(`Guardando reporte ACEPTADO para casa: ${numeroCasa}`);
        
        const reporteGuardado = await crearReporteUnico(notificacion, 'aceptado', residenteNombre);
        console.log(`Reporte ${reporteGuardado._id} guardado como ACEPTADO`);

        await Notificacion.findByIdAndUpdate(notificacion._id, { respondida: true });

        const io = req.app.get('io');
        if (io) {
          io.emit('reporteActualizado', {
            reporteId: reporteGuardado._id.toString(),
            estatus: 'ACEPTADO',
            autorizadoPor: residenteNombre
          });
        }
      } else {
        console.log(`No se encontró notificación pendiente para casa: ${numeroCasa}`);
      }
    }
    
    res.json({ 
      success: true, 
      message: "Acceso concedido - Puerta abierta",
      accion: "ACEPTADO"
    });

  } catch (error) {
    console.error('Error abriendo puerta desde notificación:', error);
    manejarError(res, error, "Error interno del servidor");
  }
});

router.post('/:fraccId/notificacion/rechazar-acceso', validarFraccionamiento, async (req, res) => {
  const { residenteId, reporteId, residenteNombre, motivo } = req.body;  
  
  try {
    const usuarioValido = validarUsuarioEnFraccionamiento(req.fraccionamiento, residenteId);
    if (!usuarioValido) {
      return res.json({ success: false, message: "Residente no autorizado en este fraccionamiento" });
    }

    const residente = req.fraccionamiento.residencias
      .flatMap(r => r.residentes)
      .find(r => r._id.toString() === residenteId);
    
    if (residente) {
      const numeroCasa = req.fraccionamiento.residencias
        .find(r => r.residentes.some(res => res._id.toString() === residenteId))?.numero;
      
      console.log(`Buscando notificación pendiente para casa: ${numeroCasa}`);
      
      const notificacion = await buscarNotificacionPendiente(req.params.fraccId, numeroCasa);

      if (notificacion) {
        console.log(`Encontrada notificación: ${notificacion._id}`);
        console.log(`Guardando reporte RECHAZADO para casa: ${numeroCasa}`);
        
        const reporteGuardado = await crearReporteUnico(notificacion, 'rechazado', residenteNombre);
        console.log(`Reporte ${reporteGuardado._id} guardado como RECHAZADO`);

        await Notificacion.findByIdAndUpdate(notificacion._id, { respondida: true });

        const io = req.app.get('io');
        if (io) {
          io.emit('reporteActualizado', {
            reporteId: reporteGuardado._id.toString(),
            estatus: 'RECHAZADO',
            autorizadoPor: residenteNombre
          });
        }
      } else {
        console.log(`No se encontró notificación pendiente para casa: ${numeroCasa}`);
      }
    }

    res.json({ 
      success: true, 
      message: "Acceso denegado correctamente",
      accion: "RECHAZADO"
    });

  } catch (error) {
    console.error('Error rechazando acceso desde notificación:', error);
    manejarError(res, error, "Error al procesar rechazo");
  }
});

const marcarNotificacionesExpiradas = async () => {
  try {
    const hace10Minutos = new Date(Date.now() - 10 * 60 * 1000);
    
    const notificacionesExpiradas = await Notificacion.find({
      fecha: { $lt: hace10Minutos },
      $or: [
        { respondida: false },
        { respondida: { $exists: false } }
      ]
    });

    for (const notificacion of notificacionesExpiradas) {
      const reporteExistente = await Reporte.findOne({
        fraccId: notificacion.fraccId,
        numeroCasa: notificacion.residencia,
        nombre: notificacion.title,
        tiempo: notificacion.fecha
      });

      if (!reporteExistente) {
        await crearReporteUnico(notificacion, 'expirado', 'Sistema');
        console.log(`Notificación ${notificacion._id} marcada como expirada`);
      } else {
        console.log(`Notificación ${notificacion._id} ya tiene reporte, solo marcando como respondida`);
      }

      await Notificacion.findByIdAndUpdate(notificacion._id, { respondida: true });
    }
  } catch (error) {
    console.error('Error marcando notificaciones expiradas:', error);
  }
};

router.get("/historial/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    const { limite = 50, desde } = req.query;

    const filtro = {
      fraccId: fraccId,
      numeroCasa: residencia.toString()
    };
    
    if (desde) {
      filtro.tiempo = { $gte: new Date(desde) };
    }
    
    const reportes = await Reporte.find(filtro)
      .sort({ tiempo: -1 })
      .limit(parseInt(limite));
    
    const estadisticas = {
      total: reportes.length,
      pendientes: 0,
      aceptados: reportes.filter(r => r.estatus === 'aceptado').length,
      rechazados: reportes.filter(r => r.estatus === 'rechazado').length,
      expirados: reportes.filter(r => r.estatus === 'expirado').length
    };
    
    res.json({
      success: true,
      casa: residencia,
      fraccionamiento: fraccId,
      reportes: reportes,
      estadisticas: estadisticas,
      total: reportes.length
    });
    
  } catch (error) {
    console.error("Error obteniendo historial de casa:", error);
    res.status(500).json({ 
      error: "Error al obtener historial de reportes",
      details: error.message 
    });
  }
});

router.get("/reportes/:fraccId", async (req, res) => {
  try {
    const { fraccId } = req.params;
    const { desde, hasta, casa } = req.query;
    
    const filtro = { fraccId: fraccId };
    
    if (casa) filtro.numeroCasa = casa;
    if (desde) filtro.tiempo = { $gte: new Date(desde) };
    if (hasta) filtro.tiempo = { ...filtro.tiempo, $lte: new Date(hasta) };
    
    const reportes = await Reporte.find(filtro).sort({ tiempo: -1 });
    res.json(reportes);
    
  } catch (error) {
    console.error("Error obteniendo reportes del fraccionamiento:", error);
    res.status(500).json({ error: error.message });
  }
});

setInterval(marcarNotificacionesExpiradas, 2 * 60 * 1000);

module.exports = router;