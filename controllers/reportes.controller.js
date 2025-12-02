const Reporte = require('../models/reporte.model');
const sendNotification = require('./notifications.controller');
const reporteOrchestrator = require('../services/reporte-orchestrator.service'); 

const crearReporte = async (req, res) => {
  try {
    const { nombre, motivo, numeroCasa, foto, playerId, fraccId, origen } = req.body;

    if (!nombre || !motivo || !numeroCasa || !playerId || !fraccId || !origen) {
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    let nuevoReporte = null;
    if (origen === 'app') {
      nuevoReporte = new Reporte({ nombre, motivo, numeroCasa, foto, fraccId });
      await nuevoReporte.save();
    }

    const notificationData = {
      headings: { en: nombre },
      contents: { en: motivo },
      include_player_ids: [playerId],
      data: {
        id: origen === 'app' && nuevoReporte ? nuevoReporte._id.toString() : '',
        nombre,
        motivo,
        titulo: nombre,
        descripcion: motivo,
        foto: foto || '',
        fraccId,
        numeroCasa,
        tipo: 'solicitud_acceso',
      },
    };

    await sendNotification(notificationData);

    if (origen === 'app' && nuevoReporte) {
      res.status(201).json({ message: 'Reporte creado correctamente', data: nuevoReporte });
    } else {
      res.status(200).json({ message: 'Reporte no guardado (origen no autorizado), pero notificación enviada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar el reporte' });
  }
};

const obtenerReportes = async (req, res) => {
  try {
    const reportes = await Reporte.find().sort({ tiempo: -1 });
    res.status(200).json(reportes);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los reportes' });
  }
};

const obtenerPendientePorCasa = async (req, res) => {
  const { fraccId, numeroCasa } = req.params;

  try {
    const reportePendiente = await Reporte.findOne({
      fraccId,
      numeroCasa,
      estatus: 'pendiente',
    }).sort({ tiempo: -1 });

    if (!reportePendiente) {
      return res.status(404).json({ message: 'No hay reportes pendientes' });
    }

    res.status(200).json(reportePendiente);
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const responderReporte = async (req, res) => {
  const { reporteId } = req.params;
  const { aceptado, autorizadoPor, autorizadoPorId } = req.body;

  try {
    const reporteActualizado = await reporteOrchestrator.responderReporte(
      reporteId,
      aceptado,
      autorizadoPor,
      autorizadoPorId
    );

    res.status(200).json({
      success: true,
      message: aceptado ? 'Visita aceptada' : 'Visita rechazada',
      reporte: reporteActualizado
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al responder reporte',
      error: error.message
    });
  }
};

const obtenerHistorialCasa = async (req, res) => {
  const { fraccId, numeroCasa } = req.params;
  const { days } = req.query;

  try {
    const historial = await reporteOrchestrator.obtenerHistorialCompleto(
      fraccId,
      numeroCasa,
      parseInt(days) || 30
    );

    res.status(200).json({
      success: true,
      total: historial.length,
      historial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial',
      error: error.message
    });
  }
};

const obtenerHistorialCassandra = async (req, res) => {
  const { fraccId } = req.params;
  const { numeroCasa, days, limit } = req.query;

  try {
    const cassandraService = require('../services/cassandra.service');

    if (!cassandraService.isReady()) {
      return res.status(503).json({
        success: false,
        message: 'Cassandra no está disponible. Usando datos de MongoDB.',
        source: 'mongodb_fallback'
      });
    }

    let reportes = [];

    if (numeroCasa) {
      // Obtener reportes por casa específica
      reportes = await cassandraService.obtenerReportesPorCasa(
        fraccId,
        numeroCasa,
        parseInt(days) || 30,
        parseInt(limit) || 100
      );
    } else {
      // Obtener reportes por fraccionamiento con rango de fechas
      const today = new Date();
      const daysAgo = parseInt(days) || 30;
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - daysAgo);

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 1);

      reportes = await cassandraService.obtenerReportesPorFraccionamiento(
        fraccId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        parseInt(limit) || 100
      );
    }

    // Calcular estadísticas
    const estadisticas = {
      total: reportes.length,
      aceptados: reportes.filter(r => r.estatus === 'aceptado').length,
      rechazados: reportes.filter(r => r.estatus === 'rechazado').length,
      expirados: reportes.filter(r => r.estatus === 'expirado').length,
      pendientes: reportes.filter(r => r.estatus === 'pendiente').length
    };

    res.status(200).json({
      success: true,
      source: 'cassandra',
      fraccionamiento: fraccId,
      casa: numeroCasa || 'todas',
      periodo: `${days || 30} días`,
      reportes: reportes,
      estadisticas: estadisticas,
      total: reportes.length
    });
  } catch (error) {
    console.error('Error al obtener historial de Cassandra:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener historial de Cassandra',
      error: error.message
    });
  }
};

module.exports = {
  crearReporte,
  obtenerReportes,
  obtenerPendientePorCasa,
  responderReporte,
  obtenerHistorialCasa,
  obtenerHistorialCassandra
};