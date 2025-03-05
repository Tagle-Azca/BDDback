const express = require("express");
const Fraccionamiento = require("../models/fraccionamiento");

const router = express.Router();

router.post("/:fraccId/casas", async (req, res) => {
  const { fraccId } = req.params;
  const { numero, propietario, telefono } = req.body;

  if (!numero || !propietario || !telefono) {
    return res
      .status(400)
      .json({ error: "Todos los campos son obligatorios." });
  }

  try {
    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento)
      return res.status(404).json({ error: "Fraccionamiento no encontrado." });

    const nuevaCasa = { numero, propietario, telefono, residentes: [] };
    fraccionamiento.casas.push(nuevaCasa);
    await fraccionamiento.save();

    res.status(201).json({
      mensaje: "Casa agregada correctamente",
      data: fraccionamiento,
    });
  } catch (error) {
    console.error("Error al agregar casa:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/:fraccId/casas/:casaId/residentes", async (req, res) => {
  const { fraccId, casaId } = req.params;
  const { nombre, edad, relacion } = req.body;

  if (!nombre || !edad || !relacion) {
    return res
      .status(400)
      .json({ error: "Todos los campos son obligatorios." });
  }

  try {
    const fraccionamiento = await Fraccionamiento.findById(fraccId);
    if (!fraccionamiento)
      return res.status(404).json({ error: "Fraccionamiento no encontrado." });

    const casa = fraccionamiento.casas.id(casaId);
    if (!casa) return res.status(404).json({ error: "Casa no encontrada." });

    casa.residentes.push({ nombre, edad, relacion });
    await fraccionamiento.save();

    res.status(201).json({
      mensaje: "Residente agregado correctamente",
      data: fraccionamiento,
    });
  } catch (error) {
    console.error("Error al agregar residente:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
