const axios = require("axios");
const Fraccionamiento = require("../models/fraccionamiento");

const enviarNotificacionVisita = async (fraccId, residencia, nombre, motivo, foto) => {
  console.log('🚀 enviarNotificacionVisita - Inicio');
  console.log('   fraccId:', fraccId);
  console.log('   residencia:', residencia);
  console.log('   nombre:', nombre);
  console.log('   motivo:', motivo);

  try {
    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) {
      console.log('   ❌ Fraccionamiento no encontrado');
      return { success: false, error: "Fraccionamiento no encontrado" };
    }

    console.log('   Fraccionamiento encontrado, total residencias:', fracc.residencias.length);
    console.log('   Buscando casa con numero:', residencia, 'tipo:', typeof residencia);
    console.log('   parseInt(residencia):', parseInt(residencia));

    const casasEncontradas = fracc.residencias.map(r => ({
      numero: r.numero,
      tipo: typeof r.numero,
      comparacion: r.numero === parseInt(residencia),
      comparacionString: r.numero == residencia,
      comparacionStrictString: r.numero === residencia.toString()
    }));
    console.log('   Todas las casas:', JSON.stringify(casasEncontradas, null, 2));

    const casa = fracc.residencias.find(r => r.numero === parseInt(residencia));
    if (!casa) {
      console.log('   ❌ Casa no encontrada con parseInt');
      const casaConString = fracc.residencias.find(r => r.numero == residencia);
      if (casaConString) {
        console.log('   ✅ Casa encontrada con comparación flexible (==)');
        console.log('   Casa encontrada:', { numero: casaConString.numero, activa: casaConString.activa });
      } else {
        const casaConToString = fracc.residencias.find(r => r.numero.toString() === residencia.toString());
        if (casaConToString) {
          console.log('   ✅ Casa encontrada con .toString()');
        }
      }
      return { success: false, error: "Casa no encontrada" };
    }

    if (!casa.activa) {
      console.log('   ❌ Casa desactivada');
      return { success: false, error: "Casa desactivada" };
    }

    const notificationUrl = process.env.NODE_ENV === 'production'
      ? "https://ingresosbackend.onrender.com/api/notifications/send-notification"
      : "http://localhost:5002/api/notifications/send-notification";

    console.log('   NODE_ENV:', process.env.NODE_ENV);
    console.log('   URL de notificación:', notificationUrl);

    const payload = {
      title: nombre,
      body: motivo,
      fraccId: fraccId,
      residencia: residencia,
      foto: foto || ""
    };

    console.log('   Enviando petición a:', notificationUrl);
    console.log('   Payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(notificationUrl, payload);

    console.log('   ✅ Respuesta recibida:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('   ✅ Notificación enviada exitosamente');
      return { success: true, data: response.data };
    } else {
      console.log('   ❌ Error en respuesta:', response.data.error);
      return { success: false, error: response.data.error };
    }

  } catch (error) {
    console.log('   ❌ Error en enviarNotificacionVisita:', error.message);
    if (error.response) {
      console.log('   Error response status:', error.response.status);
      console.log('   Error response data:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
};

module.exports = { enviarNotificacionVisita };