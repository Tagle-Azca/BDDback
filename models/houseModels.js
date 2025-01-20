const mongoose = require("mongoose");

const houseSchema = new mongoose.Schema({
  fraccionamiento: { type: String, required: true },
  casa: { type: String, required: true },
  residentes: [{ type: String }],
  estado: { type: String, default: "activo" },
});

module.exports = mongoose.model("House", houseSchema);
