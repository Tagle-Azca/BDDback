#!/usr/bin/env node
/**
 * 🖥️  CLI PRINCIPAL - SISTEMA DE VISITANTES
 *
 * Comandos disponibles:
 *   node cli.js visitante       - Simular llegada de visitante
 *   node cli.js listar          - Ver reportes recientes
 *   node cli.js stats           - Ver estadísticas
 *   node cli.js test            - Probar 3 bases de datos
 */

require('dotenv').config();
const mongoose = require('mongoose');

const comando = process.argv[2];

async function conectar() {
  await mongoose.connect(process.env.MONGO_URI);
  const cassandraService = require('./services/cassandra.service');
  const visitanteSearchService = require('./services/visitante-search.service');
  await cassandraService.init();
  await visitanteSearchService.init();
}

async function simularVisitante() {
  await conectar();

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function pregunta(texto) {
    return new Promise((resolve) => {
      rl.question(texto, resolve);
    });
  }

  console.log('\nSIMULADOR DE VISITANTE\n');

  const nombre = await pregunta('Nombre del visitante: ');
  const numeroCasa = await pregunta('Numero de casa a visitar: ');
  const motivo = await pregunta('Motivo de la visita: ');

  const Reporte = require('./models/reporte.model');

  const reporte = new Reporte({
    nombre,
    numeroCasa: parseInt(numeroCasa),
    motivo,
    estatus: 'pendiente',
    tiempo: new Date()
  });

  await reporte.save();

  console.log(`\nVisitante registrado: ${nombre}`);
  console.log(`Destino: Casa ${numeroCasa}`);
  console.log(`Motivo: ${motivo}`);
  console.log(`Estatus: Pendiente de aprobacion\n`);

  rl.close();
  await mongoose.disconnect();
}

async function listarReportes() {
  await conectar();

  const Reporte = require('./models/reporte.model');
  const reportes = await Reporte.find()
    .sort({ tiempo: -1 })
    .limit(10);

  console.log('\n📋 ÚLTIMOS 10 REPORTES:\n');

  if (reportes.length === 0) {
    console.log('   No hay reportes');
    return;
  }

  reportes.forEach((r, i) => {
    const fecha = new Date(r.tiempo).toLocaleString('es-MX');
    const estatus = r.estatus === 'aceptado' ? '✅' :
                    r.estatus === 'rechazado' ? '❌' :
                    r.estatus === 'pendiente' ? '⏳' : '⚠️';

    console.log(`${i + 1}. ${estatus} ${r.nombre} → Casa ${r.numeroCasa}`);
    console.log(`   ${r.motivo}`);
    console.log(`   ${fecha}`);
    console.log('');
  });

  await mongoose.disconnect();
}

async function verEstadisticas() {
  await conectar();

  const Visitante = require('./models/visitante.model');
  const Reporte = require('./models/reporte.model');

  console.log('\n📊 ESTADÍSTICAS DEL SISTEMA:\n');

  // MongoDB
  const totalVisitantes = await Visitante.countDocuments();
  const totalReportes = await Reporte.countDocuments();
  const pendientes = await Reporte.countDocuments({ estatus: 'pendiente' });
  const aceptados = await Reporte.countDocuments({ estatus: 'aceptado' });
  const rechazados = await Reporte.countDocuments({ estatus: 'rechazado' });

  console.log('MongoDB (Datos actuales):');
  console.log(`   Visitantes únicos: ${totalVisitantes}`);
  console.log(`   Total reportes: ${totalReportes}`);
  console.log(`   Pendientes: ${pendientes}`);
  console.log(`   Aceptados: ${aceptados}`);
  console.log(`   Rechazados: ${rechazados}`);

  // Cassandra
  const cassandraService = require('./services/cassandra.service');
  if (cassandraService.isReady()) {
    console.log('\n✅ Cassandra: Conectado (historial completo)');
  } else {
    console.log('\n❌ Cassandra: Desconectado');
  }

  // ChromaDB
  const visitanteSearchService = require('./services/visitante-search.service');
  if (visitanteSearchService.isReady()) {
    console.log('✅ ChromaDB: Conectado (búsqueda semántica)');
  } else {
    console.log('❌ ChromaDB: Desconectado');
  }

  // Top visitantes
  const topVisitantes = await Visitante.find()
    .sort({ totalVisitas: -1 })
    .limit(5);

  if (topVisitantes.length > 0) {
    console.log('\n🏆 TOP 5 VISITANTES FRECUENTES:');
    topVisitantes.forEach((v, i) => {
      const tasa = (v.visitasAceptadas / v.totalVisitas * 100).toFixed(0);
      console.log(`   ${i + 1}. ${v.nombre}: ${v.totalVisitas} visitas (${tasa}% aceptadas)`);
    });
  }

  console.log('');
  await mongoose.disconnect();
}

async function probarSistema() {
  console.log('\nProbando conexion a las 3 bases de datos...\n');

  // MongoDB
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB:     OK');
    await mongoose.disconnect();
  } catch (error) {
    console.log('MongoDB:     ERROR -', error.message);
  }

  // Cassandra
  try {
    const cassandraService = require('./services/cassandra.service');
    await cassandraService.init();
    if (cassandraService.isReady()) {
      console.log('Cassandra:   OK');
    } else {
      console.log('Cassandra:   ERROR - No se pudo conectar');
    }
  } catch (error) {
    console.log('Cassandra:   ERROR -', error.message);
  }

  // ChromaDB
  try {
    const visitanteSearchService = require('./services/visitante-search.service');
    await visitanteSearchService.init();
    if (visitanteSearchService.isReady()) {
      console.log('ChromaDB:    OK');
    } else {
      console.log('ChromaDB:    ERROR - No se pudo conectar');
    }
  } catch (error) {
    console.log('ChromaDB:    ERROR -', error.message);
  }

  console.log('');
}

async function mostrarAyuda() {
  console.log('\n🖥️  CLI - SISTEMA DE VISITANTES\n');
  console.log('Comandos disponibles:\n');
  console.log('  node cli.js visitante    - Simular llegada de visitante');
  console.log('  node cli.js listar       - Ver reportes recientes');
  console.log('  node cli.js stats        - Ver estadísticas del sistema');
  console.log('  node cli.js test         - Probar las 3 bases de datos');
  console.log('  node cli.js help         - Mostrar esta ayuda');
  console.log('');
}

// Ejecutar comando
(async () => {
  try {
    switch (comando) {
      case 'visitante':
        await simularVisitante();
        break;

      case 'listar':
        await listarReportes();
        break;

      case 'stats':
        await verEstadisticas();
        break;

      case 'test':
        await probarSistema();
        break;

      case 'help':
      case undefined:
        await mostrarAyuda();
        break;

      default:
        console.log(`❌ Comando desconocido: ${comando}`);
        await mostrarAyuda();
        process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
