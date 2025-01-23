require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const residenciasRoutes = require("./routes/residenciasRoutes");
const authRoutes = require("./routes/authRoutes");
const fraccRoutes = require("./routes/fraccRoutes");
const register = require("./routes/authRoutes");

const app = express();
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error(
    "Error: La URI de conexión a MongoDB no está definida en el archivo .env"
  );
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Conectado a MongoDB"))
  .catch((err) => {
    console.error("Error conectando a MongoDB:", err);
    process.exit(1);
  });
app.use("/api/residencias", residenciasRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/fracc", fraccRoutes);
app.use("/api/register", register);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
