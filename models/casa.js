const mongoose = require("mongoose");
const {v4: uuidv4} = require("uuid");

const persona = new mongoose.Schema({
  direccion: { type: String, required: true },
  fraccionamientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fraccionamiento",
    required: true,
  },
  seccionId: { type: mongoose.Schema.Types.ObjectId, ref: "Seccion" },
  residentes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Residente" }],
  qr: { type: String, default: () => uuidv4() },         
  numero: { type: String, required: true },              
  fraccionamientoId: { type: mongoose.Schema.Types.ObjectId, ref: "Fraccionamiento", required: true }
});
