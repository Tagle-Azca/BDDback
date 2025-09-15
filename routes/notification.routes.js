const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const PlayerRegistry = require("../models/playerRegistry");
const Reporte = require("../models/Reportes");
const Fraccionamiento = require("../models/fraccionamiento");

router.post("/send-notification", async (req, res) => {
  try {
    const { title, body, fraccId, residencia, foto } = req.body;


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

    // Verificar límite de frecuencia por visitante específico (solo pendientes)
    const cincoMinutosAtras = new Date(Date.now() - 5 * 60 * 1000);
    const solicitudesPendientes = await Reporte.find({
      fraccId: fraccId,
      numeroCasa: residencia.toString(),
      nombre: title, // Mismo visitante
      estatus: 'pendiente', // Solo contar las pendientes
      fechaCreacion: { $gte: cincoMinutosAtras }
    }).sort({ fechaCreacion: -1 });

    console.log(`🔍 ${title} tiene ${solicitudesPendientes.length} solicitudes PENDIENTES en los últimos 5 minutos`);

    // Límite: máximo 3 visitas PENDIENTES del MISMO visitante en 5 minutos
    if (solicitudesPendientes.length >= 3) {
      return res.status(429).json({
        success: false,
        error: `${title} ya tiene ${solicitudesPendientes.length} solicitudes pendientes. Espere a que sean procesadas.`,
        nextAllowedTime: new Date(Date.now() + (5 * 60 * 1000)),
        currentCount: solicitudesPendientes.length
      });
    }

    // Generar ID único por casa, visitante y timestamp
    const timestamp = Date.now();
    const visitorHash = Buffer.from(title).toString('base64').substring(0, 6);
    const notificationId = `${fraccId}_${residencia}_${visitorHash}_${timestamp}`;

    // Crear reporte pendiente para esta visita específica
    try {
      await Reporte.create({
        notificationId: notificationId,
        nombre: title,
        motivo: body,
        foto: foto || '',
        numeroCasa: residencia.toString(),
        estatus: 'pendiente',
        fraccId: fraccId,
        fechaCreacion: new Date(),
        residenteId: null,
        residenteNombre: 'Pendiente de respuesta',
        autorizadoPor: 'Sistema - Notificación enviada',
        tiempo: new Date()
      });
    } catch (error) {
      // Si hay error de clave duplicada (muy improbable con timestamp)
      if (error.code === 11000) {
        return res.status(409).json({ 
          success: false,
          error: "Error al procesar la solicitud, intente nuevamente",
          notificationId: notificationId
        });
      }
      throw error;
    }

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
      data: { 
      notificationId,
      fraccId: fraccId.toString(),      
      residencia: residencia.toString(), 
      foto, 
      nombre: title, 
      motivo: body, 
      tipo: 'solicitud_acceso',
      timestamp: Date.now().toString()
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

    setTimeout(async () => {
      try {
        console.log(`Verificando si notificación ${notificationId} necesita expirar después de 5 minutos`);
        
        const reporteExistente = await Reporte.findOne({ notificationId });
        
        if (!reporteExistente) {
          console.log(`Notificación ${notificationId} expiró sin respuesta - creando reporte expirado`);
          
          // Crear reporte expirado para mantener registro completo
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
        } else if (reporteExistente.estatus === 'pendiente') {
          console.log(`Notificación ${notificationId} tiene reporte pendiente - limpiando`);
          await Reporte.deleteOne({ _id: reporteExistente._id });
        } else {
          console.log(`Notificación ${notificationId} ya fue procesada como: ${reporteExistente.estatus}`);
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
    console.error('Error en ruta send-notification:', error);
    res.status(500).json({ 
      success: false,
      error: "Error al enviar notificación",
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
    console.error('Error en registro de dispositivo:', error);
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

// Nuevo endpoint para verificar y limpiar Player IDs fantasma
router.get("/audit/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    
    // Obtener fraccionamiento y casa
    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }

    const casa = fraccionamiento.residencias.find(r => r.numero.toString() === residencia.toString());
    if (!casa) {
      return res.status(404).json({ error: "Casa no encontrada" });
    }

    // Obtener Player IDs registrados
    const playersRegistrados = await PlayerRegistry.find({ 
      fraccId: fraccId, 
      residencia: residencia.toString() 
    });

    // Obtener residentes activos con Player ID
    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
    const playerIdsValidos = residentesActivos.map(r => r.playerId);

    // Identificar Player IDs fantasma
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

// Endpoint para limpiar Player IDs fantasma
router.delete("/clean-phantom/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    
    // Obtener fraccionamiento y casa
    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }

    const casa = fraccionamiento.residencias.find(r => r.numero.toString() === residencia.toString());
    if (!casa) {
      return res.status(404).json({ error: "Casa no encontrada" });
    }

    // Obtener Player IDs válidos
    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
    const playerIdsValidos = residentesActivos.map(r => r.playerId);

    // Eliminar Player IDs fantasma
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