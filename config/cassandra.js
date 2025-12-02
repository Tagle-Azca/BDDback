const cassandra = require('cassandra-driver');

class CassandraConfig {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = new cassandra.Client({
        contactPoints: (process.env.CASSANDRA_CONTACT_POINTS || 'localhost').split(','),
        localDataCenter: process.env.CASSANDRA_DATACENTER || 'datacenter1',
        keyspace: process.env.CASSANDRA_KEYSPACE || 'eskayser',
        credentials: {
          username: process.env.CASSANDRA_USERNAME || 'cassandra',
          password: process.env.CASSANDRA_PASSWORD || 'cassandra'
        },
        pooling: {
          coreConnectionsPerHost: {
            [cassandra.types.distance.local]: 2,
            [cassandra.types.distance.remote]: 1
          }
        }
      });

      await this.client.connect();
      this.isConnected = true;
      console.log('Cassandra: Conectado exitosamente');

      await this.initKeyspace();
      await this.initTables();

      return this.client;
    } catch (error) {
      console.error('Cassandra: Error al conectar:', error.message);
      console.log('Cassandra: Funcionalidad de logs deshabilitada. El sistema seguira funcionando.');
      this.isConnected = false;
      return null;
    }
  }

  async initKeyspace() {
    if (!this.client) return;

    const keyspace = process.env.CASSANDRA_KEYSPACE || 'eskayser';

    try {
      const createKeyspaceQuery = `
        CREATE KEYSPACE IF NOT EXISTS ${keyspace}
        WITH replication = {
          'class': 'SimpleStrategy',
          'replication_factor': 1
        }
      `;

      await this.client.execute(createKeyspaceQuery);
      console.log(`Cassandra: Keyspace '${keyspace}' verificado/creado`);
    } catch (error) {
      console.error('Cassandra: Error al crear keyspace:', error.message);
    }
  }

  async initTables() {
    if (!this.client) return;

    const tables = [
      // Tabla de reportes historicos
      `CREATE TABLE IF NOT EXISTS reportes_history (
        reporte_id uuid,
        fracc_id uuid,
        date text,
        timestamp timestamp,
        numero_casa text,
        nombre text,
        motivo text,
        foto text,
        estatus text,
        autorizado_por text,
        notification_id text,
        PRIMARY KEY ((fracc_id, date), timestamp, reporte_id)
      ) WITH CLUSTERING ORDER BY (timestamp DESC)`,

      // Tabla de logs de acceso a puertas
      `CREATE TABLE IF NOT EXISTS access_logs (
        fracc_id uuid,
        date text,
        timestamp timestamp,
        access_id timeuuid,
        residencia text,
        tipo text,
        nombre text,
        foto text,
        metodo text,
        resultado text,
        PRIMARY KEY ((fracc_id, date), timestamp, access_id)
      ) WITH CLUSTERING ORDER BY (timestamp DESC)`,

      // Tabla de eventos de analytics
      `CREATE TABLE IF NOT EXISTS analytics_events (
        user_id text,
        date text,
        timestamp timestamp,
        event_id timeuuid,
        event_type text,
        properties map<text, text>,
        fracc_id text,
        house text,
        platform text,
        app_version text,
        PRIMARY KEY ((user_id, date), timestamp, event_id)
      ) WITH CLUSTERING ORDER BY (timestamp DESC)`,

      // Tabla de historial de notificaciones
      `CREATE TABLE IF NOT EXISTS notification_history (
        fracc_id uuid,
        date text,
        timestamp timestamp,
        notification_id timeuuid,
        residencia text,
        titulo text,
        cuerpo text,
        foto text,
        player_ids set<text>,
        resultado text,
        metadata map<text, text>,
        PRIMARY KEY ((fracc_id, date), timestamp, notification_id)
      ) WITH CLUSTERING ORDER BY (timestamp DESC)`,

      // Tabla de audit trail
      `CREATE TABLE IF NOT EXISTS audit_trail (
        entity_type text,
        entity_id text,
        date text,
        timestamp timestamp,
        audit_id timeuuid,
        action text,
        user_id text,
        user_name text,
        changes map<text, text>,
        ip_address text,
        PRIMARY KEY ((entity_type, entity_id, date), timestamp, audit_id)
      ) WITH CLUSTERING ORDER BY (timestamp DESC)`
    ];

    for (const query of tables) {
      try {
        await this.client.execute(query);
      } catch (error) {
        console.error('Cassandra: Error al crear tabla:', error.message);
      }
    }

    console.log('Cassandra: Todas las tablas verificadas/creadas');
  }

  getClient() {
    return this.client;
  }

  isReady() {
    return this.isConnected;
  }

  async shutdown() {
    if (this.client) {
      await this.client.shutdown();
      console.log('Cassandra: Conexion cerrada');
    }
  }
}

module.exports = new CassandraConfig();
