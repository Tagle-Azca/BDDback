const express = require("express");
const Admin = require("../models/fraccUserModels");

const router = express.Router();

router.post("/add", async (req, res) => {
  const { usuario, correo, contrasena, fraccionamiento } = req.body;

  if (!usuario || !correo || !contrasena || !fraccionamiento) {
    return res.status(400).json({
      error:
        "Faltan datos obligatorios: usuario, correo, contrasena, fraccionamiento",
    });
  }

  try {
    const nuevoFraccionamiento = new Admin({
      usuario,
      correo,
      contrasena,
      fraccionamiento: fraccionamiento.toLowerCase(),
    });

    await nuevoFraccionamiento.save();
    return res
      .status(201)
      .json({
        success: "Fraccionamiento agregado exitosamente",
        data: nuevoFraccionamiento,
      });
  } catch (error) {
    console.error("Error agregando el fraccionamiento:", error);
    return res
      .status(500)
      .json({ error: "Error al agregar el fraccionamiento" });
  }
});

router.get("/", async (req, res) => {
  try {
    const fraccionamientos = await Admin.find();
    return res.status(200).json(fraccionamientos);
  } catch (error) {
    console.error("Error obteniendo los fraccionamientos:", error);
    return res
      .status(500)
      .json({ error: "Error al obtener los fraccionamientos" });
  }
});

module.exports = router;
