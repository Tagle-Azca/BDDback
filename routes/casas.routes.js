const express = require("express");
const { manejarError, generarQRLinks } = require('../utils/helpers');
const { validarFraccionamiento, validarCasa } = require('../middleware/validators');

const router = express.Router();

router.post("/:fraccId/casas", validarFraccionamiento, async (req, res) => {
  try {
    const { numero, tipo } = req.body;
    const qrLinks = generarQRLinks(req.params.fraccId, numero);

    const nuevaCasa = {
      numero,
      tipo: tipo || "Casa", 
      residentes: [],
      activa: true,
      qrResidente: qrLinks.qrResidente
    };

    req.fraccionamiento.residencias.push(nuevaCasa);
    await req.fraccionamiento.save();

    res.status(201).json({
      fraccionamiento: req.fraccionamiento,
      qrCasa: qrLinks.qrResidente
    });
  } catch (error) {
    manejarError(res, error);
  }
});

router.put("/:fraccId/casas/:numero/toggle", validarFraccionamiento, validarCasa, async (req, res) => {
  try {
    req.casa.activa = !req.casa.activa;
    await req.fraccionamiento.save();
    res.status(200).json({ mensaje: "Estado de casa actualizado", activa: req.casa.activa });
  } catch (error) {
    manejarError(res, error, "Error al actualizar estado de la casa");
  }
});

router.put("/:fraccId/casas/:numero/tipo", validarFraccionamiento, validarCasa, async (req, res) => {
  try {
    const { tipo } = req.body;
    if (!tipo || tipo.trim() === "") {
      return res.status(400).json({ error: "El tipo es requerido" });
    }
    req.casa.tipo = tipo;
    await req.fraccionamiento.save();
    res.status(200).json({ mensaje: "Tipo de vivienda actualizado", casa: req.casa });
  } catch (error) {
    manejarError(res, error, "Error al actualizar tipo de vivienda");
  }
});

module.exports = router;