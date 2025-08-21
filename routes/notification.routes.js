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

const obtenerDatosResidente = (fraccionamiento, residenteId) => {
  const residente = fraccionamiento.residencias
    .flatMap(r => r.residentes)
    .find(r => r._id.toString() === residenteId);
  
  const numeroCasa = fraccionamiento.residencias
    .find(r => r.residentes.some(res => res._id.toString() === residenteId))?.numeroCasa;
  
  return { residente, numeroCasa };
};

const crearReporteDesdeNotificacion = async (notificacion, estatus, autorizadoPor, fraccId, numeroCasa) => {
  const nuevoReporte = new Reporte({
    fraccId: fraccId,
    numeroCasa: numeroCasa?.toString(),
    nombre: notificacion.titulo,
    motivo: notificacion.body,
    foto: notificacion.foto,
    tiempo: notificacion.fecha,
    estatus: estatus,
    autorizadoPor: autorizadoPor
  });

  const reporteGuardado = await nuevoReporte.save();
  console.log(`Reporte ${reporteGuardado._id} guardado como ${estatus.toUpperCase()}`);

  await Notificacion.findByIdAndUpdate(notificacion._id, { respondida: true });
  
  return reporteGuardado;
};

const emitirSocketReporte = (io, reporteId, estatus, autorizadoPor) => {
  if (io) {
    io.emit('reporteActualizado', {
      reporteId: reporteId,
      estatus: estatus.toUpperCase(),
      autorizadoPor: autorizadoPor
    });
  }
};

const procesarRespuestaNotificacion = async (req, res, accion) => {
  const { residenteId, residenteNombre } = req.body;
  
  try {
    const usuarioValido = validarUsuarioEnFraccionamiento(req.fraccionamiento, residenteId);
    if (!usuarioValido) {
      return res.json({ success: false, message: "Residente no autorizado en este fraccionamiento" });
    }

    if (accion === 'aceptado') {
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
    }

    const { residente, numeroCasa } = obtenerDatosResidente(req.fraccionamiento, residenteId);
    
    if (residente) {
      const notificacion = await Notificacion.findOne({
        fraccId: req.params.fraccId,
        residencia: numeroCasa?.toString(),
        respondida: false
      }).sort({ fecha: -1 });

      if (notificacion) {
        console.log(`Guardando reporte ${accion.toUpperCase()} para casa: ${numeroCasa}`);
        
        const reporteGuardado = await crearReporteDesdeNotificacion(
          notificacion, 
          accion, 
          residenteNombre, 
          req.params.fraccId, 
          numeroCasa
        );

        const io = req.app.get('io');
        emitirSocketReporte(io, reporteGuardado._id.toString(), accion, residenteNombre);
      }
    }
    
    const mensaje = accion === 'aceptado' ? 
      "Acceso concedido - Puerta abierta" : 
      "Acceso denegado correctamente";
    
    res.json({ 
      success: true, 
      message: mensaje,
      accion: accion.toUpperCase()
    });

  } catch (error) {
    console.error(`Error ${accion} acceso desde notificación:`, error);
    manejarError(res, error, "Error interno del servidor");
  }
};

router.post('/:fraccId/notificacion/abrir-puerta', validarFraccionamiento, async (req, res) => {
  await procesarRespuestaNotificacion(req, res, 'aceptado');
});

router.post('/:fraccId/notificacion/rechazar-acceso', validarFraccionamiento, async (req, res) => {
  await procesarRespuestaNotificacion(req, res, 'rechazado');
});

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
      .map(player => {
        if (player.originalPlayerId && player.originalPlayerId.length === 36) {
          return player.originalPlayerId;
        }
        
        if (player.playerId && player.playerId.includes('_')) {
          const uuidPart = player.playerId.split('_')[0];
          if (uuidPart.length === 36 && uuidPart.includes('-')) {
            return uuidPart;
          }
        }
        
        return null;
      })
      .filter(id => id && id.length === 36))];

    if (playerIds.length === 0) {
      return res.status(400).json({ 
        error: "No hay Player IDs válidos para esta casa"
      });
    }

    const payload = {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      big_picture: foto,
      data: { 
        fraccId, 
        residencia, 
        foto, 
        nombre: title, 
        motivo: body, 
        tipo: 'solicitud_acceso',
        reporteId: reporteId  
      }
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    const resultado = await response.json();
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

const marcarNotificacionesExpiradas = async () => {
  try {
    const hace10Minutos = new Date(Date.now() - 10 * 60 * 1000);
    
    const notificacionesExpiradas = await Notificacion.find({
      fecha: { $lt: hace10Minutos },
      respondida: false
    });

    for (const notificacion of notificacionesExpiradas) {
      await crearReporteDesdeNotificacion(
        notificacion, 
        'expirado', 
        'Sistema',
        notificacion.fraccId,
        notificacion.residencia
      );
      
      console.log(`Notificación ${notificacion._id} marcada como expirada`);
    }
  } catch (error) {
    console.error('Error marcando notificaciones expiradas:', error);
  }
};

setInterval(marcarNotificacionesExpiradas, 2 * 60 * 1000);

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

module.exports = router;