const Visitante = require('../models/visitante.model');
const Reporte = require('../models/reporte.model');
const cassandraService = require('./cassandra.service');
const visitanteSearchService = require('./visitante-search.service');

class ReporteOrchestratorService {

  async crearReporte(data) {
    const { fraccId, numeroCasa, nombre, motivo, foto } = data;

    try {
      const visitante = await Visitante.buscarOCrear(nombre, fraccId, foto);
      await visitante.incrementarVisita(numeroCasa, motivo);

      const reporte = await Reporte.create({
        fraccId,
        numeroCasa,
        nombre,
        motivo: motivo || '',
        foto: foto || '',
        tiempo: new Date(),
        estatus: 'pendiente'
      });

      return {
        reporte,
        visitante,
        esVisitaRepetida: visitante.totalVisitas > 1
      };
    } catch (error) {
      console.error('Error al crear reporte:', error.message);
      throw error;
    }
  }

  async responderReporte(reporteId, aceptado, autorizadoPor, autorizadoPorId) {
    try {
      const reporte = await Reporte.findById(reporteId);
      if (!reporte) {
        throw new Error('Reporte no encontrado');
      }

      const visitante = await Visitante.findOne({
        fraccId: reporte.fraccId,
        nombreNormalizado: reporte.nombre.toLowerCase().trim()
      });

      if (visitante) {
        await visitante.registrarRespuesta(aceptado);
      }

      reporte.estatus = aceptado ? 'aceptado' : 'rechazado';
      reporte.autorizadoPor = autorizadoPor;
      reporte.autorizadoPorId = autorizadoPorId;
      reporte.fechaAutorizacion = new Date();

      await reporte.save();

      return reporte;
    } catch (error) {
      console.error('Error al responder reporte:', error.message);
      throw error;
    }
  }

  async obtenerHistorialCompleto(fraccId, numeroCasa, days = 30) {
    try {
      const reportesCassandra = await cassandraService.obtenerReportesPorCasa(
        fraccId,
        numeroCasa,
        days,
        100
      );

      return reportesCassandra;
    } catch (error) {
      console.error('Error al obtener historial completo:', error.message);
      return [];
    }
  }

  async obtenerReportesPendientes(fraccId, numeroCasa) {
    try {
      const resultados = await visitanteSearchService.buscarSimilares(
        '',
        '',
        fraccId,
        50
      );

      return resultados.filter(r =>
        r.estatus === 'pendiente' && r.numeroCasa === numeroCasa
      );
    } catch (error) {
      console.error('Error al obtener reportes pendientes:', error.message);
      return [];
    }
  }

  async obtenerEstadisticasVisitante(fraccId, nombre) {
    try {
      const visitante = await Visitante.findOne({
        fraccId,
        nombreNormalizado: nombre.toLowerCase().trim()
      });

      if (!visitante) {
        return null;
      }

      return {
        nombre: visitante.nombre,
        totalVisitas: visitante.totalVisitas,
        visitasAceptadas: visitante.visitasAceptadas,
        visitasRechazadas: visitante.visitasRechazadas,
        casasVisitadas: visitante.casasVisitadas,
        motivosFrecuentes: visitante.motivosFrecuentes,
        primeraVisita: visitante.primeraVisita,
        ultimaVisita: visitante.ultimaVisita,
        tasaAceptacion: visitante.totalVisitas > 0
          ? (visitante.visitasAceptadas / visitante.totalVisitas * 100).toFixed(1)
          : 0
      };
    } catch (error) {
      console.error('Error al obtener estadisticas de visitante:', error.message);
      return null;
    }
  }
}

module.exports = new ReporteOrchestratorService();
