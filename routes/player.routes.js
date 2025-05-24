const express = require("express");
const router = express.Router();
const PlayerRegistry = require("../models/playerRegistry");

router.post("/register", async (req, res) => {
  const { playerId, fraccId, residencia } = req.body;

  if (!playerId || !fraccId || !residencia) {
    return res.status(400).json({ success: false, message: "Faltan datos" });
  }

  try {
    // Evitar duplicados
    const existe = await PlayerRegistry.findOne({ playerId, fraccId, residencia });
    if (existe) {
      return res.status(200).json({ success: true, message: "Ya registrado" });
    }

    const nuevo = new PlayerRegistry({ playerId, fraccId, residencia });
    await nuevo.save();

    res.status(201).json({ success: true, message: "Player registrado correctamente" });
  } catch (error) {
    console.error("Error al registrar playerId:", error);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
});

module.exports = router;