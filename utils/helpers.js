const Fraccionamiento = require("../models/fraccionamiento.model");

const validarCampos = (campos, res) => {
  for (const [campo, valor] of Object.entries(campos)) {
    if (!valor) {
      res.status(400).json({ error: `El campo '${campo}' es obligatorio.` });
      return false;
    }
  }
  return true;
};

const manejarError = (res, error, mensaje = "Error interno del servidor", status = 500) => {
  res.status(status).json({ error: mensaje });
};

const buscarFraccionamiento = async (fraccId) => {
  try {
    return await Fraccionamiento.findById(fraccId);
  } catch (error) {
    throw error;
  }
};

const buscarCasa = (fraccionamiento, numero) => {
  return fraccionamiento.residencias.find(c => c.numero.toString() === numero.toString());
};

const generarQRLinks = (fraccionamientoId, numeroCasa = null) => {
  const baseUrl = process.env.REACT_APP_FRONTEND_URL || 'https://admin-one-livid.vercel.app';

  return {
    qrAcceso: `${baseUrl}/Visitas?id=${fraccionamientoId}`,
    qrResidente: numeroCasa ? `${baseUrl}/Visitas?id=${fraccionamientoId}&casa=${numeroCasa}` : null,
    qrVisitantes: `${baseUrl}/Visitas?id=${fraccionamientoId}&tipo=visita`,
    qrAdmin: `${baseUrl}/Admin?id=${fraccionamientoId}`
  };
};

/**
 * Calcula estadísticas de una lista de reportes
 * @param {Array} reportes - Array de reportes
 * @returns {Object} - Objeto con estadísticas
 */
const calcularEstadisticasReportes = (reportes) => {
  const { REPORTE_STATUS } = require('../constants/reporte.constants');

  return {
    total: reportes.length,
    aceptados: reportes.filter(r => r.estatus === REPORTE_STATUS.ACEPTADO).length,
    rechazados: reportes.filter(r => r.estatus === REPORTE_STATUS.RECHAZADO).length,
    expirados: reportes.filter(r => r.estatus === REPORTE_STATUS.EXPIRADO).length,
    pendientes: reportes.filter(r => r.estatus === REPORTE_STATUS.PENDIENTE).length
  };
};

module.exports = {
  validarCampos,
  manejarError,
  buscarFraccionamiento,
  buscarCasa,
  generarQRLinks,
  calcularEstadisticasReportes
};