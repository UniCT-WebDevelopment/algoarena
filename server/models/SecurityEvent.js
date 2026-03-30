const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    scope: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['warn', 'block'],
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      default: null,
      index: true,
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    fingerprint: {
      type: String,
      default: null,
    },
    count: {
      type: Number,
      required: true,
    },
    windowMs: {
      type: Number,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    loggedAt: {
      type: Date,
      default: Date.now,
      index: { expires: 60 * 60 * 24 * 30 },
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
