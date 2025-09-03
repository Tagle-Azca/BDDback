const Reporte = require('../models/Reportes');
const sendNotification = require('./notification.contoller'); 

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

module.exports = {
  crearReporte,
  obtenerReportes,
  obtenerPendientePorCasa,
};