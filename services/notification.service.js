const fetch = require("node-fetch");
const Fraccionamiento = require("../models/fraccionamiento.model");

const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

const getOneSignalHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
});

const sendOneSignalNotification = async (payload) => {
  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: getOneSignalHeaders(),
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error('Error enviando notificación a OneSignal:', error);
    throw error;
  }
};

const getActiveResidentsPlayerIds = async (fraccId, numeroCasa) => {
  const fraccionamiento = await Fraccionamiento.findById(fraccId);
  if (!fraccionamiento) return [];

  const casa = fraccionamiento.residencias.find(r => r.numero.toString() === numeroCasa.toString());
  if (!casa) return [];

  const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
  return [...new Set(residentesActivos
    .map(r => r.playerId)
    .filter(id => id && id.trim() !== ''))];
};

async function enviarNotificacionRetiroBanner(fraccId, numeroCasa, notificationId, estatus, residenteNombre) {
  try {
    const playerIds = await getActiveResidentsPlayerIds(fraccId, numeroCasa);
    if (playerIds.length === 0) return null;

    const payload = {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      contents: { "en": "Banner removal" },
      headings: { "en": "Notification Update" },
      content_available: true,
      priority: 10,
      silent: true,
      data: {
        type: 'banner_removal',
        tipo: 'banner_removal',
        notificationId: notificationId,
        notification_id: notificationId,
        estatus: estatus,
        autorizadoPor: residenteNombre,
        action: 'remove_notification_banner',
        timestamp: Date.now().toString()
      },
      ios_sound: "",
      android_channel_id: "silent_notifications",
      mutable_content: true
    };

    return await sendOneSignalNotification(payload);
  } catch (error) {
    console.error('Error enviando notificación de retiro de banner:', error);
    return null;
  }
}

async function enviarNotificacionExpulsion(playerId, nombreResidente) {
  try {
    const payload = {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: [playerId],
      data: {
        type: 'force_logout',
        action: 'logout_user',
        message: 'Tu acceso ha sido revocado por el administrador',
        timestamp: Date.now().toString()
      },
      content_available: true,
      priority: 10
    };

    return await sendOneSignalNotification(payload);
  } catch (error) {
    console.error('Error enviando notificación de expulsión:', error);
    return null;
  }
}

module.exports = {
  enviarNotificacionRetiroBanner,
  enviarNotificacionExpulsion,
  sendOneSignalNotification,
  getActiveResidentsPlayerIds
};
