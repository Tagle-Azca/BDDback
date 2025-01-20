const FraccUser = require("../models/fraccUserModels");

exports.addFraccUser = async (req, res) => {
  const { usuario, contraseña, fraccionamiento } = req.body;

  try {
    const nuevoUsuario = new FraccUser({
      usuario,
      contraseña,
      fraccionamiento,
    });

    await nuevoUsuario.save();
    res
      .status(201)
      .json({ message: "Usuario creado con éxito", data: nuevoUsuario });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al crear usuario", error: error.message });
  }
};

exports.loginFraccUser = async (req, res) => {
  const { usuario, contraseña } = req.body;

  try {
    const user = await FraccUser.findOne({ usuario });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const isMatch = await bcrypt.compare(contraseña, user.contraseña);
    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    res.status(200).json({
      message: "Login exitoso",
      user: {
        id: user._id,
        fraccionamiento: user.fraccionamiento,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Error en el servidor",
      error: error.message,
    });
  }
};
