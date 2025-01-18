const mongoose = require("mongoose");

const fraccionamietoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["empresa", "cliente"], default: "cliente" },
});

module.exports = mongoose.model("Fraccionamiento", fraccionamietoSchema);
