const APIClient = require('../helpers/api-client');
const testData = require('../helpers/test-data');

const apiClient = new APIClient();
const ANALYTICS_BASE = '/api/analytics';

class AnalyticsTestSuite {
  constructor() {
    this.results = [];
  }

  async runAll() {
    console.log('Iniciando tests de Analytics...\n');

    await this.testHealthCheck();
    await this.testSingleEvent();
    await this.testBatchEvents();
    await this.wait(2000);
    await this.testGetUserStats();
    await this.testGetFraccionamientoStats();

    this.printResults();
    return this.results;
  }

  async testHealthCheck() {
    const testName = 'Health Check';
    try {
      const response = await apiClient.get(`${ANALYTICS_BASE}/health`);

      if (response.success && response.data.status === 'ok') {
        this.logSuccess(testName, response.data);
      } else {
        this.logFailure(testName, 'Invalid health check response', response);
      }
    } catch (error) {
      this.logFailure(testName, error.message);
    }
  }

  async testSingleEvent() {
    const testName = 'Single Event Tracking';
    try {
      const response = await apiClient.post(`${ANALYTICS_BASE}/track`, testData.analytics.singleEvent);

      if (response.success && response.data.success && response.data.eventId) {
        this.logSuccess(testName, response.data);
      } else {
        this.logFailure(testName, 'Event tracking failed', response);
      }
    } catch (error) {
      this.logFailure(testName, error.message);
    }
  }

  async testBatchEvents() {
    const testName = 'Batch Event Tracking';
    try {
      const response = await apiClient.post(`${ANALYTICS_BASE}/batch`, {
        events: testData.analytics.batchEvents
      });

      if (response.success && response.data.success && response.data.trackedCount === 3) {
        this.logSuccess(testName, response.data);
      } else {
        this.logFailure(testName, 'Batch tracking failed or incorrect count', response);
      }
    } catch (error) {
      this.logFailure(testName, error.message);
    }
  }

  async testGetUserStats() {
    const testName = 'Get User Statistics';
    try {
      const userId = testData.users.validUser.userId;
      const response = await apiClient.get(`${ANALYTICS_BASE}/stats/${userId}`, { days: 7 });

      if (response.success && response.data.success && response.data.data) {
        this.logSuccess(testName, {
          totalEvents: response.data.data.totalEvents,
          periodDays: response.data.data.periodDays
        });
      } else {
        this.logFailure(testName, 'Failed to get user stats', response);
      }
    } catch (error) {
      this.logFailure(testName, error.message);
    }
  }

  async testGetFraccionamientoStats() {
    const testName = 'Get Fraccionamiento Statistics';
    try {
      const fraccId = testData.users.validUser.fraccId;
      const response = await apiClient.get(`${ANALYTICS_BASE}/fraccionamiento/${fraccId}/stats`, { days: 7 });

      if (response.success && response.data.success && response.data.data) {
        this.logSuccess(testName, {
          activeUsers: response.data.data.activeUsers,
          periodDays: response.data.data.periodDays
        });
      } else {
        this.logFailure(testName, 'Failed to get fraccionamiento stats', response);
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

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
  const suite = new AnalyticsTestSuite();
  await suite.runAll();
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = AnalyticsTestSuite;
