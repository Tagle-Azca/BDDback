const https = require('https');
const http = require('http');

class KeepAliveService {
  constructor() {
    this.interval = null;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  start() {
    if (!this.isProduction) {
      console.log('Keep-alive: Desactivado en desarrollo');
      return;
    }

    const backendUrl = process.env.RENDER_EXTERNAL_URL || process.env.API_BASE_URL || 'https://ingresosbackend.onrender.com';

    console.log('Keep-alive: Iniciando servicio...');
    console.log(`  URL: ${backendUrl}`);
    console.log(`  Intervalo: cada 13 minutos`);

    this.interval = setInterval(() => {
      this.ping(backendUrl);
    }, 13 * 60 * 1000);

    setTimeout(() => this.ping(backendUrl), 5000);
  }

  ping(url) {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: '/health',
      method: 'GET',
      timeout: 10000
    };

    const req = protocol.request(options, (res) => {
      if (res.statusCode === 200) {
        console.log(`Keep-alive: Ping exitoso (${res.statusCode})`);
      } else {
        console.log(`Keep-alive: Respuesta ${res.statusCode}`);
      }
    });

    req.on('error', (error) => {
      console.log(`Keep-alive: Error - ${error.message}`);
    });

    req.on('timeout', () => {
      console.log(`Keep-alive: Timeout`);
      req.destroy();
    });

    req.end();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Keep-alive: Servicio detenido');
    }
  }
}

module.exports = new KeepAliveService();
