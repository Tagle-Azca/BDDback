const seccionSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  fraccionamientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fraccionamiento",
    required: true,
  },
  casas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Casa" }],
});
