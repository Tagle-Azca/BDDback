const socketIo = require('socket.io');

let io;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*", 
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`Usuario conectado: ${socket.id}`);

    socket.on('joinHouse', ({ numeroCasa, fraccId, userId }) => {
      const room = `casa_${numeroCasa}_${fraccId}`;
      socket.join(room);
      console.log(`Usuario ${userId || socket.id} se unió a ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${socket.id}`);
    });
  });

  return io;
};

const emitToHouse = (numeroCasa, fraccId, event, data) => {
  if (io) {
    const room = `casa_${numeroCasa}_${fraccId}`;
    io.to(room).emit(event, data);
    console.log(`Emitindo ${event} a ${room}:`, data);
  }
};

module.exports = {
  initSocket,
  emitToHouse
};