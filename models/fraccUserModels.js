const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const fraccUserSchema = new mongoose.Schema({
  usuario: {
    type: String,
    required: true,
    trim: true,
  },
  correo: {
    type: String,
    required: false,
    unique: true,
    lowercase: true,
    trim: true,
  },
  telefono: {
    type: String,
    required: false,
    unique: true,
    trim: true,
  },
  contrasena: {
    type: String,
    required: true,
  },
  fraccionamiento: {
    type: String,
    required: true,
  },
  Estado: {
    type: string,
    default: "activo",
  },
  qr: {
    type: String,
    default: uuidv4,
  },
  fechaGenerada: {
    type: Date,
    default: Date.now,
  },
  fechaExpedicion: {
    type: Date,
    default: function () {
      const fecha = new Date();
      fecha.setFullYear(fecha.getFullYear() + 1);
      return fecha;
    },
  },
});

fraccUserSchema.pre("save", async function (next) {
  if (!this.isModified("contrasena")) return next();
  const salt = await bcrypt.genSalt(10);
  this.contrasena = await bcrypt.hash(this.contrasena, salt);
  next();
});

module.exports = mongoose.model("admin", fraccUserSchema, "admin");
