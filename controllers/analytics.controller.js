const Analytics = require('../models/Analytics');

const trackEvent = async (req, res) => {
  try {
    const { event, properties } = req.body;

    if (!event) {
      return res.status(400).json({
        success: false,
        message: 'Event name is required'
      });
    }

    const {
      user_id: userId,
      house,
      fracc_id: fraccId,
      app_version: appVersion,
      platform,
      device_timestamp: deviceTimestamp,
      session_id: sessionId,
      ...otherProperties
    } = properties || {};

    if (!userId || !fraccId) {
      return res.status(400).json({
        success: false,
        message: 'user_id and fracc_id are required in properties'
      });
    }

    const analyticsEvent = new Analytics({
      event,
      userId,
      house,
      fraccId,
      properties: otherProperties,
      appVersion,
      platform,
      deviceTimestamp: deviceTimestamp ? new Date(deviceTimestamp) : null,
      sessionId,
      ipAddress: req.ip || req.connection.remoteAddress
    });

    await analyticsEvent.save();

    res.status(201).json({
      success: true,
      message: 'Event tracked successfully',
      eventId: analyticsEvent._id
    });

  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const trackBatch = async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Events array is required'
      });
    }

    if (events.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 events per batch'
      });
    }

    const analyticsEvents = events.map(({ event, properties }) => {
      const {
        user_id: userId,
        house,
        fracc_id: fraccId,
        app_version: appVersion,
        platform,
        device_timestamp: deviceTimestamp,
        session_id: sessionId,
        ...otherProperties
      } = properties || {};

      return {
        event,
        userId,
        house,
        fraccId,
        properties: otherProperties,
        appVersion,
        platform,
        deviceTimestamp: deviceTimestamp ? new Date(deviceTimestamp) : null,
        sessionId,
        ipAddress: req.ip || req.connection.remoteAddress
      };
    });

    const results = await Analytics.insertMany(analyticsEvents, { ordered: false });

    res.status(201).json({
      success: true,
      message: `${results.length} events tracked successfully`,
      trackedCount: results.length
    });

  } catch (error) {
    console.error('Error tracking batch events:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await Analytics.aggregate([
      {
        $match: {
          userId: userId,
          serverTimestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          lastOccurred: { $max: '$serverTimestamp' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const totalEvents = await Analytics.countDocuments({
      userId: userId,
      serverTimestamp: { $gte: startDate }
    });

    const dailyActivity = await Analytics.aggregate([
      {
        $match: {
          userId: userId,
          serverTimestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$serverTimestamp'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalEvents,
        eventBreakdown: stats,
        dailyActivity,
        periodDays: parseInt(days)
      }
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

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const topEvents = await Analytics.aggregate([
      {
        $match: {
          fraccId: fraccId,
          serverTimestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const topHouses = await Analytics.aggregate([
      {
        $match: {
          fraccId: fraccId,
          house: { $exists: true, $ne: null },
          serverTimestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$house',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          house: '$_id',
          eventCount: '$count',
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      {
        $sort: { eventCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const activeUsers = await Analytics.aggregate([
      {
        $match: {
          fraccId: fraccId,
          serverTimestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$userId',
          eventCount: { $sum: 1 },
          lastActivity: { $max: '$serverTimestamp' }
        }
      },
      {
        $sort: { eventCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      data: {
        topEvents,
        topHouses,
        activeUsers: activeUsers.length,
        periodDays: parseInt(days)
      }
    });

  } catch (error) {
    console.error('Error fetching fraccionamiento stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  trackEvent,
  trackBatch,
  getUserStats,
  getFraccionamientoStats
};