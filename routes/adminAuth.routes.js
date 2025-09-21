const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");
const FraccAdmin = require("../models/fraccionamientoAdmin");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;


    let user = await Admin.findOne({ usuario });
    if (!user) {
      user = await FraccAdmin.findOne({ usuario });
    }

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const isMatch = await bcrypt.compare(contrasena, user.contrasena);

    if (!isMatch) {
      return res.status(400).json({ error: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        rol: user.rol,
        fraccionamientoId: user.fraccionamientoId || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login exitoso",
      token,
      role: user.rol,
      redirect:
        user.rol === "superadmin"
          ? "/admin"
          : `/dashboard/:id${user.fraccionamientoId}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const {
      usuario,
      correo,
      contrasena,
      direccion,
      telefono,
      rol,
      fraccionamientoId,
    } = req.body;


    let existingUser =
      (await Admin.findOne({ usuario })) ||
      (await FraccAdmin.findOne({ usuario }));

    if (existingUser) {
      return res.status(400).json({ error: "El usuario ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    let newUser;
    if (rol === "superadmin") {
      newUser = new Admin({ usuario, contrasena: hashedPassword, rol });
    } else if (rol === "admin") {
      if (!fraccionamientoId) {
        return res.status(400).json({
          error:
            "fraccionamientoId es requerido para administradores de fraccionamiento",
        });
      }
      newUser = new FraccAdmin({
        usuario,
        correo,
        contrasena: hashedPassword,
        direccion,
        telefono,
        rol,
        fraccionamientoId,
      });
    } else {
      return res.status(400).json({ error: "Rol inválido" });
    }

    await newUser.save();

    res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (error) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;