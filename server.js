require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");

const residenciasRoutes = require("./routes/residencias.routes");
const authRoutes = require("./routes/adminAuth.routes");
const userAuthRoutes = require("./routes/auth.routes");
const fraccionamientosRoutes = require("./routes/fraccionamientos.routes");
const casasRoutes = require("./routes/casas.routes");
const residentesRoutes = require("./routes/residentes.routes");
const visitasRoutes = require("./routes/visitas.routes");
const reportesRoutes = require("./routes/reportes.routes");
const notificationRoutes = require("./routes/notification.routes");
const playerRegistryRoutes = require("./routes/player-registry.routes");
const qrPuertaRoutes = require("./routes/qr-puerta.routes");
const analyticsRoutes = require("./routes/analytics.routes");

const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: [
      'http://localhost:3001',
      'https://admin-one-livid.vercel.app',
      '*' 
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`SOCKET: Cliente conectado: ${socket.id}`);

  socket.on('joinHouse', ({ numeroCasa, fraccId, userId }) => {
    const room = `casa_${numeroCasa}_${fraccId}`;
    socket.join(room);
    console.log(`SOCKET: Cliente ${socket.id} se unió al room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`SOCKET: Cliente desconectado: ${socket.id}`);
  });
});

global.io = io;
app.set('io', io);

global.emitToHouse = (numeroCasa, fraccId, event, data) => {
  if (global.io) {
    const room = `casa_${numeroCasa}_${fraccId}`;
    global.io.to(room).emit(event, data);
  }
};

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
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
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {})
  .catch((err) => {
    process.exit(1);
  });

global.latestNotification = null;

app.use("/api/auth", authRoutes);
app.use("/api/user-auth", userAuthRoutes);
app.use("/api/fraccionamientos", fraccionamientosRoutes);
app.use("/api/fraccionamientos", casasRoutes);
app.use("/api/fraccionamientos", residentesRoutes);
app.use("/api/fraccionamientos", visitasRoutes);
app.use("/api/residencias", residenciasRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/devices", playerRegistryRoutes);
app.use("/api/qr-puerta", qrPuertaRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/api/ping", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.1"
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

const keepAliveService = require('./services/keep-alive.service');

const PORT = process.env.PORT || 5002;

server.listen(PORT, "0.0.0.0", () => {
  keepAliveService.start();
});