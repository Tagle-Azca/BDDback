const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*", // En producción especifica tu dominio
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`📱 Usuario conectado: ${socket.id}`);

    // Usuario se une a su casa
    socket.on('joinHouse', ({ numeroCasa, fraccId, userId }) => {
      const room = `casa_${numeroCasa}_${fraccId}`;
      socket.join(room);
      console.log(`🏠 Usuario ${userId || socket.id} se unió a ${room}`);
    });

    // Usuario se desconecta
    socket.on('disconnect', () => {
      console.log(`📱 Usuario desconectado: ${socket.id}`);
    });
  });

  return io;
};

// Función para emitir eventos desde otros archivos
const emitToHouse = (numeroCasa, fraccId, event, data) => {
  if (io) {
    const room = `casa_${numeroCasa}_${fraccId}`;
    io.to(room).emit(event, data);
    console.log(`📢 Emitiendo ${event} a ${room}:`, data);
  }
};

module.exports = {
  initSocket,
  emitToHouse
};