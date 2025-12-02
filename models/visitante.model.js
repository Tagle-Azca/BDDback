const mongoose = require('mongoose');

const visitanteSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  nombreNormalizado: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  fraccId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'fraccionamientos',
    required: true,
    index: true
  },
  primeraFoto: {
    type: String
  },
  totalVisitas: {
    type: Number,
    default: 0
  },
  visitasAceptadas: {
    type: Number,
    default: 0
  },
  visitasRechazadas: {
    type: Number,
    default: 0
  },
  casasVisitadas: [{
    type: String
  }],
  ultimaVisita: {
    type: Date
  },
  primeraVisita: {
    type: Date,
    default: Date.now
  },
  motivosFrecuentes: [{
    motivo: String,
    cantidad: Number
  }]
}, {
  timestamps: true
});

visitanteSchema.index({ fraccId: 1, nombreNormalizado: 1 }, { unique: true });

visitanteSchema.methods.incrementarVisita = async function(numeroCasa, motivo) {
  this.totalVisitas += 1;
  this.ultimaVisita = new Date();

  if (!this.casasVisitadas.includes(numeroCasa)) {
    this.casasVisitadas.push(numeroCasa);
  }

  const motivoExistente = this.motivosFrecuentes.find(m => m.motivo === motivo);
  if (motivoExistente) {
    motivoExistente.cantidad += 1;
  } else {
    this.motivosFrecuentes.push({ motivo, cantidad: 1 });
  }

  await this.save();
};

visitanteSchema.methods.registrarRespuesta = async function(aceptado) {
  if (aceptado) {
    this.visitasAceptadas += 1;
  } else {
    this.visitasRechazadas += 1;
  }

  await this.save();
};

visitanteSchema.statics.buscarOCrear = async function(nombre, fraccId, foto) {
  const nombreNormalizado = nombre.toLowerCase().trim();

  let visitante = await this.findOne({
    fraccId,
    nombreNormalizado
  });

  if (!visitante) {
    visitante = await this.create({
      nombre,
      nombreNormalizado,
      fraccId,
      primeraFoto: foto,
      primeraVisita: new Date()
    });
  }

  return visitante;
};

module.exports = mongoose.model('Visitante', visitanteSchema, 'visitantes');
