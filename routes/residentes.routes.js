const express = require("express");
const PlayerRegistry = require("../models/player-registry.model");
const { manejarError } = require('../utils/helpers');
const { validarFraccionamiento, validarCasa } = require('../middleware/validators');
const { sanitizeName } = require('../utils/stringUtils');
const { enviarNotificacionExpulsion } = require('../services/notification.service');

const router = express.Router();

router.post("/:fraccId/casas/:numero/residentes", validarFraccionamiento, validarCasa, async (req, res) => {
  try {
    const { nombre } = req.body;
    req.casa.residentes.push({ nombre: sanitizeName(nombre) });
    await req.fraccionamiento.save();
    res.status(201).json(req.fraccionamiento);
  } catch (error) {
    manejarError(res, error);
  }
});

router.get("/residencias/:fraccId/:numero", validarFraccionamiento, validarCasa, (req, res) => {
  // Solo mostrar residentes inactivos (que no han hecho login)
  const residentesInactivos = req.casa.residentes.filter(r => !r.activo);
  res.status(200).json({ residentes: residentesInactivos });
});

router.post("/residencias/:fraccId/:numero/login", validarFraccionamiento, validarCasa, async (req, res) => {
  try {
    const { residenteId } = req.body;
    const residente = req.casa.residentes.find(r => r._id.toString() === residenteId);

    if (!residente) {
      return res.status(404).json({ error: "Residente no encontrado" });
    }

    // Auto-activar residente en el primer login
    if (!residente.activo) {
      residente.activo = true;
      await req.fraccionamiento.save();
    }

    res.status(200).json({ message: "Login exitoso", residente });
  } catch (error) {
    manejarError(res, error);
  }
});

router.put("/:fraccId/casas/:numero/residentes/:residenteId/restablecer",
  validarFraccionamiento,
  validarCasa,
  async (req, res) => {
    try {
      const { residenteId } = req.params;

      const residente = req.casa.residentes.find(r => r._id.toString() === residenteId);
      if (!residente) {
        return res.status(404).json({ error: "Residente no encontrado" });
      }

      await PlayerRegistry.deleteMany({
        userId: residenteId
      });

      residente.activo = true;
      residente.playerId = null;

      await req.fraccionamiento.save();

      res.status(200).json({
        message: "Residente restablecido exitosamente",
        residente: {
          _id: residente._id,
          nombre: residente.nombre,
          activo: residente.activo,
          playerId: residente.playerId
        }
      });
    } catch (error) {
      manejarError(res, error, "Error al restablecer residente");
    }
  }
);

router.put("/:fraccId/casas/:numero/residentes/:residenteId",
  validarFraccionamiento,
  validarCasa,
  async (req, res) => {
    try {
      const { residenteId } = req.params;
      const { nombre } = req.body;

      if (!nombre) {
        return res.status(400).json({
          error: "Nombre es campo obligatorio"
        });
      }

      const residente = req.casa.residentes.find(r => r._id.toString() === residenteId);
      if (!residente) {
        return res.status(404).json({ error: "Residente no encontrado" });
      }

      residente.nombre = sanitizeName(nombre);

      await req.fraccionamiento.save();

      res.json({
        success: true,
        message: "Datos del residente actualizados exitosamente",
        residente: {
          _id: residente._id,
          nombre: residente.nombre,
          activo: residente.activo
        }
      });
    } catch (error) {
      manejarError(res, error, "Error al actualizar datos del residente");
    }
  }
);

router.put("/:fraccId/casas/:numero/residentes/:residenteId/toggle",
  validarFraccionamiento,
  validarCasa,
  async (req, res) => {
    try {
      const { residenteId } = req.params;

      const residente = req.casa.residentes.find(r => r._id.toString() === residenteId);
      if (!residente) {
        return res.status(404).json({ error: "Residente no encontrado" });
      }

      if (residente.activo) {
        await PlayerRegistry.deleteMany({
          userId: residenteId
        });
      }

      residente.activo = !residente.activo;

      if (!residente.activo) {
        residente.playerId = null;
      }

      await req.fraccionamiento.save();

      res.status(200).json({
        message: `Residente ${residente.activo ? 'activado' : 'desactivado'} exitosamente`,
        residente: {
          _id: residente._id,
          nombre: residente.nombre,
          activo: residente.activo,
          playerId: residente.playerId
        }
      });
    } catch (error) {
      manejarError(res, error, "Error al cambiar estado del residente");
    }
  }
);

router.get("/:fraccId/residentes/inactivos",
  validarFraccionamiento,
  async (req, res) => {
    try {
      const residentesInactivos = [];

      req.fraccionamiento.residencias.forEach(casa => {
        casa.residentes.forEach(residente => {
          if (!residente.activo) {
            residentesInactivos.push({
              _id: residente._id,
              nombre: residente.nombre,
              activo: residente.activo,
              playerId: residente.playerId,
              casa: casa.numero
            });
          }
        });
      });

      res.status(200).json({
        residentesInactivos,
        total: residentesInactivos.length
      });
    } catch (error) {
      manejarError(res, error, "Error al obtener residentes inactivos");
    }
  }
);

router.delete("/:fraccId/casas/:numero/residentes/:residenteId",
  validarFraccionamiento,
  validarCasa,
  async (req, res) => {
    try {
      const { residenteId } = req.params;

      const residenteIndex = req.casa.residentes.findIndex(r => r._id.toString() === residenteId);
      if (residenteIndex === -1) {
        return res.status(404).json({ error: "Residente no encontrado" });
      }

      const residenteEliminado = req.casa.residentes[residenteIndex];

      await PlayerRegistry.deleteMany({
        userId: residenteId
      });

      const { invalidateUserTokens } = require('../middleware/tokenAuth');
      await invalidateUserTokens(residenteId, req.fraccionamiento._id, req.casa.numero);

      if (residenteEliminado.playerId) {
        await enviarNotificacionExpulsion(residenteEliminado.playerId, residenteEliminado.nombre);
      }

      req.casa.residentes.splice(residenteIndex, 1);
      await req.fraccionamiento.save();

      res.status(200).json({
        message: "Residente eliminado exitosamente",
        fraccionamiento: req.fraccionamiento
      });
    } catch (error) {
      manejarError(res, error, "Error al eliminar residente");
    }
  }
);

module.exports = router;