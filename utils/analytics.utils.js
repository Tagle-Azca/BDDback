const Analytics = require('../models/Analytics');

// Función para limpiar eventos antiguos (útil para tareas programadas)
const cleanupOldEvents = async (daysToKeep = 730) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await Analytics.deleteMany({
      serverTimestamp: { $lt: cutoffDate }
    });

    console.log(`Cleanup: Deleted ${result.deletedCount} old analytics events`);
    return result.deletedCount;
  } catch (error) {
    console.error('Error during analytics cleanup:', error);
    throw error;
  }
};

// Función para obtener un resumen rápido del sistema
const getSystemSummary = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalEvents, todayEvents, uniqueUsers, topEvents] = await Promise.all([
      Analytics.countDocuments(),
      Analytics.countDocuments({ serverTimestamp: { $gte: today } }),
      Analytics.distinct('userId').then(users => users.length),
      Analytics.aggregate([
        { $group: { _id: '$event', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);

    return {
      totalEvents,
      todayEvents,
      uniqueUsers,
      topEvents
    };
  } catch (error) {
    console.error('Error getting system summary:', error);
    throw error;
  }
};

// Validador de eventos
const validateEventData = (event, properties) => {
  const errors = [];

  if (!event || typeof event !== 'string') {
    errors.push('Event name must be a non-empty string');
  }

  if (!properties || typeof properties !== 'object') {
    errors.push('Properties must be an object');
  } else {
    const { user_id, fracc_id } = properties;

    if (!user_id || typeof user_id !== 'string') {
      errors.push('user_id is required in properties');
    }

    if (!fracc_id || typeof fracc_id !== 'string') {
      errors.push('fracc_id is required in properties');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Generador de reportes básicos
const generateReport = async (fraccId, startDate, endDate) => {
  try {
    const matchConditions = { fraccId };

    if (startDate && endDate) {
      matchConditions.serverTimestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const [
      eventCounts,
      userActivity,
      houseActivity,
      hourlyDistribution
    ] = await Promise.all([
      // Conteo por tipo de evento
      Analytics.aggregate([
        { $match: matchConditions },
        { $group: { _id: '$event', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),

      // Actividad por usuario
      Analytics.aggregate([
        { $match: matchConditions },
        { $group: {
          _id: '$userId',
          eventCount: { $sum: 1 },
          lastActivity: { $max: '$serverTimestamp' }
        }},
        { $sort: { eventCount: -1 } },
        { $limit: 20 }
      ]),

      // Actividad por casa
      Analytics.aggregate([
        {
          $match: {
            ...matchConditions,
            house: { $exists: true, $ne: null }
          }
        },
        { $group: {
          _id: '$house',
          eventCount: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }},
        { $project: {
          house: '$_id',
          eventCount: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }},
        { $sort: { eventCount: -1 } }
      ]),

      // Distribución por horas del día
      Analytics.aggregate([
        { $match: matchConditions },
        { $group: {
          _id: { $hour: '$serverTimestamp' },
          count: { $sum: 1 }
        }},
        { $sort: { '_id': 1 } }
      ])
    ]);

    return {
      period: { startDate, endDate },
      eventCounts,
      userActivity,
      houseActivity,
      hourlyDistribution,
      generatedAt: new Date()
    };

  } catch (error) {
    console.error('Error generating analytics report:', error);
    throw error;
  }
};

module.exports = {
  cleanupOldEvents,
  getSystemSummary,
  validateEventData,
  generateReport
};