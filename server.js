require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");

const residenciasRoutes = require("./routes/residencias.routes");
const authRoutes = require("./routes/adminAuth.routes");
const fraccRoutes = require("./routes/fracc.routes");
const reportesRoutes = require("./routes/reportes.routes");
const playerRoutes = require("./routes/player.routes");
const notificationRoutes = require("./routes/notification.routes");

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
  console.log(`📱 Usuario conectado: ${socket.id}`);

  socket.on('joinHouse', ({ numeroCasa, fraccId, userId }) => {
    const room = `casa_${numeroCasa}_${fraccId}`;
    socket.join(room);
    console.log(`🏠 Usuario ${userId || socket.id} se unió a ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`📱 Usuario desconectado: ${socket.id}`);
  });
});

global.io = io;

global.emitToHouse = (numeroCasa, fraccId, event, data) => {
  if (global.io) {
    const room = `casa_${numeroCasa}_${fraccId}`;
    global.io.to(room).emit(event, data);
    console.log(`📢 Emitiendo ${event} a ${room}:`, data);
  }
};

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
    ⠀⠀⠀⠀
                    .  
                   .'.
                   |o|
                  .'o'.
                  |.-.|
                  '   '
                   ( )
                    )
                   ( )


    Connected to MongoDB successfully!
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
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5002;

// 🚀 Iniciar servidor
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  console.log(`WebSocket habilitado`);
  console.log(`CORS configurado para Flutter y Admin`);
});