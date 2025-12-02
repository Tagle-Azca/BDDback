const express = require('express');
const router = express.Router();
const visitanteSearchService = require('../services/visitante-search.service');
const { protect } = require('../middleware/authMiddleware');

// Buscar visitantes similares manualmente
router.post('/visitantes', protect, async (req, res) => {
  try {
    const { nombre, motivo, fraccId, limit } = req.body;

    if (!nombre || !fraccId) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren nombre y fraccId'
      });
    }

    const resultados = await visitanteSearchService.buscarSimilares(
      nombre,
      motivo || '',
      fraccId,
      limit || 10
    );

    res.json({
      success: true,
      total: resultados.length,
      resultados
    });
  } catch (error) {
    console.error('Error en búsqueda de visitantes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Dashboard: Visitantes frecuentes
router.get('/visitantes-frecuentes/:fraccId', protect, async (req, res) => {
  try {
    const { fraccId } = req.params;
    const { minVisitas } = req.query;

    const frecuentes = await visitanteSearchService.visitantesFrecuentes(
      fraccId,
      parseInt(minVisitas) || 3
    );

    res.json({
      success: true,
      titulo: "Visitantes Frecuentes",
      descripcion: `Personas que han visitado ${minVisitas || 3}+ veces`,
      total: frecuentes.length,
      data: frecuentes
    });
  } catch (error) {
    console.error('Error al obtener visitantes frecuentes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Historial de un visitante específico
router.get('/historial-visitante/:fraccId/:nombre', protect, async (req, res) => {
  try {
    const { fraccId, nombre } = req.params;
    const { limit } = req.query;

    const historial = await visitanteSearchService.obtenerHistorialVisitante(
      nombre,
      fraccId,
      parseInt(limit) || 50
    );

    res.json({
      success: true,
      visitante: nombre,
      totalVisitas: historial.length,
      visitas: historial
    });
  } catch (error) {
    console.error('Error al obtener historial de visitante:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check de ChromaDB
router.get('/health', async (req, res) => {
  res.json({
    chromadb: visitanteSearchService.isReady() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
