const mongoose = require("mongoose");

const notificacionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  fraccId: { type: mongoose.Schema.Types.ObjectId, ref: "Fraccionamiento", required: true },
  residencia: { type: String, required: true },
  foto: { type: String },
  fecha: { type: Date, default: Date.now },
  resultado: { type: String, default: "PENDIENTE", enum: ["PENDIENTE", "ACEPTADO", "CANCELADO", "IGNORADO"] },
});

module.exports = mongoose.model("Notificacion", notificacionSchema);