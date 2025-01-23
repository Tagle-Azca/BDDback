const AuthUser = require("../models/authUserModel");
const bcrypt = require("bcrypt");

const loginUser = async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res
      .status(400)
      .json({ error: "Correo y contraseña son obligatorios" });
  }

  try {
    const usuario = await AuthUser.findOne({ correo });

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const contrasenaValida = await bcrypt.compare(
      contrasena,
      usuario.contrasena
    );

    if (!contrasenaValida) {
      return res.status(401).json({ error: "Contraseña incorrecta" });
    }

    return res.status(200).json({
      message: "Inicio de sesión exitoso",
      user: { correo: usuario.correo },
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return res.status(500).json({
      error: "Ocurrió un error al procesar el inicio de sesión",
    });
  }
};

// Lógica de Registro
const registerUser = async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res
      .status(400)
      .json({ error: "Correo y contraseña son obligatorios" });
  }

  try {
    const nuevoUsuario = new AuthUser({ correo, contrasena });
    await nuevoUsuario.save();

    res.status(201).json({
      success: "Usuario registrado exitosamente",
      usuario: { correo: nuevoUsuario.correo },
    });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    res.status(500).json({
      error: error.message || "Ocurrió un error al registrar el usuario",
    });
  }
};

module.exports = { loginUser, registerUser };
