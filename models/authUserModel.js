const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const authUserSchema = new mongoose.Schema({
  correo: {
    type: String,
    required: [true, "El correo es obligatorio"],
    unique: true,
    trim: true,
    lowercase: true,
  },
  contrasena: {
    type: String,
    required: [true, "La contraseña es obligatoria"],
  },
});

authUserSchema.pre("save", async function (next) {
  if (!this.isModified("contrasena")) return next();
  const salt = await bcrypt.genSalt(10);
  this.contrasena = await bcrypt.hash(this.contrasena, salt);
  next();
});

authUserSchema.methods.compararContrasena = async function (inputPassword) {
  return bcrypt.compare(inputPassword, this.contrasena);
};

module.exports = mongoose.model("AuthUser", authUserSchema);
