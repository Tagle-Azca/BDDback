const express = require("express");
const { registerHouse } = require("../controllers/residenciasController");

const router = express.Router();

router.post("/register-house", async (req, res) => {
  const { fraccionamiento, casaDatos } = req.body;

  // Verifica que los datos requeridos estén presentes
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

  // Llama al controlador
  const result = await registerHouse(fraccionamiento, casaDatos);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json(result);
});

module.exports = router;
