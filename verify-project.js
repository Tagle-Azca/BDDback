const fs = require('fs');
const path = require('path');

console.log('Verificando estructura del proyecto...\n');

const checks = [
  {
    name: 'Archivos eliminados correctamente',
    items: [
      '!config/api.js',
      '!config/database.js',
      '!socket/socketHandler.js',
      '!controllers/notifications.controller.js'
    ]
  },
  {
    name: 'Nuevos servicios creados',
    items: [
      'services/analytics.service.js',
      'services/notification.service.js'
    ]
  },
  {
    name: 'Estructura de tests',
    items: [
      'tests/README.md',
      'tests/run-all.js',
      'tests/helpers/api-client.js',
      'tests/helpers/test-data.js',
      'tests/integration/analytics.test.js',
      'tests/integration/notifications.test.js'
    ]
  },
  {
    name: 'Controladores refactorizados',
    items: [
      'controllers/analytics.controller.js',
      'controllers/notification.controller.js',
      'controllers/player-registry.controller.js'
    ]
  },
  {
    name: 'Documentación',
    items: [
      'PROJECT-STRUCTURE.md',
      'tests/README.md'
    ]
  }
];

let allPassed = true;

checks.forEach(({ name, items }) => {
  console.log(`\n${name}`);
  console.log('-'.repeat(60));

  items.forEach(item => {
    const shouldNotExist = item.startsWith('!');
    const filePath = shouldNotExist ? item.substring(1) : item;
    const fullPath = path.join(__dirname, filePath);
    const exists = fs.existsSync(fullPath);

    if (shouldNotExist) {
      if (!exists) {
        console.log(`  [PASS] ${filePath} (correctamente eliminado)`);
      } else {
        console.log(`  [FAIL] ${filePath} (debería estar eliminado)`);
        allPassed = false;
      }
    } else {
      if (exists) {
        const stats = fs.statSync(fullPath);
        const size = stats.isDirectory() ? 'DIR' : `${stats.size} bytes`;
        console.log(`  [PASS] ${filePath} (${size})`);
      } else {
        console.log(`  [FAIL] ${filePath} (no encontrado)`);
        allPassed = false;
      }
    }
  });
});

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('Todas las verificaciones pasaron correctamente!');
  console.log('\nEl proyecto está listo para usar.');
  console.log('\nPróximos pasos:');
  console.log('  1. Ejecutar tests: node tests/run-all.js');
  console.log('  2. Iniciar servidor: npm start');
  console.log('  3. Revisar: PROJECT-STRUCTURE.md');
} else {
  console.log('Algunas verificaciones fallaron. Revisar arriba.');
}

console.log('='.repeat(60) + '\n');
