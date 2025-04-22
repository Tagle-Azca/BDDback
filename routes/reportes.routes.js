const express = require('express');
const Fraccionamiento = require('../models/fraccionamiento');
const router = express.Router();    

router.put('/reportes/:id/autorizar', async (req, res) => {
    try {
      const { residenteId, estatus } = req.body;
  
      if (!['aceptado', 'rechazado'].includes(estatus)) {
        return res.status(400).json({ error: 'Estatus inválido' });
      }
  

      const residencia = await Residencias.findOne({ "residentes.residenteId": residenteId });
  
      if (!residencia) {
        return res.status(404).json({ error: 'Residente no encontrado' });
      }
  
      const residente = residencia.residentes.find(r => r.residenteId === residenteId);
  
      const reporte = await Reportes.findByIdAndUpdate(
        req.params.id,
        {
          estatus,
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


module.exports = router;