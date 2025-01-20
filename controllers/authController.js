const Admin = require("../models/fraccUserModels");

exports.registerAdmin = async (req, res) => {
  const { usuario, correo, contrasena, fraccionamiento } = req.body;

  try {
    const adminExists = await Admin.findOne({ correo });
    if (adminExists) {
      return res.status(400).json({ message: "El correo ya está en uso" });
    }

    const newAdmin = new Admin({
      usuario,
      correo,
      contrasena,
      fraccionamiento,
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Administrador registrado con éxito",
      admin: newAdmin,
    });
  } catch (error) {
    console.error("Error al registrar administrador:", error.message);
    res
      .status(500)
      .json({ message: "Error en el servidor", error: error.message });
  }
};
