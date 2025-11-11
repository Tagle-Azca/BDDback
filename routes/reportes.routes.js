const express = require("express");
const router = express.Router();
const Reporte = require("../models/reporte.model");
const { validarFraccionamiento, validarUsuarioEnFraccionamiento } = require('../middleware/validators');
const { procesarReporte } = require('../services/reporte.service');
const { manejarError, calcularEstadisticasReportes } = require('../utils/helpers');
const { ESTADOS_VALIDOS, esEstatusValido, REPORTE_STATUS } = require('../constants/reporte.constants');

router.post("/:fraccId/crear", validarFraccionamiento, async (req, res) => {
  try {
    const { notificationId, nombre, motivo, foto, numeroCasa, estatus, residenteId, residenteNombre, clientTimestamp } = req.body;

    if (!nombre || !motivo || !numeroCasa || !estatus) {
      return res.status(400).json({
        error: "Datos incompletos: nombre, motivo, numeroCasa y estatus son obligatorios"
      });
    }

    if (!esEstatusValido(estatus)) {
      return res.status(400).json({
        error: `Estatus inválido. Debe ser: ${ESTADOS_VALIDOS.join(', ')}`
      });
    }

    if (estatus !== REPORTE_STATUS.EXPIRADO && residenteId) {
      const usuarioValido = validarUsuarioEnFraccionamiento(req.fraccionamiento, residenteId);
      if (!usuarioValido) {
        return res.status(403).json({
          error: "Residente no autorizado en este fraccionamiento"
        });
      }
    }

    const resultado = await procesarReporte({
      notificationId,
      nombre,
      motivo,
      foto,
      numeroCasa,
      estatus,
      residenteId,
      residenteNombre,
      fraccId: req.params.fraccId,
      clientTimestamp,
      io: req.app.get('io')
    });

    res.status(200).json({
      success: true,
      mensaje: `Notificación procesada como ${estatus.toUpperCase()}`,
      reporte: resultado.reporte,
      puertaAbierta: resultado.puertaAbierta,
      accion: resultado.fueActualizado ? 'actualizado' : 'creado'
    });

  } catch (error) {
    if (error.code === 'ALREADY_ANSWERED' || error.code === 'DUPLICATE_REPORT') {
      return res.status(error.status).json(error.data);
    }

    manejarError(res, error, "Error al crear reporte");
  }
});

router.get("/:fraccId", async (req, res) => {
  try {
    const { fraccId } = req.params;
    const { casa, desde, hasta, limite = 50, incluirExpiradas = 'false' } = req.query;

    const filtro = { fraccId: fraccId };

    if (incluirExpiradas.toLowerCase() === 'false') {
      filtro.estatus = { $nin: [REPORTE_STATUS.EXPIRADO] };
    }

    if (casa) filtro.numeroCasa = casa;
    if (desde) filtro.tiempo = { $gte: new Date(desde) };
    if (hasta) filtro.tiempo = { ...filtro.tiempo, $lte: new Date(hasta) };

    const reportes = await Reporte.find(filtro)
      .sort({ tiempo: -1 })
      .limit(parseInt(limite));

    const estadisticas = calcularEstadisticasReportes(reportes);

    res.json({
      success: true,
      fraccionamiento: fraccId,
      reportes: reportes,
      estadisticas: estadisticas
    });

  } catch (error) {
    manejarError(res, error, "Error al obtener reportes");
  }
});

router.get("/:fraccId/casa/:numeroCasa", async (req, res) => {
  try {
    const { fraccId, numeroCasa } = req.params;
    const { limite = 50, desde, incluirExpiradas = 'false' } = req.query;

    const filtro = {
      fraccId: fraccId,
      numeroCasa: numeroCasa.toString()
    };
    if (incluirExpiradas.toLowerCase() === 'false') {
      filtro.estatus = { $nin: [REPORTE_STATUS.EXPIRADO] };
    }

    if (desde) {
      filtro.tiempo = { $gte: new Date(desde) };
    }

    const reportes = await Reporte.find(filtro)
      .sort({ tiempo: -1 })
      .limit(parseInt(limite));

    const estadisticas = calcularEstadisticasReportes(reportes);

    res.json({
      success: true,
      casa: numeroCasa,
      fraccionamiento: fraccId,
      reportes: reportes,
      estadisticas: estadisticas
    });

  } catch (error) {
    manejarError(res, error, "Error al obtener historial de casa");
  }
});

router.get("/reporte/:reporteId", async (req, res) => {
  try {
    const { reporteId } = req.params;

    const reporte = await Reporte.findById(reporteId);

    if (!reporte) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    res.json({
      success: true,
      reporte: reporte
    });

  } catch (error) {
    manejarError(res, error, "Error al obtener reporte");
  }
});

router.put("/reporte/:reporteId", async (req, res) => {
  try {
    const { reporteId } = req.params;
    const { estatus, residenteNombre } = req.body;

    if (!esEstatusValido(estatus)) {
      return res.status(400).json({
        error: `Estatus inválido. Debe ser: ${ESTADOS_VALIDOS.join(', ')}`
      });
    }

    const reporte = await Reporte.findByIdAndUpdate(
      reporteId,
      {
        estatus: estatus.toLowerCase(),
        autorizadoPor: residenteNombre || 'Sistema',
        tiempo: new Date()
      },
      { new: true }
    );

    if (!reporte) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    res.json({
      success: true,
      mensaje: "Reporte actualizado",
      reporte: reporte
    });

  } catch (error) {
    manejarError(res, error, "Error al actualizar reporte");
  }
});

module.exports = router;
