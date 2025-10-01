const express = require("express");
const bcrypt = require("bcrypt");
const Fraccionamiento = require("../models/fraccionamiento");
const { validarCampos, manejarError, generarQRLinks } = require('../utils/helpers');
const { validarFraccionamiento } = require('../middleware/validators');

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.contrasena, 10);
    const nuevoFraccionamiento = new Fraccionamiento({
      ...req.body,
      contrasena: hashedPassword,
    });

    await nuevoFraccionamiento.save();

    const qrLinks = generarQRLinks(nuevoFraccionamiento._id);

    nuevoFraccionamiento.qrVisitas = qrLinks.qrAcceso;
    await nuevoFraccionamiento.save();

    res.status(201).json({
      mensaje: "Fraccionamiento creado correctamente",
      data: nuevoFraccionamiento,
      qr: {
        acceso: qrLinks.qrAcceso,
        visitantes: qrLinks.qrVisitantes,
        admin: qrLinks.qrAdmin
      },
    });
  } catch (error) {
    manejarError(res, error, "Error al crear fraccionamiento");
  }
});

router.get("/", async (req, res) => {
  try {
    const fraccionamientos = await Fraccionamiento.find();
    res.status(200).json(fraccionamientos);
  } catch (error) {
    manejarError(res, error, "Error al obtener fraccionamientos");
  }
});

router.get("/:fraccId", validarFraccionamiento, (req, res) => {
  res.status(200).json(req.fraccionamiento);
});

router.put("/:fraccId/toggle", validarFraccionamiento, async (req, res) => {
  try {
    const nuevoEstado = req.fraccionamiento.estado === "activo" ? "inactivo" : "activo";
    req.fraccionamiento.estado = nuevoEstado;
    await req.fraccionamiento.save();

    res.status(200).json({
      mensaje: `Fraccionamiento ${nuevoEstado === "activo" ? "activado" : "desactivado"} exitosamente`,
      estado: nuevoEstado,
      fraccionamiento: {
        _id: req.fraccionamiento._id,
        nombre: req.fraccionamiento.nombre,
        estado: nuevoEstado
      }
    });
  } catch (error) {
    manejarError(res, error, "Error al actualizar estado del fraccionamiento");
  }
});

router.post("/login", async (req, res) => {
  const { usuario, contrasena } = req.body;

  if (!validarCampos({ usuario, contrasena }, res)) return;

  try {
    const user = await Fraccionamiento.findOne({ usuario });
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isMatch = await bcrypt.compare(contrasena, user.contrasena);
    if (!isMatch) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    res.status(200).json({
      mensaje: "Login exitoso",
      token: "token_simulado",
      user,
    });
  } catch (error) {
    manejarError(res, error, "Error del servidor al iniciar sesión");
  }
});

module.exports = router;