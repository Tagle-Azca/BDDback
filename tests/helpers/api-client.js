const axios = require('axios');

class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL || this.getBaseURL();
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  getBaseURL() {
    return process.env.NODE_ENV === 'production'
      ? process.env.API_URL_PROD || 'https://ingresosbackend.onrender.com'
      : process.env.API_URL_DEV || 'http://localhost:5002';
  }

  async get(endpoint, params = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async post(endpoint, data = {}) {
    try {
      const response = await this.client.post(endpoint, data);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async put(endpoint, data = {}) {
    try {
      const response = await this.client.put(endpoint, data);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return this.handleError(error);
    }
  }

  async delete(endpoint) {
    try {
      const response = await this.client.delete(endpoint);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      return {
        success: false,
        error: error.response.data,
        status: error.response.status,
        message: error.response.data.message || error.response.data.error
      };
    } else if (error.request) {
      return {
        success: false,
        error: 'No response from server',
        message: 'Network error or server is down'
      };
    } else {
      return {
        success: false,
        error: error.message,
        message: error.message
      };
    }
  }

  setAuthToken(token) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    delete this.client.defaults.headers.common['Authorization'];
  }
}

module.exports = APIClient;
