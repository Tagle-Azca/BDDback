const Reporte = require('../models/reportes.models');
const sendNotification = require('./notification.contoller'); 

const crearReporte = async (req, res) => {
  try {
    const { nombre, motivo, numeroCasa, foto, playerId } = req.body;

    if (!nombre || !motivo || !numeroCasa || !playerId) {
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    const nuevoReporte = new Reporte({ nombre, motivo, numeroCasa, foto });
    await nuevoReporte.save();

    const notificationData = {
      headings: { en: 'Nueva Visita' },
      contents: { en: `Visita registrada para la casa ${numeroCasa}: ${nombre} - ${motivo}` },
      include_player_ids: [playerId],
      data: {
        id: nuevoReporte._id.toString(), 
        nombre,
        motivo,
        foto: foto || '',
      },
    };

    await sendNotification(notificationData);

    res.status(201).json({ message: 'Reporte creado correctamente', data: nuevoReporte });
  } catch (error) {
    console.error('❌ Error al crear reporte:', error);
    res.status(500).json({ message: 'Error al guardar el reporte' });
  }
};
module.exports = {
  crearReporte,
  obtenerReportes,
};