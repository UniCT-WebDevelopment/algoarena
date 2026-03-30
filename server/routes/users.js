const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const CATEGORY_LABELS = {
  code: 'Code',
  heap: 'Heap',
  rbTree: 'RB-Tree',
  graphs: 'Graphs',
  master: 'Master',
  huffman: 'Huffman',
  dp: 'DP',
  greedy: 'Greedy',
  hashTable: 'Hash',
};

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

function buildStats(history) {
  const completions = history ?? [];
  const totalCompleted = completions.length;
  const totalPoints = completions.reduce((sum, entry) => sum + toNumber(entry.pointsAwarded), 0);
  const basePoints = completions.reduce((sum, entry) => sum + toNumber(entry.basePoints), 0);
  const durations = completions.map((entry) => toNumber(entry.durationMs)).filter((v) => v > 0);
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);
  const errors = completions.map((entry) => toNumber(entry.errors));
  const attempts = completions.map((entry) => Math.max(1, toNumber(entry.attempts, 1)));
  const avgDuration = durations.length ? Math.round(totalDuration / durations.length) : 0;
  const avgErrors = errors.length ? +(errors.reduce((sum, v) => sum + v, 0) / errors.length).toFixed(2) : 0;
  const avgAttempts = attempts.length ? +(attempts.reduce((sum, v) => sum + v, 0) / attempts.length).toFixed(2) : 0;
  const avgPoints = totalCompleted ? Math.round(totalPoints / totalCompleted) : 0;
  const avgMultiplier = basePoints ? +(totalPoints / basePoints).toFixed(2) : 0;
  const pointsPerMinute = totalDuration > 0 ? +(totalPoints / (totalDuration / 60000)).toFixed(2) : 0;

  return {
    totalCompleted,
    totalPoints,
    totalDurationMs: totalDuration,
    averageDurationMs: avgDuration,
    medianDurationMs: median(durations),
    fastestDurationMs: durations.length ? Math.min(...durations) : 0,
    slowestDurationMs: durations.length ? Math.max(...durations) : 0,
    averageErrors: avgErrors,
    averageAttempts: avgAttempts,
    averagePoints: avgPoints,
    averageMultiplier: avgMultiplier,
    pointsPerMinute,
  };
}

function buildCategoryStats(history) {
  const grouped = new Map();
  for (const entry of history) {
    const key = entry.category;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(entry);
  }

  return Object.keys(CATEGORY_LABELS).map((key) => {
    const entries = grouped.get(key) ?? [];
    const stats = buildStats(entries);
    return {
      key,
      label: CATEGORY_LABELS[key] ?? key,
      ...stats,
    };
  });
}

function buildDailyActivity(history) {
  const bucket = new Map();
  for (const entry of history) {
    const date = entry.completedAt ? new Date(entry.completedAt) : null;
    if (!date || Number.isNaN(date.getTime())) continue;
    const key = date.toISOString().slice(0, 10);
    if (!bucket.has(key)) {
      bucket.set(key, { date: key, completions: 0, points: 0 });
    }
    const current = bucket.get(key);
    current.completions += 1;
    current.points += toNumber(entry.pointsAwarded);
  }
  return Array.from(bucket.values()).sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, 14);
}

router.get('/:id/stats', auth, async (req, res, next) => {
  try {
    const id = req.params.id === 'me' ? req.user._id : req.params.id;
    const user = await User.findById(id).select(
      'name totalScore categoryScores completedExercises completionHistory createdAt'
    );
    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    const categoryScores = user.categoryScores instanceof Map
      ? Object.fromEntries(user.categoryScores)
      : user.categoryScores || {};

    const history = Array.isArray(user.completionHistory) ? user.completionHistory : [];
    const overall = buildStats(history);
    const categories = buildCategoryStats(history);
    const recentCompletions = [...history]
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 12)
      .map((entry) => ({
        exerciseId: entry.exerciseId,
        category: entry.category,
        pointsAwarded: entry.pointsAwarded,
        basePoints: entry.basePoints,
        durationMs: entry.durationMs,
        errors: entry.errors,
        attempts: entry.attempts,
        completedAt: entry.completedAt,
      }));

    const dailyActivity = buildDailyActivity(history);

    return res.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        totalScore: user.totalScore ?? 0,
        categoryScores,
        completedCount: user.completedExercises?.length ?? 0,
        createdAt: user.createdAt,
      },
      stats: {
        overall,
        categories,
        recentCompletions,
        dailyActivity,
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
