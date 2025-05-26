const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const Fraccionamiento = require("../models/fraccionamiento");

const ONE_SIGNAL_APP_ID = process.env.ONE_SIGNAL_APP_ID;
const ONE_SIGNAL_API_KEY = process.env.ONE_SIGNAL_API_KEY;
const Notificacion = require("../models/notificacion");



router.post("/send-notification", async (req, res) => {
  try {
    const { title, body, fraccId, residencia, foto } = req.body;

    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ error: "Fraccionamiento no encontrado" });

    const casa = fracc.residencias.find(c => c.numero.toString() === residencia.toString());
    if (!casa) return res.status(404).json({ error: "Casa no encontrada" });

    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
    if (!residentesActivos.length) {
      return res.status(400).json({ error: "No hay residentes activos con playerId" });
    }

    const playerIds = residentesActivos.map(r => r.playerId);

    const payload = {
      app_id: ONE_SIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: title },
      contents: { en: body },
      data: { fraccId, residencia, foto },
    };

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONE_SIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const resultado = await response.json();
    console.log("✅ Enviado a OneSignal:", resultado);
    await Notificacion.create({
  title,
  body,
  fraccId,
  residencia,
  foto,
});

    res.status(200).json({ mensaje: "Notificación enviada", resultado });
  } catch (error) {
    console.error("❌ Error en notificación:", error.message);
    res.status(500).json({ error: "Error al enviar notificación" });
  }
});
router.get("/:fraccId/:residencia", async (req, res) => {
  try {
    const { fraccId, residencia } = req.params;

    const notificaciones = await Notificacion.find({
      fraccId,
      residencia,
    }).sort({ fecha: -1 }); 

    res.status(200).json(notificaciones);
  } catch (error) {
    console.error("❌ Error al obtener historial:", error);
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

module.exports = router;