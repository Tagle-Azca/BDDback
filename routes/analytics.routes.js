const express = require('express');
const router = express.Router();
const {
  trackEvent,
  trackBatch,
  getUserStats,
  getFraccionamientoStats
} = require('../controllers/analytics.controller');

const logRequest = (req, res, next) => {
  console.log(`[Analytics] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
};

router.use(logRequest);

router.post('/track', trackEvent);
router.post('/batch', trackBatch);

router.get('/stats/:userId', getUserStats);
router.get('/fraccionamiento/:fraccId/stats', getFraccionamientoStats);

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Analytics service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;