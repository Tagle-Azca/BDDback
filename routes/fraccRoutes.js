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
  try {
    const { nombre, usuario, contrasena, direccion, correo, telefono, estado } =
      req.body;

    if (
      !nombre ||
      !usuario ||
      !contrasena ||
      !direccion ||
      !correo ||
      !telefono
    ) {
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios" });
    }

    const nuevoFraccionamiento = new Fraccionamiento({
      nombre,
      usuario,
      contrasena,
      direccion,
      correo,
      telefono,
      estado: estado || "activo",
    });

    await nuevoFraccionamiento.save();
    res.status(201).json({
      mensaje: "Fraccionamiento agregado con éxito",
      data: nuevoFraccionamiento,
    });
  } catch (error) {
    console.error("❌ Error al agregar fraccionamiento:", error);
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
    return res.status(400).json({ mensaje: "❌ ID no válido" });
  }

  console.log("🆔 ID recibido:", id);
  console.log("📥 Datos recibidos para actualizar:", updateData);

  try {
    // 📌 Solo hashear la contraseña si el usuario la modificó
    if (updateData.contrasena && updateData.contrasena.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.contrasena = await bcrypt.hash(updateData.contrasena, salt);
    } else {
      delete updateData.contrasena; // No modificar la contraseña si está vacía
    }

    const updatedFraccionamiento = await Fraccionamiento.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedFraccionamiento) {
      return res
        .status(404)
        .json({ mensaje: "❌ Fraccionamiento no encontrado" });
    }

    console.log("✅ Fraccionamiento actualizado:", updatedFraccionamiento);
    res.json({
      mensaje: "✅ Fraccionamiento actualizado correctamente",
      data: updatedFraccionamiento,
    });
  } catch (error) {
    console.error("❌ Error actualizando fraccionamiento:", error);
    res.status(500).json({ mensaje: "❌ Error interno del servidor" });
  }
});

module.exports = router;
