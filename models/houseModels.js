const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  idResidente: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Residente",
  },
  nombreResidente: {
    type: String,
    required: true,
  },
  fechaHora: {
    type: Date,
    default: Date.now,
  },
  motivo: {
    type: String,
    required: true,
    trim: true,
  },
});

const residenteSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
});

const residenciaSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true,
  },
  direccion: {
    type: String,
    required: true,
    trim: true,
  },
  residentes: {
    type: [residenteSchema],
    default: [],
  },
});

const userSchema = new mongoose.Schema({
  nombreUsuario: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  contrasena: {
    type: String,
    required: true,
  },
  residencias: {
    type: [residenciaSchema],
    default: [],
  },
  reportes: {
    type: [reportSchema],
    default: [],
  },
});

module.exports = mongoose.model("residencias", userSchema, "residencias");
