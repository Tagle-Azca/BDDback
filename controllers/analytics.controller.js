const analyticsService = require('../services/analytics.service');

const trackEvent = async (req, res) => {
  try {
    const { event, properties } = req.body;

    if (!event) {
      return res.status(400).json({
        success: false,
        message: 'Event name is required'
      });
    }

    const analyticsEvent = await analyticsService.saveEvent(event, properties, req);

    res.status(201).json({
      success: true,
      message: 'Event tracked successfully',
      eventId: analyticsEvent._id
    });

  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(error.message.includes('required') ? 400 : 500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const trackBatch = async (req, res) => {
  try {
    const { events } = req.body;

    const results = await analyticsService.saveBatchEvents(events, req);

    res.status(201).json({
      success: true,
      message: `${results.length} events tracked successfully`,
      trackedCount: results.length
    });

  } catch (error) {
    console.error('Error tracking batch events:', error);
    res.status(error.message.includes('required') || error.message.includes('Maximum') ? 400 : 500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const data = await analyticsService.getUserStatistics(userId, days);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const getFraccionamientoStats = async (req, res) => {
  try {
    const { fraccId } = req.params;
    const { days = 30 } = req.query;

    const data = await analyticsService.getFraccionamientoStatistics(fraccId, days);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching fraccionamiento stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const healthCheck = (req, res) => {
  res.json({
    status: 'ok',
    service: 'analytics',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  trackEvent,
  trackBatch,
  getUserStats,
  getFraccionamientoStats,
  healthCheck
};
