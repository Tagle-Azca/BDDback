const fraccAdminSchema = new mongoose.Schema({
  usuario: { type: String, required: true, trim: true },
  correo: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  contrasena: { type: String, required: true },
  fraccionamientoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fraccionamiento",
    required: true,
  },
  estado: { type: String, default: "activo" },
});
