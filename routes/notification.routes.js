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
    console.log("🔔 Enviando notificación a casa", residencia);
    console.log("🔍 DATOS RECIBIDOS:");
    console.log("  - fraccId:", fraccId, "(tipo:", typeof fraccId, ")");
    console.log("  - residencia:", residencia, "(tipo:", typeof residencia, ")");

    console.log("🔍 BUSCANDO DISPOSITIVOS CON:");
    console.log("  - fraccId:", fraccId);
    console.log("  - residencia:", residencia.toString());

    const todosLosPlayers = await PlayerRegistry.find({});
    console.log("📊 TODOS LOS PLAYERS EN DB:", todosLosPlayers.length);
    todosLosPlayers.forEach((player, index) => {
      console.log(`  ${index + 1}. fraccId: "${player.fraccId}" | residencia: "${player.residencia}" | playerId: "${player.originalPlayerId || player.playerId}"`);
    });

    const playersPorFracc = await PlayerRegistry.find({ fraccId: fraccId });
    console.log("📱 PLAYERS POR FRACCIONAMIENTO:", playersPorFracc.length);
    
    const playersPorResidencia = await PlayerRegistry.find({ residencia: residencia.toString() });
    console.log("🏠 PLAYERS POR RESIDENCIA:", playersPorResidencia.length);

    const playersEnCasa = await PlayerRegistry.find({ 
      fraccId: fraccId, 
      residencia: residencia.toString() 
    });
    console.log("🎯 PLAYERS ENCONTRADOS CON AMBOS CRITERIOS:", playersEnCasa.length);

    if (playersEnCasa.length === 0) {
      console.log("❌ NO HAY DISPOSITIVOS - Intentando búsquedas alternativas...");
      
      const alt1 = await PlayerRegistry.find({ 
        fraccId: fraccId, 
        residencia: residencia 
      });
      console.log("🔄 ALT1 (sin toString):", alt1.length);
      
      const alt2 = await PlayerRegistry.find({ 
        fraccId: fraccId.toString(), 
        residencia: residencia.toString() 
      });
      console.log("🔄 ALT2 (ambos toString):", alt2.length);
      
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(fraccId)) {
        const alt3 = await PlayerRegistry.find({ 
          fraccId: new mongoose.Types.ObjectId(fraccId), 
          residencia: residencia.toString() 
        });
        console.log("🔄 ALT3 (ObjectId):", alt3.length);
      }
      
      return res.status(400).json({ 
        error: "No hay dispositivos registrados en esta casa",
        debug: {
          fraccId_recibido: fraccId,
          residencia_recibida: residencia,
          total_players_db: todosLosPlayers.length,
          players_por_fracc: playersPorFracc.length,
          players_por_residencia: playersPorResidencia.length
        }
      });
    }

    // ✅ LÓGICA CORREGIDA PARA EXTRAER UUIDs VÁLIDOS
    const playerIds = [...new Set(playersEnCasa
      .map(player => {
        // Si originalPlayerId existe y es válido, úsalo
        if (player.originalPlayerId && player.originalPlayerId.length === 36) {
          console.log(`✅ Usando originalPlayerId: ${player.originalPlayerId}`);
          return player.originalPlayerId;
        }
        
        // Si no, extraer UUID del playerId con timestamp
        if (player.playerId && player.playerId.includes('_')) {
          const uuidPart = player.playerId.split('_')[0];
          // Validar que es un UUID válido (36 caracteres con guiones)
          if (uuidPart.length === 36 && uuidPart.includes('-')) {
            console.log(`🔧 Extrayendo UUID: ${uuidPart} de ${player.playerId}`);
            return uuidPart;
          }
        }
        
        console.log(`⚠️ No se pudo extraer UUID válido de: ${player.playerId}`);
        return null;
      })
      .filter(id => id && id.length === 36))];

    console.log(`📱 Enviando a ${playerIds.length} dispositivos únicos en casa ${residencia}`);
    console.log(`📱 Player IDs (UUIDs limpios):`, playerIds);

    if (playerIds.length === 0) {
      return res.status(400).json({ 
        error: "No hay Player IDs válidos para esta casa",
        debug: {
          playersEncontrados: playersEnCasa.length,
          playersData: playersEnCasa.map(p => ({
            playerId: p.playerId,
            originalPlayerId: p.originalPlayerId
          }))
        }
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

    console.log("📤 PAYLOAD CON UUIDs LIMPIOS:", JSON.stringify(payload, null, 2));

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

router.get("/debug/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    
    console.log("🔍 DEBUG ENDPOINT - Parámetros recibidos:");
    console.log("  - fraccId:", fraccId, "(tipo:", typeof fraccId, ")");
    console.log("  - residencia:", residencia, "(tipo:", typeof residencia, ")");
    
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
    console.log(`📱 REGISTRO - Datos recibidos:`);
    console.log(`  - playerId: ${playerId}`);
    console.log(`  - fraccId: ${fraccId} (tipo: ${typeof fraccId})`);
    console.log(`  - residencia: ${residencia} (tipo: ${typeof residencia})`);
    
    if (!playerId || playerId.trim() === '') {
      console.log("❌ Player ID vacío o inválido");
      return res.status(400).json({ error: "Player ID es requerido" });
    }
    
    const uniqueId = `${playerId}_${residencia}_${Date.now()}`;
    console.log(`🔧 ID único generado: ${uniqueId}`);
    
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
      
      console.log(`✅ Dispositivo registrado:`, {
        playerId: newPlayer.playerId,
        originalPlayerId: newPlayer.originalPlayerId,  
        fraccId: newPlayer.fraccId,
        residencia: newPlayer.residencia
      });
      
      const verificacion = await PlayerRegistry.findById(newPlayer._id);
      console.log(`🔍 VERIFICACIÓN POST-CREACIÓN:`, {
        originalPlayerId: verificacion.originalPlayerId,
        saved: verificacion.originalPlayerId !== undefined
      });
      
    } else {
      existing.playerId = uniqueId;  
      existing.createdAt = new Date();
      await existing.save();
      
      console.log(`🔄 Dispositivo actualizado:`, {
        playerId: existing.playerId,
        originalPlayerId: existing.originalPlayerId,
        fraccId: existing.fraccId,
        residencia: existing.residencia
      });
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
    
    console.log(`📊 RESUMEN CASA ${residencia}:`);
    console.log(`  - Total registros: ${totalEnCasa}`);
    console.log(`  - Con Player ID válido: ${conPlayerIdValido}`);
    
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
    console.error("❌ Error registrando:", error);
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
    
    console.log(`🔍 VERIFICACIÓN CASA ${residencia}:`);
    registros.forEach((reg, index) => {
      console.log(`  ${index + 1}. originalPlayerId: "${reg.originalPlayerId}" | playerId: "${reg.playerId}"`);
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

setInterval(async () => {
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  try {
    const notificacionesActualizadas = await Notificacion.updateMany(
      { resultado: "PENDIENTE", fecha: { $lte: new Date(Date.now() - 10 * 60 * 1000) } },
      { resultado: "IGNORADO" }
    );
    
    if (notificacionesActualizadas.modifiedCount > 0) {
      console.log(`🕒 ${notificacionesActualizadas.modifiedCount} notificaciones marcadas como IGNORADO`);
    }

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