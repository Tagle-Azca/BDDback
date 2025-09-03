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
    socket.on('joinHouse', ({ numeroCasa, fraccId, userId }) => {
      const room = `casa_${numeroCasa}_${fraccId}`;
      socket.join(room);
    });

    socket.on('disconnect', () => {
    });
  });

  return io;
};

const emitToHouse = (numeroCasa, fraccId, event, data) => {
  if (io) {
    const room = `casa_${numeroCasa}_${fraccId}`;
    io.to(room).emit(event, data);
  }
};

module.exports = {
  initSocket,
  emitToHouse
};