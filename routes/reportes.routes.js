const express = require("express");
const router = express.Router();
const Reporte = require("../models/Reportes");
const Fraccionamiento = require("../models/fraccionamiento");
const mongoose = require("mongoose");

const manejarError = (res, error, mensaje = "Error interno del servidor", status = 500) => {
  console.error(mensaje, error);
  res.status(status).json({ error: mensaje });
};

const validarFraccionamiento = async (req, res, next) => {
  try {
    const fracc = await Fraccionamiento.findById(req.params.fraccId);
    
    if (!fracc) {
      return res.status(404).json({ error: "Fraccionamiento no encontrado" });
    }
    
    req.fraccionamiento = fracc;
    next();
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const validarUsuarioEnFraccionamiento = (fraccionamiento, residenteId) => {
  for (const residencia of fraccionamiento.residencias) {
    const residente = residencia.residentes.find(r => 
      r._id.toString() === residenteId && r.activo === true
    );
    if (residente) return true;
  }
  return false;
};

router.post("/:fraccId/crear", validarFraccionamiento, async (req, res) => {
  try {
    const { 
      notificationId,
      nombre,
      motivo,
      foto,
      numeroCasa,
      estatus,
      residenteId,
      residenteNombre
    } = req.body;

    if (!nombre || !motivo || !numeroCasa || !estatus) {
      return res.status(400).json({ 
        error: "Datos incompletos: nombre, motivo, numeroCasa y estatus son obligatorios" 
      });
    }

    const estatusValidos = ['aceptado', 'rechazado', 'expirado'];
    if (!estatusValidos.includes(estatus.toLowerCase())) {
      return res.status(400).json({ 
        error: "Estatus inválido. Debe ser: aceptado, rechazado o expirado" 
      });
    }

    if (estatus !== 'expirado' && residenteId) {
      const usuarioValido = validarUsuarioEnFraccionamiento(req.fraccionamiento, residenteId);
      if (!usuarioValido) {
        return res.status(403).json({ 
          error: "Residente no autorizado en este fraccionamiento" 
        });
      }
    }

    if (notificationId) {
      const reporteExistente = await Reporte.findOne({ notificationId });
      if (reporteExistente) {
        return res.status(409).json({ 
          error: "Ya existe un reporte para esta notificación",
          reporte: reporteExistente
        });
      }
    }

    const nuevoReporte = new Reporte({
      fraccId: req.params.fraccId,
      numeroCasa: numeroCasa.toString(),
      nombre: nombre,
      motivo: motivo,
      foto: foto,
      estatus: estatus.toLowerCase(),
      autorizadoPor: residenteNombre || (estatus === 'expirado' ? 'Sistema' : 'Usuario'),
      tiempo: new Date(),
      notificationId: notificationId
    });

    const reporteGuardado = await nuevoReporte.save();
    
    console.log(`✅ Reporte creado: ${reporteGuardado._id} - ${estatus.toUpperCase()}`);

    const io = req.app.get('io');
    if (io) {
      io.emit('reporteActualizado', {
        reporteId: reporteGuardado._id.toString(),
        estatus: estatus.toUpperCase(),
        autorizadoPor: reporteGuardado.autorizadoPor,
        numeroCasa: numeroCasa,
        timestamp: new Date()
      });
    }

    if (estatus.toLowerCase() === 'aceptado') {
      await Fraccionamiento.updateOne(
        { _id: req.params.fraccId }, 
        { $set: { puerta: true } }
      );
      
      setTimeout(async () => {
        try {
          await Fraccionamiento.updateOne(
            { _id: req.params.fraccId }, 
            { $set: { puerta: false } }
          );
          console.log("🚪 Puerta cerrada automáticamente");
        } catch (error) {
          console.error('Error cerrando puerta automáticamente:', error);
        }
      }, 10000);
    }

    res.status(201).json({
      success: true,
      mensaje: `Reporte creado como ${estatus.toUpperCase()}`,
      reporte: reporteGuardado,
      puertaAbierta: estatus.toLowerCase() === 'aceptado'
    });

  } catch (error) {
    console.error("Error creando reporte:", error);
    manejarError(res, error, "Error al crear reporte");
  }
});

router.get("/:fraccId", async (req, res) => {
  try {
    const { fraccId } = req.params;
    const { casa, desde, hasta, limite = 50 } = req.query;

    const filtro = { fraccId: fraccId };
    
    if (casa) filtro.numeroCasa = casa;
    if (desde) filtro.tiempo = { $gte: new Date(desde) };
    if (hasta) filtro.tiempo = { ...filtro.tiempo, $lte: new Date(hasta) };
    
    const reportes = await Reporte.find(filtro)
      .sort({ tiempo: -1 })
      .limit(parseInt(limite));

    const estadisticas = {
      total: reportes.length,
      aceptados: reportes.filter(r => r.estatus === 'aceptado').length,
      rechazados: reportes.filter(r => r.estatus === 'rechazado').length,
      expirados: reportes.filter(r => r.estatus === 'expirado').length
    };
    
    res.json({
      success: true,
      fraccionamiento: fraccId,
      reportes: reportes,
      estadisticas: estadisticas
    });
    
  } catch (error) {
    console.error("Error obteniendo reportes del fraccionamiento:", error);
    manejarError(res, error, "Error al obtener reportes");
  }
});

router.get("/:fraccId/casa/:numeroCasa", async (req, res) => {
  try {
    const { fraccId, numeroCasa } = req.params;
    const { limite = 50, desde } = req.query;

    const filtro = {
      fraccId: fraccId,
      numeroCasa: numeroCasa.toString()
    };
    
    if (desde) {
      filtro.tiempo = { $gte: new Date(desde) };
    }
    
    const reportes = await Reporte.find(filtro)
      .sort({ tiempo: -1 })
      .limit(parseInt(limite));
    
    const estadisticas = {
      total: reportes.length,
      aceptados: reportes.filter(r => r.estatus === 'aceptado').length,
      rechazados: reportes.filter(r => r.estatus === 'rechazado').length,
      expirados: reportes.filter(r => r.estatus === 'expirado').length
    };
    
    res.json({
      success: true,
      casa: numeroCasa,
      fraccionamiento: fraccId,
      reportes: reportes,
      estadisticas: estadisticas
    });
    
  } catch (error) {
    console.error("Error obteniendo historial de casa:", error);
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
    console.error("Error obteniendo reporte:", error);
    manejarError(res, error, "Error al obtener reporte");
  }
});

router.put("/reporte/:reporteId", async (req, res) => {
  try {
    const { reporteId } = req.params;
    const { estatus, residenteNombre } = req.body;
    
    const estatusValidos = ['aceptado', 'rechazado', 'expirado'];
    if (!estatusValidos.includes(estatus.toLowerCase())) {
      return res.status(400).json({ 
        error: "Estatus inválido. Debe ser: aceptado, rechazado o expirado" 
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
    console.error("Error actualizando reporte:", error);
    manejarError(res, error, "Error al actualizar reporte");
  }
});

module.exports = router;