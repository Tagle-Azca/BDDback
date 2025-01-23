const mongoose = require("mongoose");

const ResidenciasSchema = new mongoose.Schema({
  direccion: { type: String, required: true },
  fraccionamientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "admin",
    required: true,
  },
  fraccionamiento: { type: String, required: true },
  residentes: [
    {
      nombre: { type: String, required: true },
      edad: { type: Number },
      residenteId: { type: String, unique: true, required: true },
    },
  ],
});

module.exports = mongoose.model("Residencias", ResidenciasSchema);
