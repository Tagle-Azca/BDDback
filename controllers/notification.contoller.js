const axios = require('axios');

const ONESIGNAL_API_URL = 'https://api.onesignal.com/api/v1/notifications';
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID?.trim();
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY?.trim();

async function sendNotification(notificationData) {
  try {
    console.log('Enviando notificación con datos:', JSON.stringify(notificationData, null, 2));
    
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      throw new Error('Variables de OneSignal no configuradas correctamente');
    }

    const payload = {
      ...notificationData,
      app_id: ONESIGNAL_APP_ID
    };

    const response = await axios.post(ONESIGNAL_API_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      }
    });

    console.log('Respuesta de OneSignal:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('Error enviando notificación OneSignal:', error.message);
    if (error.response) {
      console.error('Respuesta de error:', error.response.data);
    }
    throw error;
  }
}

module.exports = sendNotification;