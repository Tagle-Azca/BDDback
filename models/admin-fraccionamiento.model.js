const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const fraccionamientoAdminSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true, trim: true },
  correo: { type: String, required: true, unique: true, trim: true },
  contrasena: { type: String, required: true },
  direccion: { type: String, required: true },
  telefono: { type: String, required: true },
  fraccionamientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fraccionamiento",
    required: true,
  },
  rol: { type: String, default: "admin" },
  primerLogin: { type: Boolean, default: true },
});

fraccionamientoAdminSchema.pre("save", async function (next) {
  if (!this.isModified("contrasena")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.contrasena = await bcrypt.hash(this.contrasena, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model(
  "FraccionamientoAdmin",
  fraccionamientoAdminSchema
);
