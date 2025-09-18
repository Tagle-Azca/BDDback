const axios = require("axios");
const Fraccionamiento = require("../models/fraccionamiento");

const enviarNotificacionVisita = async (fraccId, residencia, nombre, motivo, foto) => {
  try {
    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) {
      console.error("Fraccionamiento no encontrado:", fraccId);
      return { success: false, error: "Fraccionamiento no encontrado" };
    }

    const casa = fracc.residencias.find(r => r.numero === parseInt(residencia));
    if (!casa) {
      console.error("Casa no encontrada:", residencia);
      return { success: false, error: "Casa no encontrada" };
    }

    if (!casa.activa) {
      console.error("Casa desactivada:", residencia);
      return { success: false, error: "Casa desactivada" };
    }

    const notificationUrl = process.env.NODE_ENV === 'production'
      ? "https://ingresosbackend.onrender.com/api/notifications/send-notification"
      : "http://localhost:5002/api/notifications/send-notification";
    
    const response = await axios.post(notificationUrl, {
      title: nombre,
      body: motivo,
      fraccId: fraccId,
      residencia: residencia,
      foto: foto || ""
    });

    if (response.data.success) {
      console.log("Notificación enviada exitosamente:", response.data);
      return { success: true, data: response.data };
    } else {
      console.error("Error en respuesta del servidor:", response.data);
      return { success: false, error: response.data.error };
    }

  } catch (error) {
    console.error("Error enviando notificación de visita:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { enviarNotificacionVisita };