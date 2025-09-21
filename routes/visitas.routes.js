const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cloudinary = require("../config/cloudinary");
const { enviarNotificacionVisita } = require("../controllers/Visitas");
const { manejarError } = require('../utils/helpers');
const { validarFraccionamiento, validarCasa } = require('../middleware/validators');

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

// Registrar visita
router.post("/:fraccId/casas/:numero/visitas",
  validarFraccionamiento,
  validarCasa,
  upload.single("FotoVisita"),
  async (req, res) => {
    try {
      const { nombre: nombreVisitante, motivo } = req.body;

      if (!req.casa.activa) {
        return res.status(403).json({ error: "La casa está desactivada y no puede recibir visitas." });
      }

      const fotoUrl = await subirImagenCloudinary(req.file?.path);

      if (!req.casa.visitas) req.casa.visitas = [];
      req.casa.visitas.push({
        nombreVisitante,
        motivo,
        foto: fotoUrl,
        fecha: new Date(),
      });

      await req.fraccionamiento.save();

      try {
        const resultadoNotificacion = await enviarNotificacionVisita(
          req.params.fraccId,
          req.params.numero,
          nombreVisitante,
          motivo,
          fotoUrl
        );

        if (resultadoNotificacion.success) {
          res.status(201).json({
            mensaje: "Visita registrada con éxito y residentes notificados",
            foto: fotoUrl,
            visitante: nombreVisitante,
            motivo: motivo,
            casa: req.params.numero,
            fraccId: req.params.fraccId,
            notificacionEnviada: true
          });
        } else {
          res.status(201).json({
            mensaje: "Visita registrada con éxito (error al notificar residentes)",
            foto: fotoUrl,
            visitante: nombreVisitante,
            motivo: motivo,
            casa: req.params.numero,
            fraccId: req.params.fraccId,
            notificacionEnviada: false,
            errorNotificacion: resultadoNotificacion.error
          });
        }
      } catch (notificationError) {
        res.status(201).json({
          mensaje: "Visita registrada con éxito (error al notificar residentes)",
          foto: fotoUrl,
          visitante: nombreVisitante,
          motivo: motivo,
          casa: req.params.numero,
          fraccId: req.params.fraccId,
          notificacionEnviada: false,
          errorNotificacion: notificationError.message
        });
      }

    } catch (error) {
      manejarError(res, error, "Error al registrar visita");
    }
  }
);

module.exports = router;