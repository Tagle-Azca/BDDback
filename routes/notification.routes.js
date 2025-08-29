const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const PlayerRegistry = require("../models/playerRegistry");
const Reporte = require("../models/Reportes");

router.post("/send-notification", async (req, res) => {
  try {
    const { title, body, fraccId, residencia, foto } = req.body;

    console.log("📤 ENVIANDO NOTIFICACIÓN:", { fraccId, residencia, title });

    const playersEnCasa = await PlayerRegistry.find({ 
      fraccId: fraccId, 
      residencia: residencia.toString() 
    });

    console.log("📱 Dispositivos encontrados:", playersEnCasa.length);

    if (playersEnCasa.length === 0) {
      return res.status(400).json({ 
        error: "No hay dispositivos registrados en esta casa"
      });
    }

    const playerIds = [...new Set(playersEnCasa
      .map(player => player.playerId)
      .filter(id => id && id.trim() !== ''))];

    console.log("🎯 Player IDs:", playerIds);

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

    console.log("📤 Enviando a OneSignal...");

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    const resultado = await response.json();
    
    console.log("📥 Respuesta OneSignal:", {
      id: resultado.id,
      recipients: resultado.recipients,
      errors: resultado.errors
    });

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
          console.log(`Notificación ${notificationId} expirada automáticamente`);
        }
      } catch (error) {
        console.error(`Error expirando notificación ${notificationId}:`, error);
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
    console.error("❌ Error enviando notificación:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al enviar notificación" 
    });
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

module.exports = router;