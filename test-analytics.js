// Script de prueba para el sistema de analytics
//
// MODO DESARROLLO (localhost):
// node test-analytics.js
//
// MODO PRODUCCIÓN (Render):
// NODE_ENV=production node test-analytics.js

const axios = require('axios');

// Configuración
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://ingresosbackend.onrender.com'
  : 'http://localhost:5002';
const ANALYTICS_URL = `${BASE_URL}/api/analytics`;

console.log(`🌐 Usando servidor: ${BASE_URL}`);

// Datos de prueba
const testData = {
  userId: '68d41e9ad9b7f5d456400283',
  fraccId: '685417c35764cd581a84a2c9',
  house: '104'
};

// Función para probar un evento individual
async function testSingleEvent() {
  try {
    console.log('\nProbando evento individual...');

    const response = await axios.post(`${ANALYTICS_URL}/track`, {
      event: 'app_open',
      properties: {
        user_id: testData.userId,
        fracc_id: testData.fraccId,
        house: testData.house,
        app_version: '1.6.6+11',
        platform: 'ios',
        device_timestamp: new Date().toISOString()
      }
    });

    console.log('Evento enviado:', response.data);
  } catch (error) {
    console.error('Error enviando evento:', error.response?.data || error.message);
  }
}

// Función para probar múltiples eventos (batch)
async function testBatchEvents() {
  try {
    console.log('\nProbando batch de eventos...');

    const events = [
      {
        event: 'screen_view',
        properties: {
          user_id: testData.userId,
          fracc_id: testData.fraccId,
          house: testData.house,
          screen_name: 'home_page',
          platform: 'ios'
        }
      },
      {
        event: 'qr_scan',
        properties: {
          user_id: testData.userId,
          fracc_id: testData.fraccId,
          house: testData.house,
          success: true,
          result_type: 'access_qr',
          platform: 'ios'
        }
      },
      {
        event: 'door_access',
        properties: {
          user_id: testData.userId,
          fracc_id: testData.fraccId,
          house: testData.house,
          authorized: true,
          method: 'qr',
          platform: 'ios'
        }
      }
    ];

    const response = await axios.post(`${ANALYTICS_URL}/batch`, { events });
    console.log('Batch enviado:', response.data);
  } catch (error) {
    console.error('Error enviando batch:', error.response?.data || error.message);
  }
}

async function testGetStats() {
  try {
    console.log('\nProbando obtención de estadísticas...');

    const response = await axios.get(`${ANALYTICS_URL}/stats/${testData.userId}?days=7`);
    console.log('Estadísticas obtenidas:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error.response?.data || error.message);
  }
}

async function testHealthCheck() {
  try {
    console.log('\nProbando health check...');

    const response = await axios.get(`${ANALYTICS_URL}/health`);
    console.log('Health check:', response.data);
  } catch (error) {
    console.error('Error en health check:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando pruebas del sistema de analytics...');
  console.log(`📍 Servidor objetivo: ${BASE_URL}`);

  await testHealthCheck();
  await testSingleEvent();
  await testBatchEvents();

  console.log('\n⏳ Esperando 2 segundos...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  await testGetStats();

  console.log('\nPruebas completadas!');
}

if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testSingleEvent,
  testBatchEvents,
  testGetStats,
  testHealthCheck,
  runAllTests
};