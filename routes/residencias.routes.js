const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Residencias = require("../models/residencia.model");
const PlayerRegistry = require("../models/player-registry.model");
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
    res.status(500).json({
      error: "Ocurrió un error al eliminar el residente.",
    });
  }
});

router.get("/validate-user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { fraccId, casa } = req.query;

    if (!fraccId || !casa) {
      return res.status(400).json({
        error: "fraccId y casa son requeridos"
      });
    }

    const Fraccionamiento = require("../models/fraccionamiento.model");
    const fraccionamiento = await Fraccionamiento.findById(fraccId);

    if (!fraccionamiento) {
      return res.status(200).json({
        exists: false,
        active: false,
        reason: "Fraccionamiento no encontrado"
      });
    }

    const residencia = fraccionamiento.residencias.find(r =>
      r.numero.toString() === casa.toString()
    );

    if (!residencia || !residencia.activa) {
      return res.status(200).json({
        exists: false,
        active: false,
        reason: "Casa no encontrada o inactiva"
      });
    }

    const residente = residencia.residentes.find(r =>
      r._id.toString() === userId
    );

    if (!residente) {
      return res.status(200).json({
        exists: false,
        active: false,
        reason: "Residente no encontrado"
      });
    }

    if (!residente.activo) {
      return res.status(200).json({
        exists: true,
        active: false,
        reason: "Residente inactivo"
      });
    }

    return res.status(200).json({
      exists: true,
      active: true,
      userData: {
        nombre: residente.nombre,
        telefono: residente.telefono,
        fraccId: fraccId,
        residencia: casa,
        residenteId: userId
      }
    });

  } catch (error) {
    return res.status(500).json({
      exists: false,
      active: false,
      reason: "Error del servidor"
    });
  }
});

module.exports = router;
