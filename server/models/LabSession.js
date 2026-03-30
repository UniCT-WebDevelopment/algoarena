const mongoose = require('mongoose');

const labSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    labType: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
    },
    variant: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'abandoned'],
      default: 'active',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    scenario: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    state: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    progress: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    eventAuth: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastClientState: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LabSession', labSessionSchema);
