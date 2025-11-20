# Sistema de Tests - IngresosBackend

Sistema profesional de testing para el backend de Ingresos.

## Estructura

```
tests/
├── helpers/           # Utilidades para tests
│   ├── api-client.js # Cliente HTTP para tests
│   └── test-data.js  # Datos de prueba
├── integration/       # Tests de integración
│   ├── analytics.test.js
│   └── notifications.test.js
├── unit/             # Tests unitarios (futuro)
├── e2e/              # Tests end-to-end (futuro)
└── run-all.js        # Runner principal
```

## Uso

### IMPORTANTE: Iniciar el servidor primero

Los tests hacen peticiones HTTP reales, por lo que necesitas tener el servidor corriendo:

```bash
# En una terminal, inicia el servidor
npm start

# En otra terminal, ejecuta los tests
node tests/run-all.js
```

### Ejecutar todos los tests
```bash
node tests/run-all.js
```

### Ejecutar tests específicos

**Analytics:**
```bash
node tests/integration/analytics.test.js
```

**Notifications:**
```bash
node tests/integration/notifications.test.js
```

## Configuración

Los tests usan variables de entorno para determinar el servidor:

- **Desarrollo**: `http://localhost:5002`
- **Producción**: `https://ingresosbackend.onrender.com`

Puedes configurar URLs personalizadas:

```bash
export API_URL_DEV=http://localhost:3000
export API_URL_PROD=https://tu-servidor.com
```

## Agregar Nuevos Tests

### 1. Crear un nuevo test suite

```javascript
// tests/integration/mi-modulo.test.js
const APIClient = require('../helpers/api-client');

class MiModuloTestSuite {
  constructor() {
    this.results = [];
  }

  async runAll() {
    console.log('Iniciando tests de Mi Módulo...\n');

    await this.testAlgo();

    this.printResults();
    return this.results;
  }

  async testAlgo() {
    const testName = 'Test de algo';
    try {
      // Tu lógica de test aquí
      this.logSuccess(testName, data);
    } catch (error) {
      this.logFailure(testName, error.message);
    }
  }

  logSuccess(testName, data) {
    console.log(`PASS: ${testName}`);
    this.results.push({ test: testName, status: 'PASSED', data });
  }

  logFailure(testName, reason, data = null) {
    console.log(`FAIL: ${testName} - ${reason}`);
    this.results.push({ test: testName, status: 'FAILED', reason, data });
  }

  printResults() {
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    console.log(`\nResultados: ${passed} passed, ${failed} failed\n`);
  }
}

module.exports = MiModuloTestSuite;
```

### 2. Registrarlo en run-all.js

```javascript
const MiModuloTestSuite = require('./integration/mi-modulo.test');

// Agregar a this.suites:
{ name: 'MiModulo', Suite: MiModuloTestSuite }
```

## Datos de Prueba

Edita `helpers/test-data.js` para agregar datos de prueba:

```javascript
module.exports = {
  miModulo: {
    datoPrueba: {
      campo1: 'valor1',
      campo2: 'valor2'
    }
  }
};
```

## Mejores Prácticas

1. **Tests independientes**: Cada test debe poder ejecutarse solo
2. **Datos reales**: Usa IDs y datos que existan en tu DB de desarrollo
3. **Limpieza**: Si creas datos, límpialos al finalizar
4. **Nombres descriptivos**: Usa nombres claros para los tests
5. **Manejo de errores**: Siempre usa try/catch

## Debugging

Para ver más detalles en caso de fallos:

```javascript
// En tu test
if (data) console.log('   Data:', JSON.stringify(data, null, 2));
```

## Roadmap

- [ ] Tests unitarios para servicios
- [ ] Tests de middleware
- [ ] Tests de validación
- [ ] Coverage reports
- [ ] CI/CD integration
- [ ] Performance tests
