const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Residencias = require("../models/Residencias");
const PlayerRegistry = require("../models/playerRegistry");
const router = express.Router();
router.post("/register-house", async (req, res) => {
  const { fraccionamiento, casaDatos } = req.body;

  if (
    !fraccionamiento ||
    !casaDatos ||
    !casaDatos.direccion ||
    !casaDatos.residentes
  ) {
    return res.status(400).json({
      error:
        "Faltan datos obligatorios: fraccionamiento, direccion o residentes.",
    });
  }

  casaDatos.activa = true; 

  const result = await registerHouse(fraccionamiento, casaDatos);

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  return res.status(201).json(result);
});

router.get("/get-house", async (req, res) => {
  try {
    const residencias = await Residencias.find();
    res.status(200).json(residencias);
  } catch (error) {
    return res.status(500).json({
      error: "Error al obtener las residencias",
    });
  }
});

router.put("/update-residentes/:id", async (req, res) => {
  const { id } = req.params;
  const { residentes } = req.body;

  if (!residentes || !Array.isArray(residentes)) {
    return res.status(400).json({
      error: "El campo 'residentes' es obligatorio y debe ser un array.",
    });
  }

  try {
    const residencia = await Residencias.findById(id);
    if (!residencia) {
      return res.status(404).json({ error: "Residencia no encontrada." });
    }

    const residentesActualizados = residencia.residentes.map(
      (residenteExistente) => {
        const datosNuevos = residentes.find(
          (r) => r._id === residenteExistente._id.toString()
        );
        if (datosNuevos) {
          return {
            ...residenteExistente.toObject(),
            ...datosNuevos,
          };
        }
        return residenteExistente;
      }
    );

    const nuevosResidentes = residentes
      .filter((r) => !r._id)
      .map((r) => ({
        nombre: r.nombre,
        telefono: r.telefono,
      }));

    residencia.residentes = [...residentesActualizados, ...nuevosResidentes];

    await residencia.save();

    res.status(200).json({
      success: "Residentes actualizados exitosamente",
      data: residencia,
    });
  } catch (error) {
    res.status(500).json({
      error: "Ocurrió un error al actualizar los residentes.",
    });
  }
});

router.delete("/delete-residente/:residenciaId/:residenteId", async (req, res) => {
  const { residenciaId, residenteId } = req.params;

  try {
    const residencia = await Residencias.findById(residenciaId);
    if (!residencia) {
      return res.status(404).json({ error: "Residencia no encontrada." });
    }

    const residenteIndex = residencia.residentes.findIndex(
      (r) => r._id.toString() === residenteId
    );

    if (residenteIndex === -1) {
      return res.status(404).json({ error: "Residente no encontrado." });
    }

    await PlayerRegistry.deleteMany({ 
      userId: residenteId
    });

    residencia.residentes.splice(residenteIndex, 1);
    await residencia.save();

    res.status(200).json({
      success: "Residente eliminado exitosamente",
      data: residencia,
    });
  } catch (error) {
    console.error("Error al eliminar residente:", error);
    res.status(500).json({
      error: "Ocurrió un error al eliminar el residente.",
    });
  }
});

module.exports = router;
