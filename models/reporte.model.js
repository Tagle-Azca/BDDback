const mongoose = require('mongoose');

const reportesSchema = new mongoose.Schema({
  fraccId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'fraccionamientos',
    required: true
  },
  numeroCasa: { type: String, required: true },
  nombre: { type: String, required: true },
  motivo: { type: String, required: true },
  foto: { type: String },
  tiempo: { type: Date, default: Date.now }, 
  estatus: {
    type: String,
    enum: ['aceptado', 'rechazado', 'cancelado', 'expirado', 'pendiente'],
    required: true,
    default: 'pendiente'
  },
  autorizadoPor: { type: String, required: true },
  autorizadoPorId: { type: String }, 
  fechaAutorizacion: { type: Date, default: Date.now },
  notificationId: { type: String, unique: true, sparse: true }
});

reportesSchema.index({
  fraccId: 1,
  numeroCasa: 1,
  nombre: 1,
  motivo: 1,
  tiempo: 1
}, {
  unique: true,
  partialFilterExpression: {
    tiempo: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
  }
});

reportesSchema.post('save', async function(doc) {
  try {
    const cassandraService = require('../services/cassandra.service');
    const visitanteSearchService = require('../services/visitante-search.service');

    await cassandraService.guardarReporte(doc);

    if (doc.estatus === 'pendiente') {
      await visitanteSearchService.indexarVisitante(doc);
    }
  } catch (error) {
    console.error('Error en hooks post-save:', error.message);
  }
});

reportesSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    try {
      const cassandraService = require('../services/cassandra.service');
      const visitanteSearchService = require('../services/visitante-search.service');

      await cassandraService.actualizarReporte(doc);

      if (doc.estatus === 'pendiente') {
        await visitanteSearchService.actualizarVisitante(doc);
      } else {
        await visitanteSearchService.eliminarVisitante(doc._id.toString());
      }
    } catch (error) {
      console.error('Error en hooks post-update:', error.message);
    }
  }
});

reportesSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      const visitanteSearchService = require('../services/visitante-search.service');
      await visitanteSearchService.eliminarVisitante(doc._id.toString());
    } catch (error) {
      console.error('Error en hooks post-delete:', error.message);
    }
  }
});

module.exports = mongoose.model("Reporte", reportesSchema, "reportes");
