const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const fraccUserSchema = new mongoose.Schema({
  usuario: { type: String, required: true, trim: true },
  correo: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  contrasena: { type: String, required: true },
  fraccionamiento: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fraccionamiento", // Relacionando con la colección de fraccionamientos
    required: true,
  },
  estado: { type: String, default: "activo" },
  qr: { type: String, default: uuidv4 },
  fechaGenerada: { type: Date, default: Date.now },
  fechaExpedicion: {
    type: Date,
    default: function () {
      const fecha = new Date();
      fecha.setFullYear(fecha.getFullYear() + 1);
      return fecha;
    },
  },
});

// Middleware para encriptar la contraseña antes de guardar
fraccUserSchema.pre("save", async function (next) {
  if (this.isModified("contrasena")) {
    if (!this.contrasena) {
      return next(new Error("La contraseña no puede estar vacía."));
    }
    const salt = await bcrypt.genSalt(10);
    this.contrasena = await bcrypt.hash(this.contrasena, salt);
  }
  next();
});

// Método para comparar contraseñas en login
fraccUserSchema.methods.compararContrasena = async function (inputPassword) {
  return bcrypt.compare(inputPassword, this.contrasena);
};

module.exports = mongoose.model("admin", fraccUserSchema, "admin");
