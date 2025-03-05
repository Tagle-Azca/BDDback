const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");
const FraccAdmin = require("../models/fraccionamientoAdmin");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body;

    let usuario = await Admin.findOne({ correo });

    if (usuario) {
      const isMatch = await bcrypt.compare(contrasena, usuario.contrasena);
      if (!isMatch) {
        return res.status(400).json({ error: "Contraseña incorrecta" });
      }

      const token = jwt.sign(
        { id: usuario._id, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      return res.json({
        message: "Login exitoso",
        token,
        role: "superadmin",
        redirect: "/admin",
      });
    }

    usuario = await FraccAdmin.findOne({ correo });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isMatch = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!isMatch) {
      return res.status(400).json({ error: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      {
        id: usuario._id,
        rol: "admin",
        fraccionamientoId: usuario.fraccionamientoId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login exitoso",
      token,
      role: "admin",
      redirect: `/dashboard/:id${usuario.fraccionamientoId}`,
    });
  } catch (error) {
    console.error("Error en el login:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
