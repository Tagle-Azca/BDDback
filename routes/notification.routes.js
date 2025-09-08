const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const PlayerRegistry = require("../models/playerRegistry");
const Reporte = require("../models/Reportes");
const Fraccionamiento = require("../models/fraccionamiento");

router.post("/send-notification", async (req, res) => {
  try {
    const { title, body, fraccId, residencia, foto } = req.body;


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

    const notificationId = `${fraccId}_${residencia}_${Date.now()}`;

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
        const reporteActualizado = await Reporte.updateOne(
          { 
            fraccId: fraccId,
            numeroCasa: residencia.toString(),
            notificationId: notificationId,
            estatus: { $nin: ['aceptado', 'rechazado', 'cancelado'] }
          },
          { 
            $set: { 
              estatus: 'expirado', 
              autorizadoPor: 'Sistema',
              fechaAutorizacion: new Date()
            } 
          }
        );
        
        if (reporteActualizado.modifiedCount > 0) {
          if (global.io) {
            const room = `casa_${residencia}_${fraccId}`;
            global.io.to(room).emit('reporteActualizado', {
              notificationId: notificationId,
              estatus: 'EXPIRADO',
              autorizadoPor: 'Sistema',
              numeroCasa: residencia.toString(),
              fraccId: fraccId.toString(),
              timestamp: new Date(),
              action: 'expire_modal'
            });
          }
        }
      } catch (error) {
        console.error('Error expirando notificación:', error);
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
      error: "Error al enviar notificación" 
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
    
    // 1. Validar que el usuario tiene permisos en esta casa
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
    
    // 2. Limpiar SOLO los registros previos de este usuario específico (no afecta otros residentes)
    await PlayerRegistry.deleteMany({ 
      userId: userId
    });
    
    // 3. Crear nuevo registro con userId para trazabilidad
    await PlayerRegistry.create({
      playerId: playerId,                    
      fraccId: fraccId,
      residencia: residencia.toString(),
      userId: userId,
      createdAt: new Date()
    });
    
    // 4. Actualizar el playerId en el modelo del residente para consistencia
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

module.exports = router;