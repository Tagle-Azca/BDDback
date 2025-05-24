const mongoose = require("mongoose");

const playerRegistrySchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  fraccId: { type: String, required: true },
  residencia: { type: String, required: true },
});

module.exports = mongoose.model("PlayerRegistry", playerRegistrySchema);