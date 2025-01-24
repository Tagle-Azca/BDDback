const express = require("express");
const Admin = require("../models/fraccUserModels");
const bcrypt = require("bcrypt");

const router = express.Router();

router.post("/add", async (req, res) => {
  console.log(req.body);
  const { usuario, correo, contrasena, fraccionamiento } = req.body;

  if (!usuario || !correo || !contrasena || !fraccionamiento) {
    return res.status(400).json({
      error:
        "Todos los campos son obligatorios: usuario, correo, contraseña y fraccionamiento.",
    });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);

    const nuevoFracc = new Admin({
      usuario,
      correo,
      contrasena: hashedPassword,
      fraccionamiento,
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

router.get("/fraccionamientos", async (req, res) => {
  try {
    const fraccionamientos = await Admin.find();
    res.status(200).json(fraccionamientos);
  } catch (error) {
    console.error("Error al obtener los fraccionamientos:", error);
    return res.status(500).json({
      error: "Error al obtener los fraccionamientos",
    });
  }
});

router.put("/update/:id", async (req, res) => {
  const { id } = req.params;
  const { usuario, correo, contrasena, fraccionamiento, Estado } = req.body;

  try {
    let updateFields = {
      usuario,
      correo,
      fraccionamiento: fraccionamiento?.toLowerCase(),
      Estado,
    };

    if (contrasena) {
      const salt = await bcrypt.genSalt(10);
      updateFields.contrasena = await bcrypt.hash(contrasena, salt);
    }

    const fraccionamientoActualizado = await Admin.findByIdAndUpdate(
      id,
      updateFields,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!fraccionamientoActualizado) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }

    res.status(200).json({
      success: "Fraccionamiento actualizado exitosamente",
      data: fraccionamientoActualizado,
    });
  } catch (error) {
    console.error("Error al actualizar el fraccionamiento:", error);
    return res
      .status(500)
      .json({ error: "Error interno al actualizar el fraccionamiento" });
  }
});

router.get("/search", async (req, res) => {
  const { usuario, fraccionamiento, Estado } = req.query;

  try {
    const filtros = {};
    if (usuario) filtros.usuario = usuario;
    if (fraccionamiento)
      filtros.fraccionamiento = fraccionamiento.toLowerCase();
    if (Estado) filtros.Estado = Estado;

    const fraccionamientos = await Admin.find(filtros);
    res.status(200).json(fraccionamientos);
  } catch (error) {
    console.error("Error al buscar fraccionamientos:", error);
    return res.status(500).json({
      error: "Error al buscar fraccionamientos",
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await Admin.findByIdAndDelete(id);

    if (!resultado) {
      return res.status(404).json({
        error: "Fraccionamiento no encontrado",
      });
    }

    return res.status(200).json({
      success: "Fraccionamiento eliminado exitosamente",
      data: resultado,
    });
  } catch (error) {
    console.error("Error al eliminar el fraccionamiento:", error);
    return res.status(500).json({
      error: "Error interno al eliminar el fraccionamiento",
    });
  }
});

module.exports = router;
