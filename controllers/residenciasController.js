const Admin = require("../models/fraccUserModels");
const Residencias = require("../models/Residencias");
const { v4: uuidv4 } = require("uuid");

const registerHouse = async (fraccionamiento, casaDatos) => {
  try {
    const nombreEnMinusculas = fraccionamiento.toLowerCase();
    console.log(
      "Nombre del fraccionamiento convertido a minúsculas:",
      nombreEnMinusculas
    );

    const fraccionamientoEncontrado = await Admin.findOne({
      fraccionamiento: nombreEnMinusculas,
    });

    if (!fraccionamientoEncontrado) {
      return {
        error: `El fraccionamiento "${fraccionamiento}" no existe en la base de datos.`,
      };
    }

    console.log("Fraccionamiento encontrado:", fraccionamientoEncontrado);

    // Agregar IDs únicos a cada residente
    const residentesConId = casaDatos.residentes.map((residente) => ({
      nombre: residente.nombre,
      edad: residente.edad || null,
      residenteId: uuidv4(),
    }));

    // Crear la nueva residencia
    const nuevaResidencia = new Residencias({
      fraccionamientoId: fraccionamientoEncontrado._id,
      fraccionamiento: fraccionamientoEncontrado.fraccionamiento,
      direccion: casaDatos.direccion,
      residentes: residentesConId,
    });

    // Guardar la residencia en la colección residencias
    await nuevaResidencia.save();

    return {
      success: "Residencia registrada exitosamente",
      residencia: nuevaResidencia,
    };
  } catch (error) {
    console.error("Error registrando la residencia:", error);
    return { error: "Ocurrió un error al registrar la residencia." };
  }
};

module.exports = { registerHouse };
