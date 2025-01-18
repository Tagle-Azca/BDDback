const Fraccionamiento = require("../models/fraccModels");

exports.addFraccionamiento = async (req, res) => {
  const { name, admin } = req.body;

  try {
    const nuevoFraccionamiento = await Fraccionamiento.create({
      name,
      admin,
    });

    res.status(201).json({
      message: "Fraccionamiento agregado con éxito",
      fraccionamiento: nuevoFraccionamiento,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al agregar fraccionamiento",
      error: error.message,
    });
  }
};
