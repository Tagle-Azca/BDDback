const mongoose = require("mongoose");

const fraccionamientoDB = mongoose.createConnection(
  process.env.MONGO_URI_FRACCIONAMIENTO,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const adminDB = mongoose.createConnection(process.env.MONGO_URI_ADMINESKAYSER, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

module.exports = { fraccionamientoDB, adminDB };
