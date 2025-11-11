const Admin = require("../models/fraccUserModels");
const Residencias = require("../models/residencia.model");
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


    const nuevosResidentes = casaDatos.residentes.map((residente) => ({
      nombre: residente.nombre,
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
    return { error: "Ocurrió un error al registrar la residencia." };
  }
};

module.exports = { registerHouse };
