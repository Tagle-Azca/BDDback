const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");
const { enviarNotificacionVisita } = require("../controllers/visitas.controller");
const { manejarError } = require('../utils/helpers');
const { validarFraccionamiento, validarCasa } = require('../middleware/validators');
const reporteOrchestrator = require('../services/reporte-orchestrator.service');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const subirImagenCloudinary = async (filePath) => {
  if (!filePath) {
    throw new Error("No se recibió ninguna imagen válida.");
  }

  try {
    const resultado = await cloudinary.uploader.upload(filePath, { folder: "visitas" });

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return resultado.secure_url;
  } catch (error) {
    throw new Error("Error al subir imagen a Cloudinary.");
  }
};

router.post("/:fraccId/casas/:numero/visitas",
  validarFraccionamiento,
  validarCasa,
  upload.single("FotoVisita"),
  async (req, res) => {
    try {
      const { nombre: nombreVisitante, motivo } = req.body;
      const { fraccId, numero } = req.params;

      if (!req.casa.activa) {
        return res.status(403).json({ error: "La casa está desactivada y no puede recibir visitas." });
      }

      const fotoUrl = await subirImagenCloudinary(req.file?.path);

      // Guardar visita en el fraccionamiento
      if (!req.casa.visitas) req.casa.visitas = [];
      req.casa.visitas.push({
        nombreVisitante,
        motivo,
        foto: fotoUrl,
        fecha: new Date(),
      });

      await req.fraccionamiento.save();

      // Crear reporte orquestado (MongoDB + Cassandra + ChromaDB)
      const resultado = await reporteOrchestrator.crearReporte({
        fraccId,
        numeroCasa: numero,
        nombre: nombreVisitante,
        motivo: motivo || '',
        foto: fotoUrl
      });

      // Enviar notificación
      enviarNotificacionVisita(
        fraccId,
        numero,
        nombreVisitante,
        motivo,
        fotoUrl
      ).catch(() => {
      });

      // Obtener estadísticas del visitante si ya visitó antes
      let estadisticas = null;
      if (resultado.esVisitaRepetida) {
        estadisticas = await reporteOrchestrator.obtenerEstadisticasVisitante(
          fraccId,
          nombreVisitante
        );
      }

      // Preparar respuesta
      const respuesta = {
        success: true,
        reporteId: resultado.reporte._id,
        visitante: {
          totalVisitas: resultado.visitante.totalVisitas,
          esNuevo: resultado.visitante.totalVisitas === 1,
          estadisticas: estadisticas
        }
      };

      res.status(201).json(respuesta);

    } catch (error) {
      manejarError(res, error, "Error al registrar visita");
    }
  }
);

module.exports = router;