const mongoose = require('mongoose');

const userTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  fraccId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Fraccionamiento'
  },
  residencia: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  playerId: {
    type: String,
    required: false
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  lastValidated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

userTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

userTokenSchema.index({ userId: 1, fraccId: 1, isActive: 1 });

module.exports = mongoose.model('UserToken', userTokenSchema);