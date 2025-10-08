const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const crypto = require("crypto");
const PlayerRegistry = require("../models/playerRegistry");
const Reporte = require("../models/Reportes");
const Fraccionamiento = require("../models/fraccionamiento");

router.post("/send-notification", async (req, res) => {
  console.log('📲 POST /send-notification - Inicio');
  console.log('   Body:', JSON.stringify(req.body, null, 2));
  try {
    const { title, body, fraccId, residencia, foto } = req.body;
    console.log('   title:', title);
    console.log('   body:', body);
    console.log('   fraccId:', fraccId);
    console.log('   residencia:', residencia);


    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento) {
      return res.status(404).json({ 
        error: "Fraccionamiento no encontrado"
      });
    }

    const casa = fraccionamiento.residencias.find(r => r.numero.toString() === residencia.toString());
    if (!casa) {
      return res.status(404).json({ 
        error: "Casa no encontrada en este fraccionamiento"
      });
    }

    if (!casa.activa) {
      return res.status(403).json({ 
        error: "Casa desactivada, no puede recibir notificaciones"
      });
    }

    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);

    if (residentesActivos.length === 0) {
      return res.status(400).json({
        error: "No hay dispositivos registrados en esta casa"
      });
    }

    const playerIds = [...new Set(residentesActivos
      .map(residente => residente.playerId)
      .filter(id => id && id.trim() !== ''))];


    if (playerIds.length === 0) {
      return res.status(400).json({ 
        error: "No hay Player IDs válidos para esta casa"
      });
    }

    const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000);
    const reportesRecientes = await Reporte.find({
      fraccId: fraccId,
      numeroCasa: residencia.toString(),
      nombre: title,
      tiempo: { $gte: cincoMinutosAtras }
    }).sort({ tiempo: -1 });


    if (reportesRecientes.length >= 3) {
      return res.status(429).json({
        success: false,
        error: `${title} ya tiene ${reportesRecientes.length} solicitudes recientes. Espere antes de enviar otra.`,
        nextAllowedTime: new Date(Date.now() + (5 * 60 * 1000)),
        currentCount: reportesRecientes.length
      });
    }
    const timestamp = Date.now();
    const visitorHash = Buffer.from(title).toString('base64').substring(0, 6);
    const notificationId = `${fraccId}_${residencia}_${visitorHash}_${timestamp}`;

    const notificationSecret = process.env.NOTIFICATION_SECRET || 'default-secret-change-in-production';
    const securityHash = crypto
      .createHmac('sha256', notificationSecret)
      .update(`${fraccId}_${residencia}_${notificationId}`)
      .digest('hex')
      .substring(0, 16);

    const payload = {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      big_picture: foto,
      priority: 10,
      content_available: true,
      ios_sound: "default",
      android_sound: "default",
      collapse_id: notificationId,
      data: {
      notificationId,
      fraccId: fraccId.toString(),
      residencia: residencia.toString(),
      securityHash,
      foto,
      nombre: title,
      motivo: body,
      tipo: 'solicitud_acceso',
      timestamp: Date.now().toString()
    }
    };

    console.log('📤 Enviando notificación a OneSignal...');
    console.log('   Player IDs:', playerIds);
    console.log('   Notification ID:', notificationId);
    console.log('   Security Hash:', securityHash);

    const response = await fetch("https://api.onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    const resultado = await response.json();
    console.log('✅ Respuesta de OneSignal:', JSON.stringify(resultado, null, 2));

    setTimeout(async () => {
      try {
        const reporteExistente = await Reporte.findOne({ notificationId });

        if (!reporteExistente) {
          await Reporte.create({
            notificationId: notificationId,
            nombre: title,
            motivo: body,
            foto: foto || '',
            numeroCasa: residencia.toString(),
            estatus: 'expirado',
            fraccId: fraccId,
            fechaCreacion: new Date(),
            residenteId: null,
            residenteNombre: 'Sistema - Expirada automáticamente',
            autorizadoPor: 'Sistema - Expiración automática',
            tiempo: new Date()
          });

          if (global.io) {
            const room = `casa_${residencia}_${fraccId}`;
            global.io.to(room).emit('notificacionExpirada', {
              notificationId: notificationId,
              action: 'expire_notification',
              mensaje: 'La solicitud de acceso ha expirado por falta de respuesta',
              numeroCasa: residencia.toString(),
              fraccId: fraccId.toString(),
              timestamp: new Date()
            });
          }

        }

      } catch (error) {
        console.error('Error verificando expiración de notificación:', error);
      }
    }, 5 * 60 * 1000);

    res.json({ 
      success: true,
      mensaje: "Notificación enviada", 
      notificationId: notificationId,
      oneSignalId: resultado.id,
      dispositivos: playerIds.length
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: "Error al enviar notificación",
      details: error.message
    });
  }
});

