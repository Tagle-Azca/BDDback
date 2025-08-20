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
    enum: ['pendiente', 'aceptado', 'rechazado', 'cancelado', 'expirado'],
    default: 'pendiente'
  },
  autorizadoPor: { type: String, default: null }, 
  fechaAutorizacion: { type: Date, default: null } 
});

module.exports = mongoose.model("Reporte", reportesSchema, "reportes");