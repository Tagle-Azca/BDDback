const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();


const PlayerRegistry = require("../models/playerRegistry");

router.post("/send-notification", async (req, res) => {
  const { title, body, fraccId, residencia } = req.body;
      console.log("🔑 App ID:", process.env.ONESIGNAL_APP_ID);
      console.log("🔐 API Key:", process.env.ONESIGNAL_API_KEY);
      console.log("🔐 Authorization Header:", `Bearer ${process.env.ONESIGNAL_API_KEY?.trim()}`);
  if (!title || !body || !fraccId || !residencia) {
    return res.status(400).send({ success: false, message: "Faltan datos" });
  }

  try {
    const registros = await PlayerRegistry.find({ fraccId, residencia });
    const playerIds = registros.map(r => r.playerId);

    console.log("🟢 playerIds encontrados:", playerIds);

    if (!playerIds.length) {
      return res.status(404).json({ success: false, message: "No hay playerIds registrados para esta casa" });
    }

   const notification = {
  contents: { en: body },
  headings: { en: title },
  include_player_ids: playerIds,
};

    const response = await fetch("https://onesignal.com/api/v9/notifications", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.ONESIGNAL_API_KEY}`
  },
  body: JSON.stringify({
    target: {
      include_player_ids: playerIds
    },
    notification: {
      title: { en: title },
      body: { en: body }
    },
    app_id: process.env.ONESIGNAL_APP_ID
  })
});

    const data = await response.json();
    console.log("✅ Respuesta OneSignal:", data);
    res.status(200).json({ success: true, response: data });
  } catch (error) {
    console.error("Error al enviar notificación:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ruta de prueba
router.get("/active", (req, res) => {
  res.status(200).json([
    {
      titulo: "Bienvenido",
      descripcion: "Esta es una notificación activa de prueba.",
      fecha: new Date().toISOString().split("T")[0],
    },
  ]);
});

module.exports = router;