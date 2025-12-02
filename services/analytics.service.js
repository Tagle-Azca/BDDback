const Analytics = require('../models/analytics.model');

const parseEventProperties = (properties, req) => {
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
    userId,
    house,
    fraccId,
    appVersion,
    platform,
    deviceTimestamp: deviceTimestamp ? new Date(deviceTimestamp) : null,
    sessionId,
    ipAddress: req?.ip || req?.connection?.remoteAddress,
    otherProperties
  };
};

const createAnalyticsEvent = (event, parsedProps) => {
  return new Analytics({
    event,
    userId: parsedProps.userId,
    house: parsedProps.house,
    fraccId: parsedProps.fraccId,
    properties: parsedProps.otherProperties,
    appVersion: parsedProps.appVersion,
    platform: parsedProps.platform,
    deviceTimestamp: parsedProps.deviceTimestamp,
    sessionId: parsedProps.sessionId,
    ipAddress: parsedProps.ipAddress
  });
};

const saveEvent = async (event, properties, req) => {
  const parsedProps = parseEventProperties(properties, req);

  const analyticsEvent = createAnalyticsEvent(event, parsedProps);
  await analyticsEvent.save();

  return analyticsEvent;
};

const saveBatchEvents = async (events, req) => {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('Events array is required');
  }

  if (events.length > 100) {
    throw new Error('Maximum 100 events per batch');
  }

  const analyticsEvents = events.map(({ event, properties }) => {
    const parsedProps = parseEventProperties(properties, req);
    return {
      event,
      userId: parsedProps.userId,
      house: parsedProps.house,
      fraccId: parsedProps.fraccId,
      properties: parsedProps.otherProperties,
      appVersion: parsedProps.appVersion,
      platform: parsedProps.platform,
      deviceTimestamp: parsedProps.deviceTimestamp,
      sessionId: parsedProps.sessionId,
      ipAddress: parsedProps.ipAddress
    };
  });

  return await Analytics.insertMany(analyticsEvents, { ordered: false });
};

const getUserStatistics = async (userId, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const [stats, totalEvents, dailyActivity] = await Promise.all([
    Analytics.aggregate([
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
    ]),
    Analytics.countDocuments({
      userId: userId,
      serverTimestamp: { $gte: startDate }
    }),
    Analytics.aggregate([
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
    ])
  ]);

  return {
    totalEvents,
    eventBreakdown: stats,
    dailyActivity,
    periodDays: parseInt(days)
  };
};

const getFraccionamientoStatistics = async (fraccId, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const matchFilter = {
    fraccId: fraccId,
    serverTimestamp: { $gte: startDate }
  };

  const [topEvents, topHouses, activeUsers] = await Promise.all([
    Analytics.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    Analytics.aggregate([
      {
        $match: {
          ...matchFilter,
          house: { $exists: true, $ne: null }
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
      { $sort: { eventCount: -1 } },
      { $limit: 10 }
    ]),
    Analytics.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$userId',
          eventCount: { $sum: 1 },
          lastActivity: { $max: '$serverTimestamp' }
        }
      },
      { $sort: { eventCount: -1 } },
      { $limit: 10 }
    ])
  ]);

  return {
    topEvents,
    topHouses,
    activeUsers: activeUsers.length,
    periodDays: parseInt(days)
  };
};

module.exports = {
  saveEvent,
  saveBatchEvents,
  getUserStatistics,
  getFraccionamientoStatistics
};
