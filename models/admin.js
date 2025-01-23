const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
});

const Admin = mongoose.model("Admin", AdminSchema);
module.exports = Admin;
