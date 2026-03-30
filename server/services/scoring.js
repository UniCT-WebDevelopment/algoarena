function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function computeAward({
  basePoints,
  durationMs,
  errors,
  attempts,
}) {
  const safeBase = clamp(normalizeNumber(basePoints, 0), 1, 5000);
  const safeErrors = clamp(Math.floor(normalizeNumber(errors, 0)), 0, 50);
  const safeAttempts = clamp(Math.floor(normalizeNumber(attempts, 1)), 1, 50);
  const safeDuration = clamp(Math.floor(normalizeNumber(durationMs, 60000)), 1000, 60 * 60 * 1000);

  const errorMultiplier = clamp(1 - safeErrors * 0.07, 0.4, 1);
  const attemptMultiplier = clamp(1 - (safeAttempts - 1) * 0.12, 0.35, 1);

  let timeMultiplier = 1;
  if (safeDuration < 15000) {
    timeMultiplier = 0.55;
  } else if (safeDuration < 30000) {
    timeMultiplier = 0.75;
  } else if (safeDuration < 60000) {
    timeMultiplier = 0.9;
  }
  if (safeDuration > 20 * 60 * 1000) {
    timeMultiplier *= 0.85;
  }

  let multiplier = errorMultiplier * attemptMultiplier * timeMultiplier;

  if (safeAttempts >= 4 && safeDuration < 15000) {
    multiplier = Math.min(multiplier, 0.25);
  }
  if (safeAttempts >= 6 && safeDuration < 30000) {
    multiplier = Math.min(multiplier, 0.35);
  }

  const minPoints = Math.max(5, Math.round(safeBase * 0.15));
  const raw = Math.round(safeBase * multiplier);
  const awarded = clamp(raw, minPoints, safeBase);

  return {
    awarded,
    details: {
      basePoints: safeBase,
      errors: safeErrors,
      attempts: safeAttempts,
      durationMs: safeDuration,
      multiplier: Number(multiplier.toFixed(3)),
    },
  };
}

module.exports = {
  computeAward,
};
