const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");
const FraccAdmin = require("../models/fraccionamientoAdmin");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    console.log("🔍 Intentando login con usuario:", usuario);

    let user = await Admin.findOne({ usuario });

    if (!utrwoer) {
      user = await FraccAdmin.findOne({ usuario });
    }

    if (!user) {
      console.log("Usuario no encontrado");
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    console.log("Usuario encontrado en:", user.rol);

    console.log("🔐 Contraseña recibida en login:", contrasena);
    console.log("🔐 Hash almacenado en MongoDB:", user.contrasena);

    const isMatch = await bcrypt.compare(contrasena, user.contrasena);
    console.log("✅ Resultado de bcrypt.compare:", isMatch);

    if (!isMatch) {
      console.log("Contraseña incorrecta");
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

    console.log("Login exitoso:", { usuario: user.usuario, rol: user.rol });

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
    console.error("Error en el login:", error);
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

    console.log("🔍 Intentando registrar usuario:", usuario);

    let existingUser =
      (await Admin.findOne({ usuario })) ||
      (await FraccAdmin.findOne({ usuario }));

    if (existingUser) {
      console.log("El usuario ya está registrado");
      return res.status(400).json({ error: "El usuario ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);
    console.log("🔒 Hash generado en registro:", hashedPassword); 

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

    console.log("Usuario registrado con éxito:", usuario);
    res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (error) {
    console.error("Error en el registro:", error);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

module.exports = router;
