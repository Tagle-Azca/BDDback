require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const residenciasRoutes = require("./routes/residencias.routes");
const authRoutes = require("./routes/adminAuth.routes");
const fraccRoutes = require("./routes/fracc.routes");
const notificationRoutes = require("./routes/notification.routes");
const reportesRoutes = require("./routes/reportes.routes");


const app = express();

const cors = require("cors");

app.use(cors({
  origin: ["http://localhost:3000", "https://admin-one-livid.vercel.app"],
  credentials: true,
}));

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
app.use("/api/notifications", notificationRoutes);
app.use("/api/reportes", reportesRoutes);


const PORT = process.env.PORT || 5002;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Servidor corriendo`)
);
