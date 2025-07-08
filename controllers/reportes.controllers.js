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

const actualizarReporte = async (req, res) => {
  const { idReporte, resultado } = req.body;

  try {
    const actualizado = await Reporte.findByIdAndUpdate(idReporte, {
      estatus: resultado,
    });

    if (!actualizado) {
      return res.status(404).json({ message: 'Reporte no encontrado' });
    }

    res.json({ message: 'Reporte actualizado', data: actualizado });
  } catch (error) {
    console.error('❌ Error al actualizar reporte:', error);
    res.status(500).json({ message: 'Error al actualizar reporte' });
  }
};

module.exports = {
  crearReporte,
  obtenerReportes,
  actualizarReporte,
};