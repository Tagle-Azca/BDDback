/**
 * Estados válidos para los reportes
 */
const REPORTE_STATUS = {
  ACEPTADO: 'aceptado',
  RECHAZADO: 'rechazado',
  EXPIRADO: 'expirado',
  PENDIENTE: 'pendiente'
};

/**
 * Array de estados válidos para validación
 */
const ESTADOS_VALIDOS = [
  REPORTE_STATUS.ACEPTADO,
  REPORTE_STATUS.RECHAZADO,
  REPORTE_STATUS.EXPIRADO
];

/**
 * Todos los estados incluyendo pendiente
 */
const TODOS_LOS_ESTADOS = [
  REPORTE_STATUS.ACEPTADO,
  REPORTE_STATUS.RECHAZADO,
  REPORTE_STATUS.EXPIRADO,
  REPORTE_STATUS.PENDIENTE
];

/**
 * Valida si un estatus es válido
 * @param {string} estatus - Estatus a validar
 * @returns {boolean}
 */
function esEstatusValido(estatus) {
  return ESTADOS_VALIDOS.includes(estatus?.toLowerCase());
}

module.exports = {
  REPORTE_STATUS,
  ESTADOS_VALIDOS,
  TODOS_LOS_ESTADOS,
  esEstatusValido
};
