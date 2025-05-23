const mongoose = require("mongoose");

const ResidenteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  edad: { type: Number, required: true },
  telefono: { type: String, required: true },
});

const ResidenciaSchema = new mongoose.Schema({
  direccion: { type: String, required: true },
  fraccionamiento: { type: String, required: true },
  residentes: [ResidenteSchema],
  telefono: { type: String, required: true },
  activa: { type: Boolean, default: true },
});

module.exports = mongoose.model("residencias", ResidenciaSchema);