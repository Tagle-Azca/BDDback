const { ChromaClient } = require('chromadb');

class VisitanteSearchService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      this.client = new ChromaClient({
        path: process.env.CHROMA_URL || "http://localhost:8000"
      });

      this.collection = await this.client.getOrCreateCollection({
        name: "visitantes_eskayser",
        metadata: {
          description: "Búsqueda de visitantes por foto y nombre"
        }
      });

      this.isInitialized = true;
      console.log('ChromaDB: Colección "visitantes_eskayser" inicializada');
    } catch (error) {
      console.error('ChromaDB: Error al inicializar:', error.message);
      console.log('ChromaDB: Búsqueda de visitantes deshabilitada. Verifica que ChromaDB esté corriendo.');
      this.isInitialized = false;
    }
  }

  async indexarVisitante(reporte) {
    if (!this.isInitialized) {
      console.log('ChromaDB no inicializado, omitiendo indexación');
      return null;
    }

    try {
      const documentText = `${reporte.nombre} ${reporte.motivo || ''}`;

      await this.collection.add({
        ids: [reporte._id.toString()],
        documents: [documentText],
        metadatas: [{
          reporteId: reporte._id.toString(),
          nombre: reporte.nombre,
          motivo: reporte.motivo || '',
          foto: reporte.foto || '',
          fraccId: reporte.fraccId.toString(),
          numeroCasa: reporte.numeroCasa,
          fecha: reporte.tiempo.toISOString(),
          estatus: reporte.estatus
        }]
      });

      console.log(`ChromaDB: Visitante indexado - ${reporte.nombre} (${reporte._id})`);
      return true;
    } catch (error) {
      console.error('ChromaDB: Error al indexar visitante:', error.message);
      return null;
    }
  }

  async buscarSimilares(nombre, motivo = '', fraccId, limit = 5) {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const queryText = `${nombre} ${motivo}`.trim();

      const results = await this.collection.query({
        queryTexts: [queryText],
        nResults: limit,
        where: {
          fraccId: fraccId.toString()
        }
      });

      if (!results.metadatas || !results.metadatas[0] || results.metadatas[0].length === 0) {
        return [];
      }

      return results.metadatas[0].map((meta, idx) => ({
        ...meta,
        similaridad: Math.max(0, 1 - (results.distances[0][idx] || 0)),
        distancia: results.distances[0][idx]
      }));
    } catch (error) {
      console.error('ChromaDB: Error al buscar similares:', error.message);
      return [];
    }
  }

  async visitantesFrecuentes(fraccId, minVisitas = 3) {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const allVisits = await this.collection.get({
        where: { fraccId: fraccId.toString() }
      });

      if (!allVisits.metadatas || allVisits.metadatas.length === 0) {
        return [];
      }

      const frecuencia = {};
      const detalles = {};

      allVisits.metadatas.forEach(meta => {
        const key = meta.nombre.toLowerCase().trim();
        frecuencia[key] = (frecuencia[key] || 0) + 1;

        if (!detalles[key]) {
          detalles[key] = {
            nombre: meta.nombre,
            ultimaVisita: meta.fecha,
            foto: meta.foto,
            casasVisitadas: new Set()
          };
        }

        detalles[key].casasVisitadas.add(meta.numeroCasa);

        if (new Date(meta.fecha) > new Date(detalles[key].ultimaVisita)) {
          detalles[key].ultimaVisita = meta.fecha;
        }
      });

      return Object.entries(frecuencia)
        .filter(([_, count]) => count >= minVisitas)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, visitas]) => ({
          nombre: detalles[key].nombre,
          totalVisitas: visitas,
          ultimaVisita: detalles[key].ultimaVisita,
          foto: detalles[key].foto,
          casasVisitadas: Array.from(detalles[key].casasVisitadas)
        }));
    } catch (error) {
      console.error('ChromaDB: Error al obtener visitantes frecuentes:', error.message);
      return [];
    }
  }

  async obtenerHistorialVisitante(nombre, fraccId, limit = 50) {
    if (!this.isInitialized) {
      return [];
    }

    try {
      const resultados = await this.buscarSimilares(nombre, '', fraccId, limit);

      return resultados
        .filter(r => r.similaridad > 0.7)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    } catch (error) {
      console.error('ChromaDB: Error al obtener historial:', error.message);
      return [];
    }
  }

  async actualizarVisitante(reporte) {
    if (!this.isInitialized) {
      console.log('ChromaDB no inicializado, omitiendo actualizacion');
      return null;
    }

    try {
      const reporteId = reporte._id.toString();

      await this.collection.delete({
        ids: [reporteId]
      });

      await this.indexarVisitante(reporte);

      console.log(`ChromaDB: Visitante actualizado - ${reporte.nombre} (${reporteId})`);
      return true;
    } catch (error) {
      console.error('ChromaDB: Error al actualizar visitante:', error.message);
      return null;
    }
  }

  async eliminarVisitante(reporteId) {
    if (!this.isInitialized) {
      console.log('ChromaDB no inicializado, omitiendo eliminacion');
      return null;
    }

    try {
      await this.collection.delete({
        ids: [reporteId]
      });

      console.log(`ChromaDB: Visitante eliminado (${reporteId})`);
      return true;
    } catch (error) {
      console.error('ChromaDB: Error al eliminar visitante:', error.message);
      return null;
    }
  }

  getDiasDesde(fecha) {
    const diff = Date.now() - new Date(fecha).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  isReady() {
    return this.isInitialized;
  }
}

module.exports = new VisitanteSearchService();
