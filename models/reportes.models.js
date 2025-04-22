const reportesSchema = new mongoose.Schema({
  nombre: { type: String, required: true }, 
  motivo: { type: String, required: true },
  tiempo: { type: Date, default: Date.now },
  residenciaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "residencias",
    required: true
  },
  estatus: {
    type: String,
    enum: ['pendiente', 'aceptado', 'rechazado'],
    default: 'pendiente'
  },
  autorizadoPor: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "residencias.residentes",
    default: null
  },
  nombreAutorizador: { 
    type: String,
    default: null
  }
});