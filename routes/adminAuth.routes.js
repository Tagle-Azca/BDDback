const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const FraccAdmin = require("../models/admin-fraccionamiento.model");

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

    // Verificar si es primer login
    if (user.primerLogin) {
      // Generar token temporal con permisos limitados
      const tempToken = jwt.sign(
        {
          id: user._id,
          rol: user.rol,
          fraccionamientoId: user.fraccionamientoId || null,
          primerLogin: true,
        },
        process.env.JWT_SECRET,
        { expiresIn: "15m" } // Token temporal válido por 15 minutos
      );

      return res.json({
        requiresPasswordChange: true,
        tempToken,
        message: "Debe cambiar su contraseña antes de continuar",
      });
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

router.post("/change-first-password", async (req, res) => {
  try {
    const { tempToken, newPassword } = req.body;

    if (!tempToken || !newPassword) {
      return res.status(400).json({
        error: "Token temporal y nueva contraseña son requeridos",
      });
    }

    // Verificar el token temporal
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        error: "Token temporal inválido o expirado",
      });
    }

    // Validar que el token sea de primer login
    if (!decoded.primerLogin) {
      return res.status(403).json({
        error: "Este token no es válido para cambio de contraseña",
      });
    }

    // Validar que la nueva contraseña sea diferente
    let user = await Admin.findById(decoded.id);
    if (!user) {
      user = await FraccAdmin.findById(decoded.id);
    }

    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    const isSamePassword = await bcrypt.compare(newPassword, user.contrasena);
    if (isSamePassword) {
      return res.status(400).json({
        error: "La nueva contraseña debe ser diferente a la actual",
      });
    }

    // Validar requisitos mínimos de contraseña
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: "La contraseña debe tener al menos 8 caracteres",
      });
    }

    // Actualizar contraseña y marcar que ya no es primer login
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.contrasena = hashedPassword;
    user.primerLogin = false;
    await user.save();

    // Generar token completo
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
      message: "Contraseña cambiada exitosamente",
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