const House = require("../models/houseModels");

exports.getHousesByFraccionamiento = async (req, res) => {
  const { fraccionamiento } = req.params;

  try {
    const houses = await House.find({ fraccionamiento });
    if (!houses || houses.length === 0) {
      return res
        .status(404)
        .json({ message: "No hay casas en este fraccionamiento" });
    }

    res.status(200).json(houses);
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener las casas",
      error: error.message,
    });
  }
};
