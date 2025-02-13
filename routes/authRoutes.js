const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Admin = require("../models/fraccUserModels");
const Fraccionamiento = require("../models/fraccionamiento");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { correo, contrasena } = req.body;

  try {
    const admin = await Admin.findOne({ correo }).populate("fraccionamiento");

    if (!admin) {
      return res.status(400).json({ mensaje: "Usuario no encontrado" });
    }

    const esValido = await admin.compararContrasena(contrasena);
    if (!esValido) {
      return res.status(400).json({ mensaje: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      { id: admin._id, fraccionamiento: admin.fraccionamiento._id },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      usuario: admin.usuario,
      fraccionamiento: {
        _id: admin.fraccionamiento._id,
        nombre: admin.fraccionamiento.nombre,
        direccion: admin.fraccionamiento.direccion,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

router.post("/register", async (req, res) => {
  const { usuario, correo, contrasena, fraccionamientoNombre } = req.body;

  console.log("Datos recibidos en el backend:", {
    usuario,
    correo,
    contrasena,
    fraccionamientoNombre,
  });

  try {
    if (!fraccionamientoNombre) {
      return res
        .status(400)
        .json({ mensaje: "El nombre del fraccionamiento es requerido" });
    }

    let fraccionamiento = await Fraccionamiento.findOne({
      nombre: fraccionamientoNombre,
    });

    if (!fraccionamiento) {
      fraccionamiento = new Fraccionamiento({
        nombre: fraccionamientoNombre,
        direccion: "Dirección por defecto",
      });

      await fraccionamiento.save();
    }

    const nuevoAdmin = new Admin({
      usuario,
      correo,
      contrasena,
      fraccionamiento: fraccionamiento._id,
    });

    await nuevoAdmin.save();

    res.status(201).json({
      mensaje: "Administrador registrado con éxito",
      administrador: nuevoAdmin,
      fraccionamiento: fraccionamiento,
    });
  } catch (error) {
    console.error("Error registrando administrador:", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

module.exports = router;
