/**
 * 🗄️ INICIALIZAR DATOS DE PRUEBA
 *
 * Crea un fraccionamiento con casas y residentes de prueba
 * para poder probar el sistema
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function inicializarDatos() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   🗄️  INICIALIZANDO DATOS DE PRUEBA                      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Conectar a MongoDB
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado\n');

    const Fraccionamiento = require('./models/fraccionamiento.model');
    const bcrypt = require('bcryptjs');

    // Verificar si ya hay fraccionamientos
    const existente = await Fraccionamiento.findOne();
    if (existente) {
      console.log('⚠️  Ya existen fraccionamientos en la base de datos');
      console.log(`   Fraccionamiento: ${existente.nombre}`);
      console.log(`   Total de casas: ${existente.residencias.length}\n`);

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const respuesta = await new Promise(resolve => {
        rl.question('¿Quieres crear otro fraccionamiento de prueba? (s/n): ', resolve);
      });
      rl.close();

      if (respuesta.toLowerCase() !== 's') {
        console.log('\n✅ Usando datos existentes');
        await mongoose.disconnect();
        return;
      }
    }

    console.log('🏗️  Creando fraccionamiento de prueba...\n');

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Crear fraccionamiento
    const fraccionamiento = new Fraccionamiento({
      nombre: 'Residencial Los Pinos',
      direccion: 'Av. Principal 123, Ciudad',
      usuario: 'admin',
      correo: 'admin@lospinos.com',
      contrasena: hashedPassword,
      telefono: '5551234567',
      estado: 'activo',
      puerta: true,
      primerLogin: false,
      residencias: [
        {
          numero: '101',
          tipo: 'Casa',
          activa: true,
          residentes: [
            {
              nombre: 'María González',
              activo: true,
              playerId: 'player_maria_001'
            },
            {
              nombre: 'Carlos González',
              activo: true,
              playerId: 'player_carlos_001'
            }
          ]
        },
        {
          numero: '102',
          tipo: 'Casa',
          activa: true,
          residentes: [
            {
              nombre: 'Ana Martínez',
              activo: true,
              playerId: 'player_ana_001'
            }
          ]
        },
        {
          numero: '103',
          tipo: 'Casa',
          activa: true,
          residentes: [
            {
              nombre: 'Roberto Sánchez',
              activo: true,
              playerId: 'player_roberto_001'
            },
            {
              nombre: 'Laura Sánchez',
              activo: true,
              playerId: 'player_laura_001'
            }
          ]
        },
        {
          numero: '104',
          tipo: 'Casa',
          activa: true,
          residentes: []
        },
        {
          numero: '105',
          tipo: 'Casa',
          activa: true,
          residentes: [
            {
              nombre: 'Pedro Ramírez',
              activo: true,
              playerId: 'player_pedro_001'
            }
          ]
        }
      ]
    });

    await fraccionamiento.save();

    console.log('✅ Fraccionamiento creado exitosamente\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 INFORMACIÓN DEL FRACCIONAMIENTO:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`   ID: ${fraccionamiento._id}`);
    console.log(`   Nombre: ${fraccionamiento.nombre}`);
    console.log(`   Dirección: ${fraccionamiento.direccion}`);
    console.log(`   Usuario: ${fraccionamiento.usuario}`);
    console.log(`   Contraseña: admin123 (para login)`);
    console.log(`   Total de casas: ${fraccionamiento.residencias.length}\n`);

    console.log('🏠 CASAS:');
    fraccionamiento.residencias.forEach(casa => {
      console.log(`   - Casa ${casa.numero}: ${casa.residentes.length} residente(s)`);
      casa.residentes.forEach(r => {
        console.log(`     • ${r.nombre}`);
      });
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎉 ¡DATOS INICIALIZADOS CORRECTAMENTE!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📝 PRÓXIMOS PASOS:\n');
    console.log('1. Prueba el sistema:');
    console.log('   node cli.js test\n');
    console.log('2. Simula un visitante:');
    console.log('   node cli.js visitante\n');
    console.log('3. Accede al frontend:');
    console.log(`   http://localhost:3001/reportes/${fraccionamiento._id}\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB\n');
  }
}

inicializarDatos();
