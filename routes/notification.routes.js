const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const Notificacion = require("../models/Notification");
const PlayerRegistry = require("../models/playerRegistry");
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

// ✅ NOTIFICACIÓN SIMPLE - SOLO PLAYERREGISTRY
router.post("/send-notification", async (req, res) => {
  try {
    const { title, body, fraccId, residencia, foto } = req.body;
    console.log("🔔 Enviando notificación a casa", residencia);

    // SOLO usar PlayerRegistry
    const playersEnCasa = await PlayerRegistry.find({ 
      fraccId: fraccId, 
      residencia: residencia.toString() 
    });

    if (playersEnCasa.length === 0) {
      return res.status(400).json({ error: "No hay dispositivos registrados en esta casa" });
    }

    // Obtener TODOS los Player IDs originales únicos
    const playerIds = [...new Set(playersEnCasa
      .map(player => player.originalPlayerId || player.playerId)
      .filter(id => id && id.length > 10))];

    console.log(`📱 Enviando a ${playerIds.length} dispositivos únicos en casa ${residencia}`);
    console.log(`📱 Player IDs:`, playerIds);

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
    console.log("📬 Respuesta OneSignal:", resultado);

    await Notificacion.create({ title, body, fraccId, residencia, foto });

    res.json({ 
      mensaje: "Notificación enviada", 
      dispositivos: playerIds.length,
      playerIds: playerIds,
      resultado 
    });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Error al enviar notificación" });
  }
});

// ✅ REGISTRO SIMPLE
router.post("/register", async (req, res) => {
  try {
    const { playerId, fraccId, residencia } = req.body;
    console.log(`📱 Registrando dispositivo: ${playerId} para casa ${residencia}`);
    
    // ID único por dispositivo + casa + timestamp
    const uniqueId = `${playerId}_${residencia}_${Date.now()}`;
    console.log(`🔧 ID único generado: ${uniqueId}`);
    
    // Verificar si ya existe
    const existing = await PlayerRegistry.findOne({ 
      originalPlayerId: playerId,
      fraccId, 
      residencia 
    });
    
    if (!existing) {
      await PlayerRegistry.create({
        playerId: uniqueId,
        originalPlayerId: playerId, 
        fraccId,
        residencia,
        createdAt: new Date()
      });
      console.log(`✅ Dispositivo registrado: ${uniqueId}`);
    } else {
      // Actualizar timestamp del existente
      existing.createdAt = new Date();
      await existing.save();
      console.log(`🔄 Dispositivo actualizado: ${existing.playerId}`);
    }
    
    res.json({ success: true, message: "Dispositivo registrado exitosamente" });
  } catch (error) {
    console.error("❌ Error registrando:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ VER DISPOSITIVOS REGISTRADOS
router.get("/devices/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    console.log(`🔍 Verificando dispositivos para casa ${residencia}`);
    
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
    console.error("❌ Error verificando dispositivos:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ LIMPIAR REGISTROS DE UNA CASA
router.delete("/clear/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    console.log(`🗑️ Limpiando registros de casa ${residencia}`);
    
    const deleted = await PlayerRegistry.deleteMany({ 
      fraccId, 
      residencia: residencia.toString() 
    });
    
    console.log(`🗑️ Eliminados ${deleted.deletedCount} registros`);
    
    res.json({
      mensaje: "Registros eliminados",
      eliminados: deleted.deletedCount
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ ESTADÍSTICAS
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
    console.error("❌ Error obteniendo estadísticas:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas" });
  }
});

// ✅ HISTORIAL DE NOTIFICACIONES
router.get("/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    const notificaciones = await Notificacion.find({ fraccId, residencia }).sort({ fecha: -1 });
    res.status(200).json(notificaciones);
  } catch (error) {
    console.error("❌ Error al obtener historial:", error);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

// ✅ RESPONDER NOTIFICACIÓN
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
    console.error("❌ Error al registrar respuesta:", error);
    res.status(500).json({ error: "Error al registrar respuesta" });
  }
});

// ✅ LIMPIEZA AUTOMÁTICA
setInterval(async () => {
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  try {
    // Limpiar notificaciones antiguas
    const notificacionesActualizadas = await Notificacion.updateMany(
      { resultado: "PENDIENTE", fecha: { $lte: new Date(Date.now() - 10 * 60 * 1000) } },
      { resultado: "IGNORADO" }
    );
    
    if (notificacionesActualizadas.modifiedCount > 0) {
      console.log(`🕒 ${notificacionesActualizadas.modifiedCount} notificaciones marcadas como IGNORADO`);
    }

    // Limpiar registros muy antiguos
    const playersLimpiados = await PlayerRegistry.deleteMany({
      createdAt: { $lte: hace30Dias }
    });
    
    if (playersLimpiados.deletedCount > 0) {
      console.log(`🧹 ${playersLimpiados.deletedCount} registros antiguos eliminados`);
    }
    
  } catch (e) {
    console.error("🧨 Error en limpieza:", e.message);
  }
}, 60 * 1000); 

module.exports = router;