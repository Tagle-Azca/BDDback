const Reporte = require("../models/reporte.model");
const { abrirPuertaTemporalmente } = require('./puerta.service');
const { REPORTE_STATUS } = require('../constants/reporte.constants');
const { enviarNotificacionRetiroBanner } = require('./notification.service');

/**
 * Procesa la creación o actualización de un reporte
 * @param {Object} params - Parámetros del reporte
 * @param {string} params.notificationId - ID de la notificación (opcional)
 * @param {string} params.nombre - Nombre del visitante
 * @param {string} params.motivo - Motivo de la visita
 * @param {string} params.foto - URL de la foto
 * @param {string} params.numeroCasa - Número de casa
 * @param {string} params.estatus - Estatus del reporte
 * @param {string} params.residenteId - ID del residente (opcional)
 * @param {string} params.residenteNombre - Nombre del residente (opcional)
 * @param {string} params.fraccId - ID del fraccionamiento
 * @param {string} params.clientTimestamp - Timestamp del cliente (opcional)
 * @param {Object} params.io - Instancia de Socket.IO (opcional)
 * @returns {Object} - Resultado con reporte y metadata
 */
async function procesarReporte(params) {
  const {
    notificationId,
    nombre,
    motivo,
    foto,
    numeroCasa,
    estatus,
    residenteId,
    residenteNombre,
    fraccId,
    clientTimestamp,
    io
  } = params;

  // Usar timestamp del cliente si está disponible, sino usar hora del servidor
  const tiempoReporte = clientTimestamp ? new Date(clientTimestamp) : new Date();

  let reporteGuardado;
  let fueActualizado = false;
  if (notificationId) {
    const reporteExistente = await Reporte.findOne({ notificationId });

    if (reporteExistente) {
      if (reporteExistente.estatus !== REPORTE_STATUS.PENDIENTE) {
        throw {
          code: 'ALREADY_ANSWERED',
          status: 409,
          data: {
            error: "Esta notificación ya fue contestada por otro residente",
            yaContestada: true,
            reporte: reporteExistente,
            respondidoPor: reporteExistente.autorizadoPor,
            estatus: reporteExistente.estatus.toUpperCase()
          }
        };
      }

      reporteExistente.estatus = estatus.toLowerCase();
      reporteExistente.autorizadoPor = residenteNombre || 'Usuario';
      reporteExistente.autorizadoPorId = residenteId || null;
      reporteExistente.tiempo = tiempoReporte;
      reporteGuardado = await reporteExistente.save();
      fueActualizado = true;
    } else {
      reporteGuardado = await Reporte.create({
        fraccId: fraccId,
        numeroCasa: numeroCasa.toString(),
        nombre: nombre,
        motivo: motivo,
        foto: foto,
        estatus: estatus.toLowerCase(),
        autorizadoPor: residenteNombre || (estatus === REPORTE_STATUS.EXPIRADO ? 'Sistema' : 'Usuario'),
        autorizadoPorId: residenteId || null,
        tiempo: tiempoReporte,
        notificationId: notificationId
      });
    }
  } else {
    const cincuMinutosAtras = new Date(Date.now() - 5 * 60 * 1000);
    const reporteRecienteEnCasa = await Reporte.findOne({
      fraccId: fraccId,
      numeroCasa: numeroCasa.toString(),
      nombre: nombre,
      motivo: motivo,
      tiempo: { $gte: cincuMinutosAtras }
    });

    if (reporteRecienteEnCasa) {
      throw {
        code: 'DUPLICATE_REPORT',
        status: 409,
        data: {
          error: "Ya existe un reporte similar reciente para esta casa",
          reporte: reporteRecienteEnCasa
        }
      };
    }

    reporteGuardado = await Reporte.create({
      fraccId: fraccId,
      numeroCasa: numeroCasa.toString(),
      nombre: nombre,
      motivo: motivo,
      foto: foto,
      estatus: estatus.toLowerCase(),
      autorizadoPor: residenteNombre || (estatus === REPORTE_STATUS.EXPIRADO ? 'Sistema' : 'Usuario'),
      autorizadoPorId: residenteId || null,
      tiempo: tiempoReporte
    });
  }

  if (io) {
    const room = `casa_${numeroCasa}_${fraccId}`;
    io.to(room).emit('notificacionContestada', {
      reporteId: reporteGuardado._id.toString(),
      notificationId: reporteGuardado.notificationId,
      estatus: estatus.toUpperCase(),
      autorizadoPor: reporteGuardado.autorizadoPor,
      autorizadoPorId: residenteId,
      numeroCasa: numeroCasa,
      fraccId: fraccId,
      timestamp: new Date(),
      action: 'notification_answered',
      mensaje: `${residenteNombre || 'Un residente'} ${estatus === REPORTE_STATUS.ACEPTADO ? 'aceptó' : 'rechazó'} la solicitud`,
      visitante: reporteGuardado.nombre,
      motivo: reporteGuardado.motivo
    });
  }

  if (estatus.toLowerCase() === REPORTE_STATUS.ACEPTADO) {
    await abrirPuertaTemporalmente(fraccId);
  }

  if (notificationId && (estatus === REPORTE_STATUS.ACEPTADO || estatus === REPORTE_STATUS.RECHAZADO)) {
    try {
      await enviarNotificacionRetiroBanner(
        fraccId,
        numeroCasa,
        notificationId,
        estatus,
        residenteNombre || 'Usuario'
      );
    } catch (error) {
      console.error(`Error enviando retiro de banner: ${error.message}`);
    }
  }

  return {
    reporte: reporteGuardado,
    fueActualizado,
    puertaAbierta: estatus.toLowerCase() === REPORTE_STATUS.ACEPTADO
  };
}

