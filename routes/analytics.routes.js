const express = require('express');
const router = express.Router();
const {
  trackEvent,
  trackBatch,
  getUserStats,
  getFraccionamientoStats,
  healthCheck
} = require('../controllers/analytics.controller');

const logRequest = (req, res, next) => {
  console.log(`[Analytics] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
};

router.use(logRequest);

router.get('/health', healthCheck);
router.post('/track', trackEvent);
router.post('/batch', trackBatch);
router.get('/stats/:userId', getUserStats);
router.get('/fraccionamiento/:fraccId/stats', getFraccionamientoStats);

module.exports = router;