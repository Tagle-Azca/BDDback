const AnalyticsTestSuite = require('./tests/integration/analytics.test');

console.log('DEPRECADO: Este archivo será eliminado en futuras versiones.');
console.log('   Por favor usa: node tests/integration/analytics.test.js');
console.log('   O mejor aún: node tests/run-all.js\n');
console.log('IMPORTANTE: Asegúrate de que el servidor esté corriendo (npm start)\n');

async function runLegacyTests() {
  const suite = new AnalyticsTestSuite();
  await suite.runAll();
}

if (require.main === module) {
  runLegacyTests().catch(console.error);
}

module.exports = runLegacyTests;
