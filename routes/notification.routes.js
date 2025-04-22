const express = require("express");
const router = express.Router();

let lastNotification = null;
let wasConsumed = false;

router.post("/send-notification", (req, res) => {
  const { title, body, dep } = req.body;

  if (title && body) {
    lastNotification = { title, body };
    wasConsumed = false; 
    console.log("✅ Notificación guardada:", lastNotification);
    return res.send({ success: true });
  }

  return res.status(400).send({ success: false, message: "Faltan datos" });
});

router.get("/poll", (req, res) => {
  if (!lastNotification || wasConsumed) {
    return res.send({});
  }

  wasConsumed = true;
  console.log("📤 Notificación enviada:", lastNotification);
  return res.send(lastNotification);
});

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