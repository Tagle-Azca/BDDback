const Reporte = require('../models/reportes.models');

const crearReporte = async (req, res) => {
  try {
    const { nombre, motivo } = req.body;

    if (!nombre || !motivo) {
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    const nuevoReporte = new Reporte({ nombre, motivo });
    await nuevoReporte.save();

    res.status(201).json({ message: 'Reporte creado correctamente', data: nuevoReporte });
  } catch (error) {
    console.error('❌ Error al crear reporte:', error);
    res.status(500).json({ message: 'Error al guardar el reporte' });
  }
};

const obtenerReportes = async (req, res) => {
  try {
    const reportes = await Reporte.find().sort({ tiempo: -1 });
    res.status(200).json(reportes);
  } catch (error) {
    console.error('❌ Error al obtener reportes:', error);
    res.status(500).json({ message: 'Error al obtener los reportes' });
  }
};

module.exports = {
  crearReporte,
  obtenerReportes,
};