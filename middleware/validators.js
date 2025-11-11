const { buscarFraccionamiento, buscarCasa, manejarError } = require('../utils/helpers');

const validarFraccionamiento = async (req, res, next) => {
  try {
    const fracc = await buscarFraccionamiento(req.params.fraccId);

    if (!fracc) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }

    req.fraccionamiento = fracc;
    next();
  } catch (error) {
    manejarError(res, error);
  }
};

const validarCasa = (req, res, next) => {
  const casa = buscarCasa(req.fraccionamiento, req.params.numero);
  if (!casa) {
    return res.status(404).json({ error: "Casa no encontrada" });
  }
  req.casa = casa;
  next();
};

/**
 * Valida si un residente está activo en un fraccionamiento
 * @param {Object} fraccionamiento - Objeto del fraccionamiento
 * @param {string} residenteId - ID del residente a validar
 * @returns {boolean} - true si el residente está activo en el fraccionamiento
 */
const validarUsuarioEnFraccionamiento = (fraccionamiento, residenteId) => {
  for (const residencia of fraccionamiento.residencias) {
    const residente = residencia.residentes.find(r =>
      r._id.toString() === residenteId && r.activo === true
    );
    if (residente) return true;
  }
  return false;
};

module.exports = {
  validarFraccionamiento,
  validarCasa,
  validarUsuarioEnFraccionamiento
};