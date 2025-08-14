// Archivo: /models/PlayerRegistry.js (asegúrate de que sea con P mayúscula)
const mongoose = require("mongoose");

const playerRegistrySchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  fraccId: { type: String, required: true },
  residencia: { type: String, required: true },
  userId: { type: String }, // Para identificar usuarios únicos
  createdAt: { type: Date, default: Date.now }, // Para cleanup automático
});

module.exports = mongoose.model("PlayerRegistry", playerRegistrySchema);