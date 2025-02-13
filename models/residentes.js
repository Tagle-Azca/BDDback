const residenteSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  edad: { type: Number, required: true },
  telefono: { type: String, required: true },
  casaId: { type: mongoose.Schema.Types.ObjectId, ref: "Casa", required: true },
});
