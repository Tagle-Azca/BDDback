const express = require("express");
const OneSignal = require("onesignal-node");
const router = express.Router();

// Cliente OneSignal
const client = new OneSignal.Client({
  app: {
    appAuthKey: process.env.ONESIGNAL_API_KEY,
    appId: process.env.ONESIGNAL_APP_ID,
  }
});

const PlayerRegistry = require("../models/playerRegistry");

router.post("/send-notification", async (req, res) => {
  const { title, body, fraccId, residencia } = req.body;

  if (!title || !body || !fraccId || !residencia) {
    return res.status(400).send({ success: false, message: "Faltan datos" });
  }

  try {
    const registros = await PlayerRegistry.find({ fraccId, residencia });
    const playerIds = registros.map(r => r.playerId);

    if (!playerIds.length) {
      return res.status(404).json({ success: false, message: "No hay playerIds registrados para esta casa" });
    }

    const notification = {
      contents: { en: body },
      headings: { en: title },
      include_player_ids: playerIds,
    };

    const response = await client.createNotification(notification);
    console.log("Notificación enviada:", response.body);
    res.status(200).json({ success: true, response: response.body });
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