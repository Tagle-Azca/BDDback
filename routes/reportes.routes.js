const express = require("express");
const router = express.Router();
const Reporte = require("../models/Reportes");
const Fraccionamiento = require("../models/fraccionamiento");
const mongoose = require("mongoose");

const manejarError = (res, error, mensaje = "Error interno del servidor", status = 500) => {
  res.status(status).json({ error: mensaje });
};

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

router.post("/:fraccId/crear", validarFraccionamiento, async (req, res) => {
  try {
    const { 
      notificationId,
      nombre,
      motivo,
      foto,
      numeroCasa,
      estatus,
      residenteId,
      residenteNombre
    } = req.body;

    if (!nombre || !motivo || !numeroCasa || !estatus) {
      return res.status(400).json({ 
        error: "Datos incompletos: nombre, motivo, numeroCasa y estatus son obligatorios" 
      });
    }

    const estatusValidos = ['aceptado', 'rechazado', 'expirado'];
    if (!estatusValidos.includes(estatus.toLowerCase())) {
      return res.status(400).json({ 
        error: "Estatus inválido. Debe ser: aceptado, rechazado o expirado" 
      });
    }

    if (estatus !== 'expirado' && residenteId) {
      const usuarioValido = validarUsuarioEnFraccionamiento(req.fraccionamiento, residenteId);
      if (!usuarioValido) {
        return res.status(403).json({ 
          error: "Residente no autorizado en este fraccionamiento" 
        });
      }
    }

    if (notificationId) {
      const reporteExistente = await Reporte.findOne({ notificationId });
      if (reporteExistente) {
        console.log(`Notificación ${notificationId} ya fue contestada por: ${reporteExistente.autorizadoPor}`);
        return res.status(409).json({ 
          error: "Esta notificación ya fue contestada por otro residente",
          yaContestada: true,
          reporte: reporteExistente,
          respondidoPor: reporteExistente.autorizadoPor,
          estatus: reporteExistente.estatus.toUpperCase()
        });
      }
    }

    const cincuMinutosAtras = new Date(Date.now() - 5 * 60 * 1000);
    const reporteRecienteEnCasa = await Reporte.findOne({
      fraccId: req.params.fraccId,
      numeroCasa: numeroCasa.toString(),
      nombre: nombre,
      motivo: motivo,
      tiempo: { $gte: cincuMinutosAtras }
    });

    if (reporteRecienteEnCasa) {
      return res.status(409).json({ 
        error: "Ya existe un reporte similar reciente para esta casa",
        reporte: reporteRecienteEnCasa
      });
    }

    const nuevoReporte = new Reporte({
      fraccId: req.params.fraccId,
      numeroCasa: numeroCasa.toString(),
      nombre: nombre,
      motivo: motivo,
      foto: foto,
      estatus: estatus.toLowerCase(),
      autorizadoPor: residenteNombre || (estatus === 'expirado' ? 'Sistema' : 'Usuario'),
      tiempo: new Date(),
      notificationId: notificationId
    });

    let reporteGuardado;
    try {
      reporteGuardado = await nuevoReporte.save();
    } catch (mongoError) {
      if (mongoError.code === 11000) {
        return res.status(409).json({ 
          error: "Ya existe un reporte idéntico. Solo se puede procesar uno a la vez.",
          details: "Reporte duplicado bloqueado por filtro milimétrico"
        });
      }
      throw mongoError;
    }

    const io = req.app.get('io');
    if (io) {
      const room = `casa_${numeroCasa}_${req.params.fraccId}`;
      console.log(`Notificando a la casa ${numeroCasa} que ${residenteNombre || 'un residente'} ${estatus} la solicitud`);
      
      io.to(room).emit('notificacionContestada', {
        reporteId: reporteGuardado._id.toString(),
        notificationId: reporteGuardado.notificationId,
        estatus: estatus.toUpperCase(),
        autorizadoPor: reporteGuardado.autorizadoPor,
        numeroCasa: numeroCasa,
        fraccId: req.params.fraccId,
        timestamp: new Date(),
        action: 'notification_answered',
        mensaje: `${residenteNombre || 'Un residente'} ${estatus === 'aceptado' ? 'aceptó' : 'rechazó'} la solicitud`,
        visitante: reporteGuardado.nombre,
        motivo: reporteGuardado.motivo
      });

      // También enviar notificación push silenciosa para retirar banners
      console.log(`🚀 Enviando retiro de banner: Casa ${numeroCasa}, NotificationId: ${reporteGuardado.notificationId}, Estatus: ${estatus}`);
      await enviarNotificacionRetiroBanner(req.params.fraccId, numeroCasa, reporteGuardado.notificationId, estatus, residenteNombre);
    }

    if (estatus.toLowerCase() === 'aceptado') {
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
        }
      }, 10000);
    }

    res.status(201).json({
      success: true,
      mensaje: `Reporte creado como ${estatus.toUpperCase()}`,
      reporte: reporteGuardado,
      puertaAbierta: estatus.toLowerCase() === 'aceptado'
    });

  } catch (error) {
    manejarError(res, error, "Error al crear reporte");
  }
});

