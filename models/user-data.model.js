const mongoose = require("mongoose");

const userDataSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "authUserModel",
    required: true,
  },
  fraccionamientos: [
    {
      nombre: { type: String, required: true },
      ingresos: { type: Number, required: true },
    },
  ],
});

module.exports = mongoose.model("UserData", userDataSchema);
