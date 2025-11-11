const fetch = require("node-fetch");
const Fraccionamiento = require("../models/fraccionamiento.model");

/**
 * Envía una notificación silenciosa para retirar un banner de notificación
 * @param {string} fraccId - ID del fraccionamiento
 * @param {string} numeroCasa - Número de la casa
 * @param {string} notificationId - ID de la notificación
 * @param {string} estatus - Estatus de la respuesta (aceptado/rechazado)
 * @param {string} residenteNombre - Nombre del residente que respondió
 */
async function enviarNotificacionRetiroBanner(fraccId, numeroCasa, notificationId, estatus, residenteNombre) {
  try {
    const fraccionamiento = await Fraccionamiento.findById(fraccId);

    if (!fraccionamiento) return;

    const casa = fraccionamiento.residencias.find(r => r.numero.toString() === numeroCasa.toString());
    if (!casa) return;

    const residentesActivos = casa.residentes.filter(r => r.activo && r.playerId);
    if (residentesActivos.length === 0) return;

    const playerIds = [...new Set(residentesActivos
      .map(residente => residente.playerId)
      .filter(id => id && id.trim() !== ''))];

    if (playerIds.length === 0) {
      return;
    }

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

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error enviando notificación de retiro de banner:', error);
    return null;
  }
}

/**
 * Envía una notificación de expulsión a un residente
 * @param {string} playerId - Player ID del residente
 * @param {string} nombreResidente - Nombre del residente
 */
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

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${process.env.ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error enviando notificación de expulsión:', error);
    return null;
  }
}

module.exports = {
  enviarNotificacionRetiroBanner,
  enviarNotificacionExpulsion
};
