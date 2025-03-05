require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const residenciasRoutes = require("./routes/residenciasRoutes");
const authRoutes = require("./routes/adminAuth");
const fraccRoutes = require("./routes/fraccRoutes");

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://admin-one-livid.vercel.app",
  "https://ingresosbackend.onrender.com",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(express.json());

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error(
    "Error: La URI de conexión a MongoDB no está definida en el archivo .env"
  );
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => {
    console.error("❌ Error conectando a MongoDB:", err);
    process.exit(1);
  });

app.use("/api/auth", authRoutes);
app.use("/api/fracc", fraccRoutes);
app.use("/api/residencias", residenciasRoutes);

const PORT = process.env.PORT || 5002;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`)
);
