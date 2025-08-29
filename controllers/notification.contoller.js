const OneSignal = require('onesignal-node');

const client = new OneSignal.Client(
  process.env.ONESIGNAL_APP_ID?.trim(),
  process.env.ONESIGNAL_API_KEY?.trim()
);


async function sendNotification(notificationData) {
  try {
    const response = await client.createNotification(notificationData);
    console.log("Notificación enviada:", response.body);
    return response.body;
  } catch (error) {
    console.error("Error al enviar notificación:", error);
    throw error;
  }
}

module.exports = sendNotification;