const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const Notificacion = require("../models/Notification");
const PlayerRegistry = require("../models/playerRegistry");
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

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
      data: { fraccId, residencia, foto, nombre: title, motivo: body, tipo: 'solicitud_acceso' }
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
      resultado 
    });

  } catch (error) {
    console.error("Error enviando notificación:", error);
    res.status(500).json({ error: "Error al enviar notificación" });
  }
});

router.get("/debug/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    
    const todos = await PlayerRegistry.find({});
    const porFracc = await PlayerRegistry.find({ fraccId });
    const porRes = await PlayerRegistry.find({ residencia });
    const combinado = await PlayerRegistry.find({ fraccId, residencia });
    
    res.json({
      parametros: { fraccId, residencia },
      conteos: {
        total_registros: todos.length,
        por_fraccionamiento: porFracc.length,
        por_residencia: porRes.length,
        combinado: combinado.length
      },
      todos_los_registros: todos.map(p => ({
        fraccId: p.fraccId,
        residencia: p.residencia,
        playerId: p.playerId,
        originalPlayerId: p.originalPlayerId,
        createdAt: p.createdAt
      })),
      encontrados_combinado: combinado.map(p => ({
        fraccId: p.fraccId,
        residencia: p.residencia,
        playerId: p.playerId,
        originalPlayerId: p.originalPlayerId
      }))
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { playerId, fraccId, residencia } = req.body;
    
    if (!playerId || playerId.trim() === '') {
      return res.status(400).json({ error: "Player ID es requerido" });
    }
    
    const uniqueId = `${playerId}_${residencia}_${Date.now()}`;
    
    const existing = await PlayerRegistry.findOne({ 
      originalPlayerId: playerId, 
      fraccId, 
      residencia 
    });
    
    if (!existing) {
      const newPlayer = await PlayerRegistry.create({
        playerId: uniqueId,                    
        originalPlayerId: playerId,           
        fraccId: fraccId,
        residencia: residencia.toString(),   
        createdAt: new Date()
      });
    } else {
      existing.playerId = uniqueId;  
      existing.createdAt = new Date();
      await existing.save();
    }
    
    const totalEnCasa = await PlayerRegistry.countDocuments({ 
      fraccId, 
      residencia: residencia.toString() 
    });
    
    const conPlayerIdValido = await PlayerRegistry.countDocuments({ 
      fraccId, 
      residencia: residencia.toString(),
      originalPlayerId: { $exists: true, $ne: null, $ne: '' }
    });
    
    res.json({ 
      success: true, 
      message: "Dispositivo registrado exitosamente",
      debug: {
        totalEnCasa,
        conPlayerIdValido,
        playerIdRecibido: playerId
      }
    });
    
  } catch (error) {
    console.error("Error registrando dispositivo:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/verify/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    
    const registros = await PlayerRegistry.find({ 
      fraccId, 
      residencia: residencia.toString() 
    });
    
    const validos = registros.filter(r => r.originalPlayerId && r.originalPlayerId.length > 10);
    
    res.json({
      total: registros.length,
      validos: validos.length,
      registros: registros.map(r => ({
        originalPlayerId: r.originalPlayerId,
        playerId: r.playerId,
        createdAt: r.createdAt,
        valido: r.originalPlayerId && r.originalPlayerId.length > 10
      }))
    });
    
  } catch (error) {
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
      originalPlayerId: p.originalPlayerId,
      createdAt: p.createdAt
    }));
    
    const uniquePlayerIds = [...new Set(playersRegistry.map(p => p.originalPlayerId || p.playerId))];
    
    res.json({
      casa: residencia,
      fraccionamiento: fraccId,
      totalDevices: devices.length,
      uniqueDevices: uniquePlayerIds.length,
      devices: devices,
      uniquePlayerIds: uniquePlayerIds
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

router.get("/stats/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    
    const playersEnCasa = await PlayerRegistry.find({ fraccId, residencia });
    
    res.json({
      totalDevices: playersEnCasa.length,
      uniquePlayerIds: [...new Set(playersEnCasa.map(p => p.originalPlayerId || p.playerId))],
      registeredAt: playersEnCasa.map(p => p.createdAt)
    });
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas" });
  }
});

router.get("/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    const notificaciones = await Notificacion.find({ fraccId, residencia }).sort({ fecha: -1 });
    res.status(200).json(notificaciones);
  } catch (error) {
    console.error("Error al obtener historial:", error);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

router.post("/responder", async (req, res) => {
  const { id, respuesta } = req.body;

  if (!["ACEPTADO", "CANCELADO"].includes(respuesta)) {
    return res.status(400).json({ error: "Respuesta inválida" });
  }

  try {
    const noti = await Notificacion.findById(id);
    if (!noti) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    noti.resultado = respuesta;
    await noti.save();

    res.status(200).json({ mensaje: "Respuesta registrada correctamente" });
  } catch (error) {
    console.error("Error al registrar respuesta:", error);
    res.status(500).json({ error: "Error al registrar respuesta" });
  }
});

router.post('/:fraccId/abrir-puerta', async (req, res) => {
  const { userId, qrCode } = req.body;
  
  try {
    const fraccionamiento = await buscarFraccionamiento(req.params.fraccId);
    if (!fraccionamiento) {
      return res.json({ success: false, errorMessage: "Fraccionamiento no encontrado" });
    }

    if (!qrCode) {
      return res.json({ success: false, errorMessage: "Código QR es requerido" });
    }

    const qrFraccId = extraerFraccIdDelQR(qrCode);
    if (!qrFraccId || qrFraccId !== req.params.fraccId) {
      return res.json({ success: false, errorMessage: "El código QR no corresponde a este fraccionamiento" });
    }

    if (fraccionamiento.fechaExpedicion && new Date() > fraccionamiento.fechaExpedicion) {
      return res.json({ success: false, errorMessage: "El código QR ha expirado" });
    }

    if (userId) {
      const usuarioValido = validarUsuarioEnFraccionamiento(fraccionamiento, userId);
      if (!usuarioValido) {
        return res.json({ success: false, errorMessage: "Usuario no autorizado en este fraccionamiento" });
      }
    }

    await Fraccionamiento.updateOne(
      { _id: req.params.fraccId }, 
      { $set: { puerta: true } }
    );
    
    setTimeout(async () => {
      await Fraccionamiento.updateOne(
        { _id: req.params.fraccId }, 
        { $set: { puerta: false } }
      );
    }, 10000);
    
    res.json({ success: true, message: "Portón abierto correctamente" });

  } catch (error) {
    res.json({ success: false, errorMessage: "Error interno del servidor" });
  }
});

router.post('/:fraccId/rechazar-puerta', async (req, res) => {
  const { userId } = req.body;
  
  try {
    const fraccionamiento = await buscarFraccionamiento(req.params.fraccId);
    if (!fraccionamiento) {
      return res.json({ success: false, errorMessage: "Fraccionamiento no encontrado" });
    }

    res.json({ success: true, message: "Rechazo de apertura registrado correctamente" });
  } catch (error) {
    res.json({ success: false, errorMessage: "Error al rechazar puerta" });
  }
});

module.exports = router;