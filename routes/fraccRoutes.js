const express = require("express");
const Fraccionamiento = require("../models/fraccionamiento");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const fraccionamientos = await Fraccionamiento.find();
    res.status(200).json(fraccionamientos);
  } catch (error) {
    console.error("Error al obtener los fraccionamientos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/add", async (req, res) => {
  const { nombre, direccion } = req.body;

  if (!nombre || !direccion) {
    return res
      .status(400)
      .json({ error: "Nombre y dirección son obligatorios." });
  }

  try {
    const nuevoFracc = new Fraccionamiento({
      nombre,
      direccion,
      casas: [],
      secciones: [],
    });
    await nuevoFracc.save();
    res.status(201).json({
      success: "Fraccionamiento agregado exitosamente",
      data: nuevoFracc,
    });
  } catch (error) {
    console.error("Error al agregar el fraccionamiento:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/:id/casas", async (req, res) => {
  const { id } = req.params;
  const { numero, propietario, telefono } = req.body;

  if (!numero || !propietario || !telefono) {
    return res
      .status(400)
      .json({ error: "Todos los campos son obligatorios." });
  }

  try {
    const fraccionamiento = await Fraccionamiento.findById(id);
    if (!fraccionamiento)
      return res.status(404).json({ error: "Fraccionamiento no encontrado." });

    fraccionamiento.casas.push({ numero, propietario, telefono });
    await fraccionamiento.save();
    res
      .status(201)
      .json({ success: "Casa agregada correctamente", data: fraccionamiento });
  } catch (error) {
    console.error("Error al agregar casa:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/:id/secciones", async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion } = req.body;

  if (!nombre) {
    return res
      .status(400)
      .json({ error: "El nombre de la sección es obligatorio." });
  }

  try {
    const fraccionamiento = await Fraccionamiento.findById(id);
    if (!fraccionamiento)
      return res.status(404).json({ error: "Fraccionamiento no encontrado." });

    fraccionamiento.secciones.push({ nombre, descripcion });
    await fraccionamiento.save();
    res.status(201).json({
      success: "Sección agregada correctamente",
      data: fraccionamiento,
    });
  } catch (error) {
    console.error("Error al agregar sección:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

const mongoose = require("mongoose");

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ mensaje: "ID no válido" });
  }

  console.log("ID recibido:", id);
  console.log("Datos recibidos para actualizar:", updateData);

  try {
    const updatedFraccionamiento = await Fraccionamiento.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedFraccionamiento) {
      return res.status(404).json({ mensaje: "Fraccionamiento no encontrado" });
    }

    console.log(
      "✅ Fraccionamiento actualizado en la base de datos:",
      updatedFraccionamiento
    );
    res.json({
      mensaje: "✅ Fraccionamiento actualizado",
      data: updatedFraccionamiento,
    });
  } catch (error) {
    console.error("Error actualizando fraccionamiento:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

module.exports = router;
