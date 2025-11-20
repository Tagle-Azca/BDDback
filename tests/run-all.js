const AnalyticsTestSuite = require('./integration/analytics.test');
const NotificationsTestSuite = require('./integration/notifications.test');

class TestRunner {
  constructor() {
    this.suites = [
      { name: 'Analytics', Suite: AnalyticsTestSuite },
      { name: 'Notifications', Suite: NotificationsTestSuite }
    ];
    this.allResults = [];
  }

  async runAllSuites() {
    console.log('Iniciando suite completa de tests...');
    console.log(`Fecha: ${new Date().toLocaleString()}\n`);
    console.log('IMPORTANTE: Verifica que el servidor esté corriendo (npm start)');
    console.log('='.repeat(60) + '\n');

    for (const { name, Suite } of this.suites) {
      console.log(`\nSuite: ${name}`);
      console.log('-'.repeat(60));

      const suite = new Suite();
      const results = await suite.runAll();

      this.allResults.push({ suite: name, results });

      await this.wait(1000);
    }

    this.printFinalSummary();
  }

  printFinalSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('RESUMEN FINAL DE TESTS');
    console.log('='.repeat(60) + '\n');

    let totalPassed = 0;
    let totalFailed = 0;

    this.allResults.forEach(({ suite, results }) => {
      const passed = results.filter(r => r.status === 'PASSED').length;
      const failed = results.filter(r => r.status === 'FAILED').length;

      totalPassed += passed;
      totalFailed += failed;

      const icon = failed === 0 ? '[PASS]' : '[WARN]';
      console.log(`${icon} ${suite}: ${passed} passed, ${failed} failed`);
    });

    console.log('\n' + '-'.repeat(60));
    console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);

    if (totalFailed === 0) {
      console.log('\nTodos los tests pasaron exitosamente!');
    } else {
      console.log(`\n${totalFailed} tests fallaron. Revisar logs arriba.`);
    }

    console.log('='.repeat(60) + '\n');
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const runner = new TestRunner();
  await runner.runAllSuites();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error ejecutando tests:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;
