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
    enum: ['aceptado', 'rechazado', 'cancelado', 'expirado'],
    required: true
  },
  autorizadoPor: { type: String, required: true }, 
  fechaAutorizacion: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Reporte", reportesSchema, "reportes");
