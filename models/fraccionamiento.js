const mongoose = require("mongoose");
const {v4: uuidv4} = require("uuid");

const residenteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  relacion: { type: String, required: true },
  qrPersonal: { type: String, default: () => uuidv4() },
  activo: { type: Boolean, default: false },
});

const casaSchema = new mongoose.Schema({
  numero: { type: Number, required: true },
  qrCasa: { type: String, default: () => uuidv4() }, 
  residentes: { type: [residenteSchema], default: [] },
});

const fraccionamientoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  direccion: { type: String, required: true },
  usuario: { type: String, required: true },
  correo: { type: String, required: true },
  contrasena: { type: String, required: true },
  telefono: { type: String, required: true },
  estado: { type: String, default: "activo" },
  puerta: {type: Boolean, default: false},
  fechaExpedicion: { type: Date, default: Date.now },
  qrVisitas: {
    type: String,
    default: function () {
      return `https://admin-one-livid.vercel.app/Visitas?id=${this._id}`;
    },
  },
  fechaGenerada: {
    type: Date,
    default: Date.now
  },
  fechaExpiracion: {
    type: Date,
    default: function () {
      const fecha = new Date();
      fecha.setFullYear(fecha.getFullYear() + 1);
      fecha.setHours(0, 0, 0, 0);
      return fecha;
    },
  },
  residencias: { type: [casaSchema], default: [] },
});

const Fraccionamiento = mongoose.model(
  "Fraccionamiento",
  fraccionamientoSchema
);
module.exports = Fraccionamiento;
