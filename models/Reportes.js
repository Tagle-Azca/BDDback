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

module.exports = mongoose.model("Reporte", reportesSchema, "reportes");
