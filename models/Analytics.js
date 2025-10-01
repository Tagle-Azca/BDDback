const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  house: {
    type: String,
    required: false,
    index: true
  },
  fraccId: {
    type: String,
    required: true,
    index: true
  },
  properties: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  appVersion: {
    type: String,
    required: false
  },
  platform: {
    type: String,
    required: false,
    enum: ['ios', 'android', 'web']
  },
  deviceTimestamp: {
    type: Date,
    required: false
  },
  serverTimestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  sessionId: {
    type: String,
    required: false
  },
  ipAddress: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  collection: 'analytics'
});

AnalyticsSchema.index({ event: 1, serverTimestamp: -1 });
AnalyticsSchema.index({ userId: 1, serverTimestamp: -1 });
AnalyticsSchema.index({ fraccId: 1, event: 1, serverTimestamp: -1 });
AnalyticsSchema.index({ house: 1, event: 1, serverTimestamp: -1 });

AnalyticsSchema.index({ serverTimestamp: 1 }, { expireAfterSeconds: 63072000 });

module.exports = mongoose.model('Analytics', AnalyticsSchema);