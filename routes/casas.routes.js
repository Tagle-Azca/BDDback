const express = require("express");
const { manejarError, generarQRLinks } = require('../utils/helpers');
const { validarFraccionamiento, validarCasa } = require('../middleware/validators');

const router = express.Router();

// Crear casa
router.post("/:fraccId/casas", validarFraccionamiento, async (req, res) => {
  try {
    const { numero } = req.body;
    const qrLinks = generarQRLinks(req.params.fraccId, numero);

    const nuevaCasa = {
      numero,
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

// Toggle estado de casa
router.put("/:fraccId/casas/:numero/toggle", validarFraccionamiento, validarCasa, async (req, res) => {
  try {
    req.casa.activa = !req.casa.activa;
    await req.fraccionamiento.save();
    res.status(200).json({ mensaje: "Estado de casa actualizado", activa: req.casa.activa });
  } catch (error) {
    manejarError(res, error, "Error al actualizar estado de la casa");
  }
});

module.exports = router;