router.get("/pending/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;

    const reportesPendientes = await Reporte.find({
      fraccId: fraccId,
      numeroCasa: residencia.toString(),
      estatus: 'pendiente',
    }).sort({ tiempo: -1 });

    const notificaciones = reportesPendientes.map(reporte => ({
      notificationId: reporte.notificationId,
      titulo: reporte.nombre,
      descripcion: reporte.motivo,
      foto: reporte.foto,
      nombre: reporte.nombre,
      motivo: reporte.motivo,
      fraccId: reporte.fraccId,
      residencia: reporte.numeroCasa,
      tipo: 'solicitud_acceso',
      fecha: reporte.tiempo,
    }));

    res.json({
      success: true,
      notificaciones: notificaciones,
      total: notificaciones.length
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error al obtener notificaciones pendientes",
      details: error.message
    });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { playerId, fraccId, residencia, userId } = req.body;
    
    if (!playerId || playerId.trim() === '') {
      return res.status(400).json({ error: "Player ID es requerido" });
    }
    
    if (!userId) {
      return res.status(400).json({ error: "User ID es requerido para autorización" });
    }
    
    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }
    
    const casa = fraccionamiento.residencias.find(c => c.numero.toString() === residencia.toString());
    if (!casa) {
      return res.status(404).json({ error: "Casa no encontrada" });
    }
    
    const residente = casa.residentes.find(r => r._id.toString() === userId);
    if (!residente) {
      return res.status(403).json({ error: "Usuario no encontrado en esta casa" });
    }
    
    if (!residente.activo) {
      return res.status(403).json({ error: "Usuario inactivo, no puede registrar dispositivo" });
    }
    
    await PlayerRegistry.deleteMany({ 
      userId: userId
    });
    
    await PlayerRegistry.create({
      playerId: playerId,                    
      fraccId: fraccId,
      residencia: residencia.toString(),
      userId: userId,
      createdAt: new Date()
    });
    
    residente.playerId = playerId;
    await fraccionamiento.save();
    
    res.json({ 
      success: true, 
      message: "Dispositivo registrado exitosamente",
      userId: userId,
      casa: residencia
    });
    
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/devices/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    
    const devices = await PlayerRegistry.find({ 
      fraccId, 
      residencia: residencia.toString() 
    });
    
    res.json({
      casa: residencia,
      fraccionamiento: fraccId,
      totalDevices: devices.length,
      devices: devices.map(d => ({
        playerId: d.playerId,
        createdAt: d.createdAt
      }))
    });
    
  } catch (error) {
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

router.get("/audit/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;

    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }

    const casa = fraccionamiento.residencias.find(r => r.numero.toString() === residencia.toString());
    if (!casa) {
      return res.status(404).json({ error: "Casa no encontrada" });
    }

    const playersRegistrados = await PlayerRegistry.find({
      fraccId: fraccId,
      residencia: residencia.toString()
    });

    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
    const playerIdsValidos = residentesActivos.map(r => r.playerId);

    const playersFantasma = playersRegistrados.filter(p =>
      !playerIdsValidos.includes(p.playerId)
    );

    res.json({
      casa: residencia,
      residentesActivos: residentesActivos.length,
      playerIdsRegistrados: playersRegistrados.length,
      playerIdsValidos: playerIdsValidos.length,
      playerIdsFantasma: playersFantasma.length,
      detalles: {
        residentes: residentesActivos.map(r => ({
          nombre: r.nombre,
          playerId: r.playerId
        })),
        playersFantasma: playersFantasma.map(p => ({
          playerId: p.playerId,
          createdAt: p.createdAt,
          userId: p.userId
        }))
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/clean-phantom/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;

    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }

    const casa = fraccionamiento.residencias.find(r => r.numero.toString() === residencia.toString());
    if (!casa) {
      return res.status(404).json({ error: "Casa no encontrada" });
    }

    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
    const playerIdsValidos = residentesActivos.map(r => r.playerId);

    const deleted = await PlayerRegistry.deleteMany({
      fraccId: fraccId,
      residencia: residencia.toString(),
      playerId: { $nin: playerIdsValidos }
    });
    
    res.json({
      mensaje: "Player IDs fantasma eliminados",
      eliminados: deleted.deletedCount,
      playerIdsValidos: playerIdsValidos
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;