const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
  usuario: { type: String, required: true },
  correo: { type: String, required: true },
  contrasena: { type: String, required: true },
  telefono: { type: String, required: true },
  estado: { type: String, default: "activo" },
  fechaExpedicion: { type: Date, default: Date.now },
  fechaExpiracion: {
    type: Date,
    default: function () {
      const fecha = new Date();
      fecha.setFullYear(fecha.getFullYear() + 1);
      fecha.setHours(0, 0, 0, 0);
      return fecha;
    },
  },
  casas: { type: Array, default: [] },
  secciones: { type: Array, default: [] },
});

fraccionamientoSchema.pre("save", async function (next) {
  if (!this.isModified("contrasena")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.contrasena = await bcrypt.hash(this.contrasena, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const Fraccionamiento = mongoose.model(
  "Fraccionamiento",
  fraccionamientoSchema
);
module.exports = Fraccionamiento;
