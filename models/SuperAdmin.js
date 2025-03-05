const mongoose = require("mongoose");

const superAdminSchema = new mongoose.Schema({
  usuario: { type: String, required: true, unique: true, trim: true },
  correo: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  contrasena: { type: String, required: true },
  rol: { type: String, default: "superadmin" },
});

module.exports = mongoose.model("superAdmin", superAdminSchema, "admins");
