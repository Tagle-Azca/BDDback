const cassandra = require('cassandra-driver');
const cassandraConfig = require('../config/cassandra');
const { TimeUuid } = cassandra.types;

class CassandraService {
  constructor() {
    this.client = null;
  }

  async init() {
    this.client = await cassandraConfig.connect();
    return this.client !== null;
  }

  isReady() {
    return cassandraConfig.isReady();
  }

  // ==================== REPORTES ====================

  async guardarReporte(reporte) {
    if (!this.isReady()) return null;

    try {
      const query = `
        INSERT INTO reportes_history (
          reporte_id, fracc_id, date, timestamp,
          numero_casa, nombre, motivo, foto,
          estatus, autorizado_por, notification_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const date = new Date(reporte.tiempo).toISOString().split('T')[0];

      const params = [
        cassandra.types.Uuid.fromString(reporte._id.toString()),
        cassandra.types.Uuid.fromString(reporte.fraccId.toString()),
        date,
        reporte.tiempo,
        reporte.numeroCasa,
        reporte.nombre,
        reporte.motivo || '',
        reporte.foto || '',
        reporte.estatus,
        reporte.autorizadoPor || '',
        reporte.notificationId || ''
      ];

      await this.client.execute(query, params, { prepare: true });
      console.log(`Cassandra: Reporte guardado - ${reporte.nombre} (${reporte._id})`);
      return true;
    } catch (error) {
      console.error('Cassandra: Error al guardar reporte:', error.message);
      return null;
    }
  }

  async actualizarReporte(reporte) {
    if (!this.isReady()) return null;

    try {
      await this.guardarReporte(reporte);
      return true;
    } catch (error) {
      console.error('Cassandra: Error al actualizar reporte:', error.message);
      return null;
    }
  }

  async obtenerReportesPorFraccionamiento(fraccId, startDate, endDate, limit = 100) {
    if (!this.isReady()) return [];

    try {
      const query = `
        SELECT * FROM reportes_history
        WHERE fracc_id = ? AND date >= ? AND date <= ?
        LIMIT ?
      `;

      const params = [
        cassandra.types.Uuid.fromString(fraccId),
        startDate,
        endDate,
        limit
      ];

      const result = await this.client.execute(query, params, { prepare: true });
      return result.rows.map(row => ({
        reporteId: row.reporte_id.toString(),
        timestamp: row.timestamp,
        numeroCasa: row.numero_casa,
        nombre: row.nombre,
        motivo: row.motivo,
        foto: row.foto,
        estatus: row.estatus,
        autorizadoPor: row.autorizado_por
      }));
    } catch (error) {
      console.error('Cassandra: Error al obtener reportes:', error.message);
      return [];
    }
  }

  async obtenerReportesPorCasa(fraccId, numeroCasa, days = 30, limit = 100) {
    if (!this.isReady()) return [];

    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const query = `
        SELECT * FROM reportes_history
        WHERE fracc_id = ? AND date >= ? AND date <= ? AND numero_casa = ?
        LIMIT ?
        ALLOW FILTERING
      `;

      const params = [
        cassandra.types.Uuid.fromString(fraccId),
        startDate,
        endDate,
        numeroCasa,
        limit
      ];

      const result = await this.client.execute(query, params, { prepare: true });
      return result.rows.map(row => ({
        reporteId: row.reporte_id.toString(),
        timestamp: row.timestamp,
        nombre: row.nombre,
        motivo: row.motivo,
        foto: row.foto,
        estatus: row.estatus,
        autorizadoPor: row.autorizado_por
      }));
    } catch (error) {
      console.error('Cassandra: Error al obtener reportes por casa:', error.message);
      return [];
    }
  }

  // ==================== ACCESS LOGS ====================

  async logAccess(data) {
    if (!this.isReady()) return null;

    try {
      const query = `
        INSERT INTO access_logs (
          fracc_id, date, timestamp, access_id,
          residencia, tipo, nombre, foto, metodo, resultado
        ) VALUES (?, ?, ?, now(), ?, ?, ?, ?, ?, ?)
      `;

      const date = new Date().toISOString().split('T')[0];

      const params = [
        cassandra.types.Uuid.fromString(data.fraccId),
        date,
        new Date(),
        data.residencia || '',
        data.tipo || 'visitante',
        data.nombre || '',
        data.foto || '',
        data.metodo || 'qr',
        data.resultado || 'pendiente'
      ];

      await this.client.execute(query, params, { prepare: true });
      console.log(`Cassandra: Access log registrado - ${data.nombre} (${data.tipo})`);
      return true;
    } catch (error) {
      console.error('Cassandra: Error al registrar access log:', error.message);
      return null;
    }
  }

  async getAccessHistory(fraccId, startDate, endDate, limit = 100) {
    if (!this.isReady()) return [];

    try {
      const query = `
        SELECT * FROM access_logs
        WHERE fracc_id = ? AND date >= ? AND date <= ?
        LIMIT ?
      `;

      const params = [
        cassandra.types.Uuid.fromString(fraccId),
        startDate,
        endDate,
        limit
      ];

      const result = await this.client.execute(query, params, { prepare: true });
      return result.rows.map(row => ({
        timestamp: row.timestamp,
        residencia: row.residencia,
        tipo: row.tipo,
        nombre: row.nombre,
        foto: row.foto,
        metodo: row.metodo,
        resultado: row.resultado
      }));
    } catch (error) {
      console.error('Cassandra: Error al obtener historial de accesos:', error.message);
      return [];
    }
  }

  async getAccessStatsByHouse(fraccId, residencia, days = 30) {
    if (!this.isReady()) return null;

    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const query = `
        SELECT tipo, COUNT(*) as total
        FROM access_logs
        WHERE fracc_id = ? AND date >= ? AND date <= ? AND residencia = ?
        ALLOW FILTERING
      `;

      const params = [
        cassandra.types.Uuid.fromString(fraccId),
        startDate,
        endDate,
        residencia
      ];

      const result = await this.client.execute(query, params, { prepare: true });
      return result.rows;
    } catch (error) {
      console.error('Cassandra: Error al obtener estadisticas de acceso:', error.message);
      return null;
    }
  }

  // ==================== ANALYTICS EVENTS ====================

  async trackEvent(data) {
    if (!this.isReady()) return null;

    try {
      const query = `
        INSERT INTO analytics_events (
          user_id, date, timestamp, event_id,
          event_type, properties, fracc_id, house, platform, app_version
        ) VALUES (?, ?, ?, now(), ?, ?, ?, ?, ?, ?)
      `;

      const date = new Date().toISOString().split('T')[0];

      const params = [
        data.userId || 'anonymous',
        date,
        new Date(),
        data.event || 'unknown',
        data.properties || {},
        data.fraccId || '',
        data.house || '',
        data.platform || 'web',
        data.appVersion || '1.0.0'
      ];

      await this.client.execute(query, params, { prepare: true });
      console.log(`Cassandra: Evento trackeado - ${data.event} (${data.userId})`);
      return true;
    } catch (error) {
      console.error('Cassandra: Error al trackear evento:', error.message);
      return null;
    }
  }

  async getUserEvents(userId, startDate, endDate, limit = 100) {
    if (!this.isReady()) return [];

    try {
      const query = `
        SELECT * FROM analytics_events
        WHERE user_id = ? AND date >= ? AND date <= ?
        LIMIT ?
      `;

      const params = [userId, startDate, endDate, limit];

      const result = await this.client.execute(query, params, { prepare: true });
      return result.rows.map(row => ({
        timestamp: row.timestamp,
        eventType: row.event_type,
        properties: row.properties,
        fraccId: row.fracc_id,
        house: row.house,
        platform: row.platform
      }));
    } catch (error) {
      console.error('Cassandra: Error al obtener eventos de usuario:', error.message);
      return [];
    }
  }

  async getEventStats(fraccId, eventType, days = 30) {
    if (!this.isReady()) return null;

    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const query = `
        SELECT COUNT(*) as total
        FROM analytics_events
        WHERE fracc_id = ? AND event_type = ? AND date >= ? AND date <= ?
        ALLOW FILTERING
      `;

      const params = [fraccId, eventType, startDate, endDate];

      const result = await this.client.execute(query, params, { prepare: true });
      return result.rows[0];
    } catch (error) {
      console.error('Cassandra: Error al obtener estadisticas de eventos:', error.message);
      return null;
    }
  }

  // ==================== NOTIFICATION HISTORY ====================

  async logNotification(data) {
    if (!this.isReady()) return null;

    try {
      const query = `
        INSERT INTO notification_history (
          fracc_id, date, timestamp, notification_id,
          residencia, titulo, cuerpo, foto, player_ids, resultado, metadata
        ) VALUES (?, ?, ?, now(), ?, ?, ?, ?, ?, ?, ?)
      `;

      const date = new Date().toISOString().split('T')[0];

      const params = [
        cassandra.types.Uuid.fromString(data.fraccId),
        date,
        new Date(),
        data.residencia || '',
        data.titulo || '',
        data.cuerpo || '',
        data.foto || '',
        data.playerIds || [],
        data.resultado || 'enviada',
        data.metadata || {}
      ];

      await this.client.execute(query, params, { prepare: true });
      console.log(`Cassandra: Notificacion registrada - ${data.titulo}`);
      return true;
    } catch (error) {
      console.error('Cassandra: Error al registrar notificacion:', error.message);
      return null;
    }
  }

  async getNotificationHistory(fraccId, residencia, days = 30, limit = 100) {
    if (!this.isReady()) return [];

    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const query = `
        SELECT * FROM notification_history
        WHERE fracc_id = ? AND date >= ? AND date <= ? AND residencia = ?
        LIMIT ?
        ALLOW FILTERING
      `;

      const params = [
        cassandra.types.Uuid.fromString(fraccId),
        startDate,
        endDate,
        residencia,
        limit
      ];

      const result = await this.client.execute(query, params, { prepare: true });
      return result.rows.map(row => ({
        timestamp: row.timestamp,
        titulo: row.titulo,
        cuerpo: row.cuerpo,
        foto: row.foto,
        resultado: row.resultado
      }));
    } catch (error) {
      console.error('Cassandra: Error al obtener historial de notificaciones:', error.message);
      return [];
    }
  }

  // ==================== AUDIT TRAIL ====================

  async logAudit(data) {
    if (!this.isReady()) return null;

    try {
      const query = `
        INSERT INTO audit_trail (
          entity_type, entity_id, date, timestamp, audit_id,
          action, user_id, user_name, changes, ip_address
        ) VALUES (?, ?, ?, ?, now(), ?, ?, ?, ?, ?)
      `;

      const date = new Date().toISOString().split('T')[0];

      const params = [
        data.entityType || 'unknown',
        data.entityId || '',
        date,
        new Date(),
        data.action || 'unknown',
        data.userId || '',
        data.userName || '',
        data.changes || {},
        data.ipAddress || ''
      ];

      await this.client.execute(query, params, { prepare: true });
      console.log(`Cassandra: Audit log registrado - ${data.action} en ${data.entityType}`);
      return true;
    } catch (error) {
      console.error('Cassandra: Error al registrar audit log:', error.message);
      return null;
    }
  }

  async getAuditTrail(entityType, entityId, days = 30, limit = 100) {
    if (!this.isReady()) return [];

    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];

      const query = `
        SELECT * FROM audit_trail
        WHERE entity_type = ? AND entity_id = ? AND date >= ? AND date <= ?
        LIMIT ?
      `;

      const params = [entityType, entityId, startDate, endDate, limit];

      const result = await this.client.execute(query, params, { prepare: true });
      return result.rows.map(row => ({
        timestamp: row.timestamp,
        action: row.action,
        userId: row.user_id,
        userName: row.user_name,
        changes: row.changes,
        ipAddress: row.ip_address
      }));
    } catch (error) {
      console.error('Cassandra: Error al obtener audit trail:', error.message);
      return [];
    }
  }
}

module.exports = new CassandraService();
