const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const Fraccionamiento = require("../models/fraccionamiento");
const Notificacion = require("../models/Notification");
const PlayerRegistry = require("../models/PlayerRegistry");
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

router.post("/send-notification", async (req, res) => {
  console.log("🔔 Intentando enviar notificación...");

  try {
    const { title, body, fraccId, residencia, foto } = req.body;
    console.log("📝 Datos recibidos:", { title, body, fraccId, residencia, foto });

    const playersEnCasa = await PlayerRegistry.find({ 
      fraccId: fraccId, 
      residencia: residencia.toString() 
    });

    let playerIds = [];

    if (playersEnCasa.length > 0) {
      playerIds = playersEnCasa.map(player => player.playerId);
      console.log(`🎯 [NUEVO] Enviando a ${playerIds.length} dispositivos:`, playerIds);
      console.log(`👥 Usuarios: ${playersEnCasa.map(p => p.userId || 'sin-userId').join(', ')}`);
    } else {
      console.log("🔄 No hay registros en PlayerRegistry, usando método anterior...");
      
      const fracc = await Fraccionamiento.findById(fraccId);
      if (!fracc) {
        return res.status(404).json({ error: "Fraccionamiento no encontrado" });
      }

      const casa = fracc.residencias.find(c => c.numero.toString() === residencia.toString());
      if (!casa) {
        return res.status(404).json({ error: "Casa no encontrada" });
      }

      const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
      if (!residentesActivos.length) {
        return res.status(400).json({ error: "No hay dispositivos registrados" });
      }

      playerIds = residentesActivos.map(r => r.playerId);
      console.log(`🎯 [LEGACY] Enviando a ${playerIds.length} dispositivos:`, playerIds);
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
        tipo: 'solicitud_acceso'
      },
      ios_sound: "default",
      ios_badgeType: "Increase",
      ios_badgeCount: 1
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
    console.log("📬 Respuesta de OneSignal:", resultado);

    await Notificacion.create({ title, body, fraccId, residencia, foto });

    res.status(200).json({ 
      mensaje: "Notificación enviada", 
      resultado,
      devicesNotified: playerIds.length,
      method: playersEnCasa.length > 0 ? 'multi-user' : 'legacy'
    });

  } catch (error) {
    console.error("💥 Error en notificación:", error.message);
    res.status(500).json({ error: "Error al enviar notificación" });
  }
});

async function enviarNotificacion(playerIds, title, body, foto, fraccId, residencia, res) {
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
      tipo: 'solicitud_acceso' 
    },
    ios_sound: "default",
    ios_badgeType: "Increase",
    ios_badgeCount: 1
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
  console.log("📬 Respuesta de OneSignal:", resultado);

  await Notificacion.create({ title, body, fraccId, residencia, foto });

  res.status(200).json({ 
    mensaje: "Notificación enviada", 
    resultado,
    devicesNotified: playerIds.length 
  });
}

router.post("/notify-house/:fraccId/:residencia", async (req, res) => {
  console.log("🏠 Notificando a toda la casa...");
  
  try {
    const { fraccId, residencia } = req.params;
    const { nombre, motivo, foto } = req.body;
    
    const title = `Nueva Visita: ${nombre}`;
    const body = `${nombre} solicita acceso - ${motivo}`;

    const playersEnCasa = await PlayerRegistry.find({ 
      fraccId: fraccId, 
      residencia: residencia 
    });

    if (!playersEnCasa.length) {
      return res.status(404).json({ 
        error: "No hay dispositivos registrados en esta residencia",
        fraccId,
        residencia 
      });
    }

    const playerIds = playersEnCasa.map(player => player.playerId);
    
    console.log(`📱 Enviando a ${playerIds.length} dispositivos en casa ${residencia}`);
    console.log(`👥 Usuarios: ${playersEnCasa.map(p => p.userId || 'sin-userId').join(', ')}`);

    await enviarNotificacion(playerIds, title, body, foto, fraccId, residencia, res);

  } catch (error) {
    console.error("❌ Error notificando a la casa:", error);
    res.status(500).json({ error: "Error al notificar a la casa" });
  }
});

router.get("/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    console.log(`📥 Consultando historial para fraccId: ${fraccId}, residencia: ${residencia}`);

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

router.get("/stats/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;
    
    const playersEnCasa = await PlayerRegistry.find({ fraccId, residencia });
    const playerIds = playersEnCasa.map(p => p.playerId);
    const userIds = playersEnCasa.map(p => p.userId || 'legacy');
    
    res.json({
      totalDevices: playersEnCasa.length,
      playerIds,
      userIds,
      registeredAt: playersEnCasa.map(p => p.createdAt)
    });
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas:", error);
    res.status(500).json({ error: "Error obteniendo estadísticas" });
  }
});
setInterval(async () => {
  const hace10Min = new Date(Date.now() - 10 * 60 * 1000);
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  try {
    const notificacionesActualizadas = await Notificacion.updateMany(
      { resultado: "PENDIENTE", fecha: { $lte: hace10Min } },
      { resultado: "IGNORADO" }
    );
    
    if (notificacionesActualizadas.modifiedCount > 0) {
      console.log(`🕒 ${notificacionesActualizadas.modifiedCount} notificaciones marcadas como IGNORADO`);
    }

    const playersLimpiados = await PlayerRegistry.deleteMany({
      createdAt: { $lte: hace30Dias }
    });
    
    if (playersLimpiados.deletedCount > 0) {
      console.log(`🧹 ${playersLimpiados.deletedCount} registros antiguos de PlayerRegistry eliminados`);
    }
    
  } catch (e) {
    console.error("🧨 Error en cleanup:", e.message);
  }
}, 60 * 1000); 

module.exports = router;