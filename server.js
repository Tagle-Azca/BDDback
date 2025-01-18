const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/database"); // Asegúrate de que la ruta sea correcta

dotenv.config();
connectDB(); // Llama a la función para conectar a la base de datos

const app = express();
app.use(express.json()); // Middleware para leer JSON

// Rutas
app.use("/api/fracc", require("./routes/fraccRoutes"));

// Puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
