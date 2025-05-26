require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const residenciasRoutes = require("./routes/residencias.routes");
const authRoutes = require("./routes/adminAuth.routes");
const fraccRoutes = require("./routes/fracc.routes");
const reportesRoutes = require("./routes/reportes.routes");
const playerRoutes = require("./routes/player.routes");
const notidficationRoutes = require("./routes/notifications.routes");

const app = express();



app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3001',
      'https://admin-one-livid.vercel.app'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

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
  .then(() => console.log(`
    ⠀⠀⠀⠀⠀⠀⢀⢄⡒⠒⡒⠀⢰⠒⣒⢶⠤⡀⠀⠀⠀
    ⠀⠀⠀⠀⠀⡰⡩⠂⠀⠀⠀⠀⠀⠣⡊⠙⣷⢱⠀⠀⠀
    ⠀⠀⠀⠀⣰⡑⣀⣂⡠⢀⠀⠀⠄⡀⡌⡃⡽⢽⡆⠀⠀
    ⠀⠀⠀⠀⠻⣿⣿⣿⣿⣿⣿⣶⣶⣦⡤⢄⣌⣻⣇⠀⠀
    ⠀⠀⠀⠀⠀⣾⣿⠟⠻⣿⡿⠛⠁⠀⢷⡄⣿⢿⢿⠀⠀
    ⠀⠀⠀⠀⡘⡠⢀⣠⢲⠃⢀⠀⠀⢠⠖⠛⠓⢸⣼⡄⠀
    ⠀⠀⠀⢰⢋⡴⢋⡏⡜⠐⠁⠈⠤⠀⠀⠀⠀⢮⣻⣧⠀
    ⠀⣀⠔⠕⠒⠈⠉⠀⠀⠀⠀⠀⠀⠀⠀⡀⠐⢻⡟⢹⡀
    ⠰⣷⣶⣤⣤⣄⣀⣀⣴⣦⡆⠀⠀⠀⡠⡂⠀⠈⢷⡴⡇
    ⠀⠀⣼⣿⣿⣿⣿⣿⡿⠋⠁⠀⠀⢀⠇⣴⣿⣶⣾⣿⣧
    ⠀⢰⣯⣭⣭⣌⣀⣀⠀⠀⠀⠀⠀⠀⠀⠋⢿⣿⣿⣿⣿
    ⠀⠀⣿⣿⣿⣿⣿⣿⣯⡿⠔⠀⠀⠀⠀⠀⠈⣿⣿⣿⣿
    ⠀⠀⢸⣿⣿⣿⡿⠛⠀⠀⠀⠀⠀⡀⠀⠀⢐⣿⣿⣿⡇
    ⠀⠀⠘⣿⣿⣿⣥⣄⣰⣊⣤⣀⣤⣶⣶⣿⣿⣿⣿⣿⠇
    ⠀⠀⠀⠉⠛⠛⠛⠛⠻⠿⠿⠿⠿⠿⠿⠿⠿⠿⠿⠛⠁⠀
    
    conectao
    `))
  
  .catch((err) => {
    console.error("!!!!Error conectando a MongoDB:", err);
    process.exit(1);
  });

global.latestNotification = null;

app.use("/api/auth", authRoutes);
app.use("/api/fracc", fraccRoutes);
app.use("/api/residencias", residenciasRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/player", playerRoutes);
app.use("/api/notifications", require("./routes/notifications.routes"));


const PORT = process.env.PORT || 5002;

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Servidor corriendo`)
);
