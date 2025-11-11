const Fraccionamiento = require("../models/fraccionamiento.model");

/**
 * Abre la puerta de un fraccionamiento por 10 segundos
 * @param {string} fraccId - ID del fraccionamiento
 */
async function abrirPuertaTemporalmente(fraccId) {
  try {
    await Fraccionamiento.updateOne(
      { _id: fraccId },
      { $set: { puerta: true } }
    );

    // Cerrar la puerta después de 10 segundos
    setTimeout(async () => {
      try {
        await Fraccionamiento.updateOne(
          { _id: fraccId },
          { $set: { puerta: false } }
        );
        console.log(`Puerta del fraccionamiento ${fraccId} cerrada automáticamente`);
      } catch (error) {
        console.error('Error cerrando puerta:', error);
      }
    }, 10000);

    return true;
  } catch (error) {
    console.error('Error abriendo puerta temporalmente:', error);
    throw error;
  }
}

/**
 * Abre la puerta de un fraccionamiento
 * @param {string} fraccId - ID del fraccionamiento
 */
async function abrirPuerta(fraccId) {
  try {
    await Fraccionamiento.updateOne(
      { _id: fraccId },
      { $set: { puerta: true } }
    );
    return true;
  } catch (error) {
    console.error('Error abriendo puerta:', error);
    throw error;
  }
}

/**
 * Cierra la puerta de un fraccionamiento
 * @param {string} fraccId - ID del fraccionamiento
 */
async function cerrarPuerta(fraccId) {
  try {
    await Fraccionamiento.updateOne(
      { _id: fraccId },
      { $set: { puerta: false } }
    );
    return true;
  } catch (error) {
    console.error('Error cerrando puerta:', error);
    throw error;
  }
}

module.exports = {
  abrirPuertaTemporalmente,
  abrirPuerta,
  cerrarPuerta
};
