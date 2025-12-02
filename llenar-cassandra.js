#!/usr/bin/env node
/**
 * 📊 LLENAR CASSANDRA CON DATOS DE PRUEBA
 *
 * Crea múltiples reportes para poblar las 3 bases de datos
 */

require('dotenv').config();
const mongoose = require('mongoose');

const visitantes = [
  { nombre: 'Juan Pérez', motivo: 'Entrega de paquete', casa: '101' },
  { nombre: 'María García', motivo: 'Visita familiar', casa: '102' },
  { nombre: 'Carlos López', motivo: 'Plomero - Reparación urgente', casa: '103' },
  { nombre: 'Ana Martínez', motivo: 'Servicio de limpieza', casa: '101' },
  { nombre: 'Roberto Sánchez', motivo: 'Entrega de comida', casa: '104' },
  { nombre: 'Laura Torres', motivo: 'Visita de amistad', casa: '105' },
  { nombre: 'Pedro Ramírez', motivo: 'Técnico de internet', casa: '102' },
  { nombre: 'Sofía Hernández', motivo: 'Visita familiar', casa: '103' },
  { nombre: 'Diego Flores', motivo: 'Electricista - Mantenimiento', casa: '101' },
  { nombre: 'Valentina Cruz', motivo: 'Entrega de paquete', casa: '105' },
  { nombre: 'Andrés Morales', motivo: 'Jardinero', casa: '104' },
  { nombre: 'Camila Rojas', motivo: 'Visita de negocios', casa: '102' },
  { nombre: 'Javier Mendoza', motivo: 'Delivery de gas', casa: '103' },
  { nombre: 'Daniela Vargas', motivo: 'Visita familiar', casa: '101' },
  { nombre: 'Fernando Castillo', motivo: 'Repartidor de agua', casa: '105' }
];

async function llenarCassandra() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   📊 LLENANDO CASSANDRA CON DATOS DE PRUEBA             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado\n');

    // Inicializar servicios
    const cassandraService = require('./services/cassandra.service');
    const visitanteSearchService = require('./services/visitante-search.service');

    await cassandraService.init();
    await visitanteSearchService.init();

    const Reporte = require('./models/reporte.model');
    const Fraccionamiento = require('./models/fraccionamiento.model');

    // Obtener el fraccionamiento
    const fracc = await Fraccionamiento.findOne();
    if (!fracc) {
      console.log('❌ No hay fraccionamientos. Ejecuta primero: node inicializar-datos.js');
      process.exit(1);
    }

    console.log(`🏘️  Fraccionamiento: ${fracc.nombre}`);
    console.log(`   ID: ${fracc._id}\n`);

    console.log('🔄 Creando reportes de visitantes...\n');

    let creados = 0;
    let errores = 0;

    for (let i = 0; i < visitantes.length; i++) {
      const v = visitantes[i];

      try {
        // Crear reportes en diferentes momentos del pasado
        const diasAtras = Math.floor(Math.random() * 30); // Últimos 30 días
        const horasAtras = Math.floor(Math.random() * 24);
        const fechaReporte = new Date();
        fechaReporte.setDate(fechaReporte.getDate() - diasAtras);
        fechaReporte.setHours(fechaReporte.getHours() - horasAtras);

        const estatuses = ['aceptado', 'rechazado', 'pendiente'];
        const estatus = estatuses[Math.floor(Math.random() * estatuses.length)];

        const reporte = new Reporte({
          fraccId: fracc._id,
          numeroCasa: v.casa,
          nombre: v.nombre,
          motivo: v.motivo,
          tiempo: fechaReporte,
          estatus: estatus,
          autorizadoPor: estatus !== 'pendiente' ? 'Admin Sistema' : '',
          fechaAutorizacion: estatus !== 'pendiente' ? fechaReporte : null
        });

        await reporte.save();

        console.log(`${i + 1}. ✅ ${v.nombre} → Casa ${v.casa} (${estatus})`);
        console.log(`   Fecha: ${fechaReporte.toLocaleString('es-MX')}`);
        creados++;

        // Esperar un poco para no saturar
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.log(`${i + 1}. ❌ Error: ${v.nombre} - ${error.message}`);
        errores++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   ✅ Reportes creados: ${creados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📦 Total: ${visitantes.length}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🔍 VERIFICANDO EN LAS 3 BASES DE DATOS:\n');

    // Verificar MongoDB
    const totalMongo = await Reporte.countDocuments();
    console.log(`   MongoDB: ${totalMongo} reportes`);

    // Verificar Cassandra
    if (cassandraService.isReady()) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

      const reportesCassandra = await cassandraService.obtenerReportesPorFraccionamiento(
        fracc._id.toString(),
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        100
      );
      console.log(`   Cassandra: ${reportesCassandra.length} reportes`);
    } else {
      console.log(`   Cassandra: No disponible`);
    }

    // Verificar ChromaDB
    const Visitante = require('./models/visitante.model');
    const totalVisitantes = await Visitante.countDocuments();
    console.log(`   ChromaDB: ${totalVisitantes} visitantes únicos\n`);

    console.log('✅ DATOS CARGADOS EXITOSAMENTE!\n');
    console.log('📝 PRÓXIMOS PASOS:\n');
    console.log('1. Verifica los datos:');
    console.log('   node cli.js stats\n');
    console.log('2. Lista los reportes:');
    console.log('   node cli.js listar\n');
    console.log('3. Accede al frontend para ver los datos de Cassandra:');
    console.log(`   http://localhost:3000/reportes/${fracc._id}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB\n');
  }
}

llenarCassandra();
