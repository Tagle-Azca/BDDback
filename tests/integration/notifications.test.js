const APIClient = require('../helpers/api-client');
const testData = require('../helpers/test-data');

const apiClient = new APIClient();
const NOTIFICATIONS_BASE = '/api/notifications';

class NotificationsTestSuite {
  constructor() {
    this.results = [];
  }

  async runAll() {
    console.log('Iniciando tests de Notificaciones...\n');

    await this.testGetPendingNotifications();

    this.printResults();
    return this.results;
  }

  async testGetPendingNotifications() {
    const testName = 'Get Pending Notifications';
    try {
      const { fraccId, house } = testData.users.validUser;
      const response = await apiClient.get(`${NOTIFICATIONS_BASE}/pending/${fraccId}/${house}`);

      if (response.success && response.data.success !== undefined) {
        this.logSuccess(testName, {
          total: response.data.total,
          hasNotifications: response.data.notificaciones?.length > 0
        });
      } else {
        this.logFailure(testName, 'Failed to get pending notifications', response);
      }
    } catch (error) {
      this.logFailure(testName, error.message);
    }
  }

  logSuccess(testName, data) {
    console.log(`PASS: ${testName}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
    this.results.push({ test: testName, status: 'PASSED', data });
  }

  logFailure(testName, reason, data = null) {
    console.log(`FAIL: ${testName}`);
    console.log(`   Reason: ${reason}`);
    if (data) console.log(`   Data:`, JSON.stringify(data, null, 2));
    this.results.push({ test: testName, status: 'FAILED', reason, data });
  }

  printResults() {
    console.log('\n' + '='.repeat(50));
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;

    console.log(`Resultados: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50) + '\n');
  }
}

async function runTests() {
  const suite = new NotificationsTestSuite();
  await suite.runAll();
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = NotificationsTestSuite;
