const axios = require('axios');

const ONESIGNAL_API_URL = 'https://api.onesignal.com/api/v1/notifications';
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID?.trim();
const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY?.trim();

async function sendNotification(notificationData) {
  try {
    
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

    return response.data;
  } catch (error) {
    throw error;
  }
}

module.exports = sendNotification;