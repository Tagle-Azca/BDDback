const express = require("express");
const router = express.Router();
const PlayerRegistry = require("../models/playerRegistry");
const Fraccionamiento = require("../models/fraccionamiento");

router.post("/register", async (req, res) => {
  try {
    const { playerId, fraccId, residencia } = req.body;

    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) return res.status(404).json({ error: "Fraccionamiento no encontrado" });

    const casa = fracc.residencias.find(c => c.numero === parseInt(residencia));
    if (!casa) return res.status(404).json({ error: "Casa no encontrada" });

    const residentesActivos = casa.residentes.filter(r => r.activo);
    if (!residentesActivos.length) return res.status(404).json({ error: "No hay residentes activos" });

    residentesActivos.forEach(r => {
      r.playerId = playerId;
    });
    await fracc.save();

    res.status(201).json({ success: true, message: "Player registrado correctamente" });
  } catch (err) {
    console.error("❌ Error registrando playerId:", err.message);
    res.status(500).json({ error: "Error al registrar playerId" });
  }
});

module.exports = router;