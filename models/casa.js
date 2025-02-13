const casaSchema = new mongoose.Schema({
  direccion: { type: String, required: true },
  fraccionamientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fraccionamiento",
    required: true,
  },
  seccionId: { type: mongoose.Schema.Types.ObjectId, ref: "Seccion" },
  residentes: [{ type: persona, ref: "Residente" }],
});

const persona = new mongoose.Schema({
  direccion: { type: String, required: true },
  fraccionamientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fraccionamiento",
    required: true,
  },
  seccionId: { type: mongoose.Schema.Types.ObjectId, ref: "Seccion" },
  residentes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Residente" }],
});
