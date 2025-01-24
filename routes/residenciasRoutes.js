const express = require("express");
const { registerHouse } = require("../controllers/residenciasController");

const router = express.Router();

router.post("/register-house", async (req, res) => {
  const { fraccionamiento, casaDatos } = req.body;

  if (
    !fraccionamiento ||
    !casaDatos ||
    !casaDatos.direccion ||
    !casaDatos.residentes
  ) {
    return res.status(400).json({
      error:
        "Faltan datos obligatorios: fraccionamiento, direccion o residentes.",
    });
  }

  const result = await registerHouse(fraccionamiento, casaDatos);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json(result);
});

router.get("house", async (req, res) => {
  try {
    const residencias = await Residencias.find();
    res.status(200).json(residencias);
  } catch (error) {
    console.error("Error al obtener las residencias:", error);
    return res.status(500).json({
      error: "Error al obtener las residencias",
    });
  }
});

module.exports = router;
