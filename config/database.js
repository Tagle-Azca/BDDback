const mongoose = require("mongoose");

// Conectar al cluster de fraccionamientos
const fraccionamientoDB = mongoose.createConnection(
  process.env.MONGO_URI_FRACCIONAMIENTO,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Conectar al cluster de administradores
const adminDB = mongoose.createConnection(process.env.MONGO_URI_ADMINESKAYSER, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

module.exports = { fraccionamientoDB, adminDB };
