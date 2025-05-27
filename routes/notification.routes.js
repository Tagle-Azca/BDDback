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
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      big_picture: foto,
      data: { fraccId, residencia, foto },
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ONESIGNAL_API_KEY}`
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

module.exports = router;