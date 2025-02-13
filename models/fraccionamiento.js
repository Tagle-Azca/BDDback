const mongoose = require("mongoose");

const casaSchema = new mongoose.Schema({
  numero: { type: Number, required: true },
  propietario: { type: String, required: true },
  telefono: { type: String, required: true },
});

const seccionSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
});

const fraccionamientoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  direccion: { type: String, required: true },
  usuario: { type: String },
  correo: { type: String },
  telefono: { type: String },
  estado: { type: String, default: "activo" },
  fechaExpedicion: { type: Date, default: Date.now },
  fechaExpiracion: {
    type: Date,
    default: function () {
      return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    },
  },
  casas: { type: Array, default: [] },
  secciones: { type: Array, default: [] },
});

const Fraccionamiento = mongoose.model(
  "Fraccionamiento",
  fraccionamientoSchema
);
module.exports = Fraccionamiento;
