const AuthUser = require("../models/authUserModel");

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

module.exports = { registerUser };