router.get("/:fraccId", async (req, res) => {
  try {
    const { fraccId } = req.params;
    const { casa, desde, hasta, limite = 50, incluirExpiradas = 'false' } = req.query;

    const filtro = { fraccId: fraccId };

    if (incluirExpiradas.toLowerCase() === 'false') {
      filtro.estatus = { $nin: ['expirado'] };
    }
    
    if (casa) filtro.numeroCasa = casa;
    if (desde) filtro.tiempo = { $gte: new Date(desde) };
    if (hasta) filtro.tiempo = { ...filtro.tiempo, $lte: new Date(hasta) };
    
    const reportes = await Reporte.find(filtro)
      .sort({ tiempo: -1 })
      .limit(parseInt(limite));

    const estadisticas = {
      total: reportes.length,
      aceptados: reportes.filter(r => r.estatus === 'aceptado').length,
      rechazados: reportes.filter(r => r.estatus === 'rechazado').length,
      expirados: reportes.filter(r => r.estatus === 'expirado').length
    };
    
    res.json({
      success: true,
      fraccionamiento: fraccId,
      reportes: reportes,
      estadisticas: estadisticas
    });
    
  } catch (error) {
    manejarError(res, error, "Error al obtener reportes");
  }
});

router.get("/:fraccId/casa/:numeroCasa", async (req, res) => {
  try {
    const { fraccId, numeroCasa } = req.params;
    const { limite = 50, desde, incluirExpiradas = 'false' } = req.query;

    const filtro = {
      fraccId: fraccId,
      numeroCasa: numeroCasa.toString()
    };
    if (incluirExpiradas.toLowerCase() === 'false') {
      filtro.estatus = { $nin: ['expirado'] };
    }
    
    if (desde) {
      filtro.tiempo = { $gte: new Date(desde) };
    }
    
    const reportes = await Reporte.find(filtro)
      .sort({ tiempo: -1 })
      .limit(parseInt(limite));
    
    const estadisticas = {
      total: reportes.length,
      aceptados: reportes.filter(r => r.estatus === 'aceptado').length,
      rechazados: reportes.filter(r => r.estatus === 'rechazado').length,
      expirados: reportes.filter(r => r.estatus === 'expirado').length
    };
    
    res.json({
      success: true,
      casa: numeroCasa,
      fraccionamiento: fraccId,
      reportes: reportes,
      estadisticas: estadisticas
    });
    
  } catch (error) {
    manejarError(res, error, "Error al obtener historial de casa");
  }
});

router.get("/reporte/:reporteId", async (req, res) => {
  try {
    const { reporteId } = req.params;
    
    const reporte = await Reporte.findById(reporteId);
    
    if (!reporte) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }
    
    res.json({
      success: true,
      reporte: reporte
    });
    
  } catch (error) {
    manejarError(res, error, "Error al obtener reporte");
  }
});

router.put("/reporte/:reporteId", async (req, res) => {
  try {
    const { reporteId } = req.params;
    const { estatus, residenteNombre } = req.body;
    
    const estatusValidos = ['aceptado', 'rechazado', 'expirado'];
    if (!estatusValidos.includes(estatus.toLowerCase())) {
      return res.status(400).json({ 
        error: "Estatus inválido. Debe ser: aceptado, rechazado o expirado" 
      });
    }
    
    const reporte = await Reporte.findByIdAndUpdate(
      reporteId,
      { 
        estatus: estatus.toLowerCase(),
        autorizadoPor: residenteNombre || 'Sistema',
        tiempo: new Date()
      },
      { new: true }
    );
    
    if (!reporte) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }
    
    res.json({
      success: true,
      mensaje: "Reporte actualizado",
      reporte: reporte
    });
    
  } catch (error) {
    manejarError(res, error, "Error al actualizar reporte");
  }
});

async function enviarNotificacionRetiroBanner(fraccId, numeroCasa, notificationId, estatus, residenteNombre) {
  try {
    const Fraccionamiento = require("../models/fraccionamiento");
    const fraccionamiento = await Fraccionamiento.findById(fraccId);

    if (!fraccionamiento) return;

    const casa = fraccionamiento.residencias.find(r => r.numero.toString() === numeroCasa.toString());
    if (!casa) return;

    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
    if (residentesActivos.length === 0) return;

    const playerIds = [...new Set(residentesActivos
      .map(residente => residente.playerId)
      .filter(id => id && id.trim() !== ''))];

    console.log(`🔍 Casa ${numeroCasa}: ${residentesActivos.length} residentes activos, ${playerIds.length} Player IDs únicos`);
    console.log(`🔍 Player IDs: ${playerIds.join(', ')}`);

    if (playerIds.length === 0) {
      console.log('❌ No hay Player IDs válidos para enviar retiro de banner');
      return;
    }

    const payload = {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      contents: { "en": "Banner removal" },
      headings: { "en": "Notification Update" },
      content_available: true,
      priority: 10,
      silent: true,
      data: {
        type: 'banner_removal',
        tipo: 'banner_removal',
        notificationId: notificationId,
        notification_id: notificationId,
        estatus: estatus,
        autorizadoPor: residenteNombre,
        action: 'remove_notification_banner',
        timestamp: Date.now().toString()
      },
      ios_sound: "",
      android_channel_id: "silent_notifications",
      mutable_content: true
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log(`🗑️ Notificación de retiro de banner enviada: ${result.id} - ${playerIds.length} dispositivos`);

  } catch (error) {
    console.error('Error enviando notificación de retiro de banner:', error);
  }
}

module.exports = router;
module.exports.enviarNotificacionRetiroBanner = enviarNotificacionRetiroBanner;