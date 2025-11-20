const testData = {
  users: {
    validUser: {
      userId: '68d41e9ad9b7f5d456400283',
      fraccId: '685417c35764cd581a84a2c9',
      house: '104'
    },
    anotherUser: {
      userId: '68d41e9ad9b7f5d456400284',
      fraccId: '685417c35764cd581a84a2c9',
      house: '105'
    }
  },

  analytics: {
    singleEvent: {
      event: 'app_open',
      properties: {
        user_id: '68d41e9ad9b7f5d456400283',
        fracc_id: '685417c35764cd581a84a2c9',
        house: '104',
        app_version: '1.6.6+11',
        platform: 'ios',
        device_timestamp: new Date().toISOString()
      }
    },

    batchEvents: [
      {
        event: 'screen_view',
        properties: {
          user_id: '68d41e9ad9b7f5d456400283',
          fracc_id: '685417c35764cd581a84a2c9',
          house: '104',
          screen_name: 'home_page',
          platform: 'ios'
        }
      },
      {
        event: 'qr_scan',
        properties: {
          user_id: '68d41e9ad9b7f5d456400283',
          fracc_id: '685417c35764cd581a84a2c9',
          house: '104',
          success: true,
          result_type: 'access_qr',
          platform: 'ios'
        }
      },
      {
        event: 'door_access',
        properties: {
          user_id: '68d41e9ad9b7f5d456400283',
          fracc_id: '685417c35764cd581a84a2c9',
          house: '104',
          authorized: true,
          method: 'qr',
          platform: 'ios'
        }
      }
    ]
  },

  notifications: {
    validNotification: {
      title: 'Test Visitor',
      body: 'Testing notification system',
      fraccId: '685417c35764cd581a84a2c9',
      residencia: '104',
      foto: 'https://example.com/photo.jpg'
    }
  }
};

module.exports = testData;
