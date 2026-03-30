const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    resetPasswordTokenHash: {
      type: String,
    },
    resetPasswordExpiresAt: {
      type: Date,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    categoryScores: {
      type: Map,
      of: Number,
      default: {},
    },
    exerciseAttempts: {
      type: Map,
      of: Number,
      default: {},
    },
    completedExercises: {
      type: [String],
      default: [],
    },
    completionHistory: {
      type: [
        {
          exerciseId: { type: String, required: true },
          category: { type: String, required: true },
          pointsAwarded: { type: Number, required: true },
          basePoints: { type: Number, required: true },
          durationMs: { type: Number },
          errors: { type: Number, default: 0 },
          attempts: { type: Number, default: 1 },
          completedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
