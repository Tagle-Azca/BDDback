const axios = require("axios");
const Fraccionamiento = require("../models/fraccionamiento.model");

const enviarNotificacionVisita = async (fraccId, residencia, nombre, motivo, foto) => {
  try {
    const fracc = await Fraccionamiento.findById(fraccId);
    if (!fracc) {
      return { success: false, error: "Fraccionamiento no encontrado" };
    }

    const casa = fracc.residencias.find(r => r.numero.toString() === residencia.toString());

    if (!casa) {
      return { success: false, error: "Casa no encontrada" };
    }

    if (!casa.activa) {
      return { success: false, error: "Casa desactivada" };
    }

    const notificationUrl = process.env.NODE_ENV === 'production'
      ? "https://ingresosbackend.onrender.com/api/notifications/send-notification"
      : "http://localhost:5002/api/notifications/send-notification";

    const payload = {
      title: nombre,
      body: motivo,
      fraccId: fraccId,
      residencia: residencia,
      foto: foto || ""
    };

    const response = await axios.post(notificationUrl, payload);

    if (response.data.success) {
      return { success: true, data: response.data };
    } else {
      return { success: false, error: response.data.error };
    }

  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = { enviarNotificacionVisita };