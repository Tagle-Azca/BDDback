const OneSignal = require('onesignal-node');

const client = new OneSignal.Client({
  app: { 
    appAuthKey: process.env.ONESIGNAL_API_KEY,
    appId: process.env.ONESIGNAL_APP_ID?.trim(),
  }
});

module.exports = sendNotification;