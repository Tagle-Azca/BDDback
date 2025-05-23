const Admin = require("../models/fraccUserModels");
const Residencias = require("../models/Residencias");
const { v4: uuidv4 } = require("uuid");

const registerHouse = async (fraccionamiento, casaDatos) => {
  try {
    const nombreEnMinusculas = fraccionamiento.toLowerCase();

    const fraccionamientoEncontrado = await Admin.findOne({
      fraccionamiento: nombreEnMinusculas,
    });

    if (!fraccionamientoEncontrado) {
      return {
        error: `El fraccionamiento "${fraccionamiento}" no existe en la base de datos.`,
      };
    }

    console.log("Fraccionamiento encontrado:", fraccionamientoEncontrado);

    const nuevosResidentes = casaDatos.residentes.map((residente) => ({
      nombre: residente.nombre,
      edad: residente.edad || null,
      residenteId: uuidv4(),
    }));

    const residenciaActualizada = await Residencias.findOneAndUpdate(
      {
        fraccionamientoId: fraccionamientoEncontrado._id,
        direccion: casaDatos.direccion,
      },
      {
        $set: {
          fraccionamiento: fraccionamientoEncontrado.fraccionamiento,
          activa: casaDatos.activa ?? true
        },
        $addToSet: {
          residentes: { $each: nuevosResidentes },
        },
      },
      { new: true, upsert: true }
    );

    return {
      success: "Residencia actualizada exitosamente",
      residencia: residenciaActualizada,
    };
  } catch (error) {
    console.error("Error registrando la residencia:", error);
    return { error: "Ocurrió un error al registrar la residencia." };
  }
};

module.exports = { registerHouse };
