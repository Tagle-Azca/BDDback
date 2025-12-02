/**
 * 📲 CONTROLADOR DE NOTIFICACIONES
 *
 * Maneja el envío de notificaciones push usando OneSignal
 */

const axios = require('axios');

const sendNotification = async (notificationData) => {
  try {
    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
    const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      console.log('⚠️  OneSignal no configurado - notificación omitida');
      return { success: false, message: 'OneSignal no configurado' };
    }

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      {
        app_id: ONESIGNAL_APP_ID,
        ...notificationData
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${ONESIGNAL_API_KEY}`
        }
      }
    );

    console.log('✅ Notificación enviada:', response.data.id);
    return { success: true, id: response.data.id };

  } catch (error) {
    console.error('❌ Error al enviar notificación:', error.message);
    return { success: false, message: error.message };
  }
};

module.exports = sendNotification;