/**
 * Crea un reporte pendiente para una notificación
 * @param {Object} params - Parámetros del reporte
 * @param {string} params.notificationId - ID de la notificación
 * @param {string} params.nombre - Nombre del visitante
 * @param {string} params.motivo - Motivo de la visita
 * @param {string} params.foto - URL de la foto
 * @param {string} params.numeroCasa - Número de casa
 * @param {string} params.fraccId - ID del fraccionamiento
 */
async function crearReportePendiente({ notificationId, nombre, motivo, foto, numeroCasa, fraccId }) {
  try {
    const nuevoReporte = await Reporte.create({
      notificationId: notificationId,
      nombre: nombre,
      motivo: motivo,
      foto: foto || '',
      numeroCasa: numeroCasa.toString(),
      estatus: REPORTE_STATUS.PENDIENTE,
      fraccId: fraccId,
      fechaCreacion: new Date(),
      autorizadoPor: 'Pendiente',
      autorizadoPorId: null,
      tiempo: new Date()
    });

    return nuevoReporte;
  } catch (error) {
    console.error('Error creando reporte pendiente:', error);
    throw error;
  }
}

/**
 * Busca reportes recientes en una casa
 * @param {string} fraccId - ID del fraccionamiento
 * @param {string} numeroCasa - Número de casa
 * @param {string} nombre - Nombre del visitante
 * @param {number} minutos - Minutos hacia atrás para buscar (default: 5)
 */
async function buscarReportesRecientes(fraccId, numeroCasa, nombre, minutos = 5) {
  try {
    const minutosAtras = new Date(Date.now() - minutos * 60 * 1000);
    const reportes = await Reporte.find({
      fraccId: fraccId,
      numeroCasa: numeroCasa.toString(),
      nombre: nombre,
      tiempo: { $gte: minutosAtras }
    }).sort({ tiempo: -1 });

    return reportes;
  } catch (error) {
    console.error('Error buscando reportes recientes:', error);
    throw error;
  }
}

/**
 * Actualiza un reporte pendiente a un nuevo estatus
 * @param {string} notificationId - ID de la notificación
 * @param {string} estatus - Nuevo estatus
 * @param {string} residenteNombre - Nombre del residente
 * @param {string} residenteId - ID del residente
 */
async function actualizarReportePendiente(notificationId, estatus, residenteNombre, residenteId) {
  try {
    const reporteExistente = await Reporte.findOne({ notificationId });

    if (!reporteExistente) {
      return null;
    }

    if (reporteExistente.estatus !== REPORTE_STATUS.PENDIENTE) {
      return {
        yaContestada: true,
        reporte: reporteExistente
      };
    }

    reporteExistente.estatus = estatus.toLowerCase();
    reporteExistente.autorizadoPor = residenteNombre || 'Usuario';
    reporteExistente.autorizadoPorId = residenteId || null;
    reporteExistente.tiempo = new Date();

    const reporteActualizado = await reporteExistente.save();

    return {
      yaContestada: false,
      reporte: reporteActualizado
    };
  } catch (error) {
    console.error('Error actualizando reporte pendiente:', error);
    throw error;
  }
}

/**
 * Marca un reporte como expirado
 * @param {string} notificationId - ID de la notificación
 */
async function marcarReporteComoExpirado(notificationId) {
  try {
    const reporteExistente = await Reporte.findOne({ notificationId });

    if (reporteExistente && reporteExistente.estatus === REPORTE_STATUS.PENDIENTE) {
      reporteExistente.estatus = REPORTE_STATUS.EXPIRADO;
      reporteExistente.residenteNombre = 'Sistema - Expirada automáticamente';
      reporteExistente.autorizadoPor = 'Sistema - Expiración automática';
      await reporteExistente.save();
      return reporteExistente;
    }

    return null;
  } catch (error) {
    console.error('Error marcando reporte como expirado:', error);
    throw error;
  }
}

module.exports = {
  procesarReporte,
  crearReportePendiente,
  buscarReportesRecientes,
  actualizarReportePendiente,
  marcarReporteComoExpirado
};
