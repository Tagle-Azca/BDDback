const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Admin = require("../models/admin.model");
require("dotenv").config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/ingresos");
    console.log("Conectado a MongoDB");
    const existingAdmin = await Admin.findOne({ usuario: "admin Eskayser" });

    if (existingAdmin) {
      console.log("El super admin ya existe en la base de datos");
      console.log("Usuario:", existingAdmin.usuario);
      console.log("ID:", existingAdmin._id);
      console.log("Primer Login:", existingAdmin.primerLogin);

      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      readline.question("¿Desea resetear la contraseña? (s/n): ", async (answer) => {
        if (answer.toLowerCase() === "s") {
          const defaultPassword = "Eskayser2024";
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);

          existingAdmin.contrasena = hashedPassword;
          existingAdmin.primerLogin = false;
          await existingAdmin.save();

          console.log("Contraseña reseteada exitosamente");
          console.log("Usuario:", existingAdmin.usuario);
          console.log("Contraseña:", defaultPassword);
        }
        readline.close();
        await mongoose.connection.close();
        process.exit(0);
      });

      return;
    }

    const defaultPassword = "Eskayser2024";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const superAdmin = new Admin({
      usuario: "admin Eskayser",
      contrasena: hashedPassword,
      rol: "superadmin",
      primerLogin: false, 
    });

    await superAdmin.save();

    console.log("Super administrador creado exitosamente");
    console.log("═".repeat(50));
    console.log("Usuario:", superAdmin.usuario);
    console.log("Contraseña:", defaultPassword);
    console.log("Rol:", superAdmin.rol);
    console.log("ID:", superAdmin._id);
    console.log("═".repeat(50));
    console.log("El super admin puede cambiar su contraseña desde el panel de administración");
    console.log("═".repeat(50));

    await mongoose.connection.close();
    console.log("Conexión cerrada");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createSuperAdmin();
