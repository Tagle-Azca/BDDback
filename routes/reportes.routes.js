const express = require('express');
const mongoose = require("mongoose");
const Fraccionamiento = require('../models/fraccionamiento');
const router = express.Router();    
const Reporte = require('../models/Reportes');
const { emitToHouse } = require('../socket/socketHandler'); 
const {
  crearReporte,
  obtenerReportes,
  obtenerPendientePorCasa
} = require('../controllers/reportes.controllers');

router.get('/:fraccId/reportes', async (req, res) => {
  const { fraccId } = req.params;
  const { casa, desde, hasta } = req.query;

  const hoy = new Date();
  const haceUnMes = new Date(hoy);
  haceUnMes.setMonth(hoy.getMonth() - 1);
  const haceDosMeses = new Date(hoy);
  haceDosMeses.setMonth(hoy.getMonth() - 2);
  const haceTresMeses = new Date(hoy);
  haceTresMeses.setMonth(hoy.getMonth() - 3);

  const filtro = {
    fraccId: new mongoose.Types.ObjectId(fraccId),
  };

  if (casa) {
    filtro.numeroCasa = casa;
  }

  if (desde || hasta) {
    filtro.tiempo = {};
    if (desde === '1') filtro.tiempo.$gte = haceUnMes;
    else if (desde === '2') filtro.tiempo.$gte = haceDosMeses;
    else if (desde === '3') filtro.tiempo.$gte = haceTresMeses;
    else if (desde) filtro.tiempo.$gte = new Date(desde);

    if (hasta) filtro.tiempo.$lte = new Date(hasta);
  }

  try {
    const reportes = await Reporte.find(filtro).sort({ tiempo: -1 });
    res.status(200).json(reportes);
  } catch (error) {
    console.error("Error al obtener reportes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.put('/reportes/:id/autorizar', async (req, res) => {
  try {
    const { residenteId, estatus } = req.body;

    const estatusFormateado = estatus?.toUpperCase();
    if (!['ACEPTADO', 'RECHAZADO', 'IGNORADO'].includes(estatusFormateado)) {
      return res.status(400).json({ error: 'Estatus inválido' });
    }

    const residencia = await Residencias.findOne({ "residentes.residenteId": residenteId });

    if (!residencia) {
      return res.status(404).json({ error: 'Residente no encontrado' });
    }

    const residente = residencia.residentes.find(r => r.residenteId === residenteId);

    const reporte = await Reporte.findByIdAndUpdate(
      req.params.id,
      {
        estatus: estatusFormateado,
        autorizadoPor: residenteId,
        nombreAutorizador: residente.nombre
      },
      { new: true }
    );

    res.json(reporte);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el reporte' });
  }
});

router.put("/:fraccId", async (req, res) => {
  const { fraccId } = req.params;
  const nuevosDatos = req.body;

  try {
    const fraccionamiento = await Fraccionamiento.findByIdAndUpdate(
      fraccId,
      nuevosDatos,
      { new: true }
    );

    if (!fraccionamiento)
      return res.status(404).json({ error: "Fraccionamiento no encontrado." });

    const qrId = fraccionamiento.qrVisitas;
    const link = `https://ingresos-drab.vercel.app/Visitas?id=${qrId}`;

    res.status(200).json({
      mensaje: "Fraccionamiento actualizado correctamente",
      data: fraccionamiento,
      qr: { link },
    });
  } catch (error) {
    console.error("Error al actualizar fraccionamiento:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.put('/actualizarReporte', async (req, res) => {
  try {
    const { resultado, idReporte, userId } = req.body;
    
    console.log("📥 Actualizando reporte desde app:", { resultado, idReporte, userId });

    if (!['ACEPTADO', 'RECHAZADO', 'CANCELADO'].includes(resultado)) {
      return res.status(400).json({ error: 'Resultado inválido' });
    }

    if (!idReporte) {
      return res.status(400).json({ error: 'ID de reporte requerido' });
    }

    const reporte = await Reporte.findById(idReporte);
    if (!reporte) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    const estatusMap = {
      'ACEPTADO': 'aceptado',
      'RECHAZADO': 'rechazado', 
      'CANCELADO': 'cancelado'
    };

    const estatusAnterior = reporte.estatus;
    reporte.estatus = estatusMap[resultado];
    reporte.autorizadoPor = userId || 'app-user';
    reporte.nombreAutorizador = userId ? `Usuario ${userId.split('_').pop().substring(0, 6)}` : 'Usuario App';
    
    await reporte.save();

    console.log(`Reporte ${idReporte} actualizado: ${reporte.estatus} por ${reporte.nombreAutorizador}`);
    
    if (global.emitToHouse) {
      global.emitToHouse(reporte.numeroCasa, reporte.fraccId.toString(), 'reporteActualizado', {
        reporteId: idReporte,
        estatus: reporte.estatus,
        estatusAnterior: estatusAnterior,
        autorizadoPor: reporte.nombreAutorizador,
        numeroCasa: reporte.numeroCasa,
        timestamp: new Date()
      });
    }

    res.json({ 
      success: true, 
      message: 'Reporte actualizado correctamente',
      estatus: reporte.estatus,
      autorizado: true
    });

  } catch (error) {
    console.error("Error actualizando reporte:", error);
    res.status(500).json({ error: 'Error al actualizar el reporte' });
  }
});

router.get('/reportes/pendiente/:fraccId/:numeroCasa', obtenerPendientePorCasa);

module.exports = router;