const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true, trim: true },
  contrasena: { type: String, required: true },
  rol: { type: String, default: "superadmin" },
  primerLogin: { type: Boolean, default: true },
});

module.exports = mongoose.model("Admin", adminSchema);
