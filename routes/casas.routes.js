const express = require("express");
const { manejarError, generarQRLinks } = require('../utils/helpers');
const { validarFraccionamiento, validarCasa } = require('../middleware/validators');

const router = express.Router();

router.post("/:fraccId/casas", validarFraccionamiento, async (req, res) => {
  try {
    const { numero, tipo } = req.body;

    // Validar número
    if (!numero || numero.toString().trim().length === 0) {
      return res.status(400).json({ error: "El número de casa es requerido" });
    }

    // Validar tipo si se proporciona
    if (tipo !== undefined && tipo.trim() !== "") {
      if (tipo.trim().length < 3) {
        return res.status(400).json({ error: "El tipo debe tener al menos 3 caracteres" });
      }
      if (tipo.length > 30) {
        return res.status(400).json({ error: "El tipo no puede exceder 30 caracteres" });
      }
    }

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

    if (tipo.trim().length < 3) {
      return res.status(400).json({ error: "El tipo debe tener al menos 3 caracteres" });
    }

    if (tipo.length > 30) {
      return res.status(400).json({ error: "El tipo no puede exceder 30 caracteres" });
    }

    req.casa.tipo = tipo;
    await req.fraccionamiento.save();
    res.status(200).json({ mensaje: "Tipo de vivienda actualizado", casa: req.casa });
  } catch (error) {
    manejarError(res, error, "Error al actualizar tipo de vivienda");
  }
});

router.put("/:fraccId/casas/:numero", validarFraccionamiento, validarCasa, async (req, res) => {
  try {
    const { nuevoNumero, tipo } = req.body;

    // Validar que se proporcione al menos un campo
    if (!nuevoNumero && !tipo) {
      return res.status(400).json({ error: "Debe proporcionar al menos el número o tipo de casa" });
    }

    // Si se proporciona un nuevo número, verificar que no exista
    if (nuevoNumero && nuevoNumero !== req.casa.numero) {
      const casaExistente = req.fraccionamiento.residencias.find(
        c => c.numero === nuevoNumero
      );
      if (casaExistente) {
        return res.status(400).json({ error: "Ya existe una casa con ese número" });
      }
      req.casa.numero = nuevoNumero;
    }

    // Actualizar el tipo si se proporciona
    if (tipo && tipo.trim() !== "") {
      if (tipo.trim().length < 3) {
        return res.status(400).json({ error: "El tipo debe tener al menos 3 caracteres" });
      }
      if (tipo.length > 30) {
        return res.status(400).json({ error: "El tipo no puede exceder 30 caracteres" });
      }
      req.casa.tipo = tipo;
    }

    await req.fraccionamiento.save();
    res.status(200).json({
      mensaje: "Casa actualizada exitosamente",
      casa: req.casa
    });
  } catch (error) {
    manejarError(res, error, "Error al actualizar la casa");
  }
});

module.exports = router;