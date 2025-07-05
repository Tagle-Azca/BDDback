const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const Fraccionamiento = require("../models/fraccionamiento");
const Notificacion = require("../models/Notification");

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

router.post("/send-notification", async (req, res) => {
  console.log("🔔 Intentando enviar notificación...");

  try {
    const { title, body, fraccId, residencia, foto } = req.body;
    console.log("📝 Datos recibidos:", { title, body, fraccId, residencia, foto });

    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) {
      console.error("❌ Fraccionamiento no encontrado");
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }

    const casa = fracc.residencias.find(c => c.numero.toString() === residencia.toString());
    if (!casa) {
      console.error("❌ Casa no encontrada");
      return res.status(404).json({ error: "Casa no encontrada" });
    }

    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
    if (!residentesActivos.length) {
      console.warn("⚠️ No hay residentes activos con playerId");
      return res.status(400).json({ error: "No hay residentes activos con playerId" });
    }

    const playerIds = residentesActivos.map(r => r.playerId);
    console.log("🎯 Enviando a playerIds:", playerIds);

   const payload = {
    app_id: process.env.ONESIGNAL_APP_ID,
    include_player_ids: playerIds,
    headings: { en: title },
    contents: { en: body },
    big_picture: foto,
    data: { fraccId, residencia, foto },
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

    res.status(200).json({ mensaje: "Notificación enviada", resultado });
  } catch (error) {
    console.error("💥 Error en notificación:", error.message);
    res.status(500).json({ error: "Error al enviar notificación" });
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

// Tarea de limpieza para marcar como IGNORADO tras 10 minutos
setInterval(async () => {
  const hace10Min = new Date(Date.now() - 10 * 60 * 1000);
  try {
    const actualizadas = await Notificacion.updateMany(
      { resultado: "PENDIENTE", fecha: { $lte: hace10Min } },
      { resultado: "IGNORADO" }
    );
    if (actualizadas.modifiedCount > 0) {
      console.log(`🕒 ${actualizadas.modifiedCount} notificaciones marcadas como IGNORADO`);
    }
  } catch (e) {
    console.error("🧨 Error al marcar notificaciones como ignoradas:", e.message);
  }
}, 60 * 1000); // Corre cada minuto

module.exports = router;