/**
 * 📊 SERVICIO DE ANALYTICS
 *
 * Maneja el tracking de eventos usando Cassandra
 */

const cassandraService = require('./cassandra.service');

class AnalyticsService {
  async saveEvent(event, properties, req) {
    try {
      const eventData = {
        event,
        properties: properties || {},
        userId: req.user?.id || 'anonymous',
        fraccId: req.body.fraccId || req.params.fraccId || '',
        house: req.body.house || '',
        platform: req.headers['user-agent'] || 'unknown',
        appVersion: req.headers['app-version'] || '1.0.0'
      };

      // Guardar en Cassandra si está disponible
      await cassandraService.trackEvent(eventData);

      return {
        _id: `event_${Date.now()}`,
        success: true
      };
    } catch (error) {
      console.error('Analytics: Error al guardar evento:', error.message);
      return { _id: null, success: false };
    }
  }

  async getEvents(filters) {
    try {
      if (!cassandraService.isReady()) {
        return [];
      }

      const { userId, startDate, endDate, limit } = filters;
      return await cassandraService.getUserEvents(userId, startDate, endDate, limit);
    } catch (error) {
      console.error('Analytics: Error al obtener eventos:', error.message);
      return [];
    }
  }

  async getStats(fraccId, eventType, days = 30) {
    try {
      if (!cassandraService.isReady()) {
        return null;
      }

      return await cassandraService.getEventStats(fraccId, eventType, days);
    } catch (error) {
      console.error('Analytics: Error al obtener estadísticas:', error.message);
      return null;
    }
  }
}

module.exports = new AnalyticsService();
