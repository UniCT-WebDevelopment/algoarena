const crypto = require('crypto');
const SecurityEvent = require('../models/SecurityEvent');

const WINDOW_RULES = {
  labStart: [
    { code: 'lab-start-burst', severity: 'warn', windowMs: 60 * 1000, limit: 12 },
    { code: 'lab-start-flood', severity: 'block', windowMs: 60 * 1000, limit: 30 },
  ],
  labStep: [
    { code: 'lab-step-burst', severity: 'warn', windowMs: 10 * 1000, limit: 45 },
    { code: 'lab-step-flood', severity: 'block', windowMs: 30 * 1000, limit: 120 },
  ],
  codeSubmit: [
    { code: 'code-submit-burst', severity: 'warn', windowMs: 60 * 1000, limit: 6 },
    { code: 'code-submit-flood', severity: 'block', windowMs: 60 * 1000, limit: 15 },
  ],
};

const REPEAT_RULES = {
  labStep: [
    { code: 'lab-step-replay', severity: 'warn', windowMs: 10 * 1000, limit: 20 },
    { code: 'lab-step-replay-flood', severity: 'block', windowMs: 30 * 1000, limit: 50 },
  ],
  codeSubmit: [
    { code: 'code-submit-replay', severity: 'warn', windowMs: 60 * 1000, limit: 4 },
    { code: 'code-submit-replay-flood', severity: 'block', windowMs: 60 * 1000, limit: 10 },
  ],
};

const WINDOW_STATE = new Map();
const LOG_COOLDOWN_MS = 60 * 1000;
const logCooldowns = new Map();

function pruneTimestamps(timestamps, now, windowMs) {
  return timestamps.filter((timestamp) => now - timestamp <= windowMs);
}

function stableFingerprint(value) {
  const normalized = JSON.stringify(value ?? null);
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 20);
}

function actorKey(scope, userId, sessionId, ip) {
  const subject = userId || ip || 'anonymous';
  return `${scope}:${subject}:${sessionId || '-'}`;
}

function getState(key) {
  const current = WINDOW_STATE.get(key);
  if (current) {
    return current;
  }
  const created = {
    timestamps: [],
    fingerprints: new Map(),
  };
  WINDOW_STATE.set(key, created);
  return created;
}

async function persistAnomaly(event) {
  const cooldownKey = `${event.code}:${event.userId || event.ip || 'anonymous'}:${event.sessionId || '-'}`;
  const now = Date.now();
  const lastLoggedAt = logCooldowns.get(cooldownKey) || 0;
  if (now - lastLoggedAt < LOG_COOLDOWN_MS) {
    return;
  }
  logCooldowns.set(cooldownKey, now);
  try {
    await SecurityEvent.create(event);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('SecurityEvent log failed:', error);
  }
}

async function recordSecurityEvent({
  scope,
  severity,
  code,
  userId = null,
  sessionId = null,
  ip = null,
  userAgent = null,
  fingerprint = null,
  count = 1,
  windowMs = 0,
  metadata = {},
}) {
  const event = {
    scope,
    severity,
    code,
    userId,
    sessionId,
    ip,
    userAgent,
    fingerprint,
    count,
    windowMs,
    metadata,
    loggedAt: new Date(),
  };
  await persistAnomaly(event);
  // eslint-disable-next-line no-console
  console.warn('[SecurityEvent]', JSON.stringify({
    scope,
    severity,
    code,
    userId,
    sessionId,
    ip,
  }));
  return event;
}

async function auditRequestAnomaly({
  scope,
  userId = null,
  sessionId = null,
  ip = null,
  userAgent = null,
  fingerprintSource = null,
  metadata = {},
}) {
  const rules = WINDOW_RULES[scope] || [];
  const repeatRules = REPEAT_RULES[scope] || [];
  if (!rules.length && !repeatRules.length) {
    return { blocked: false, anomalies: [] };
  }

  const now = Date.now();
  const fingerprint = fingerprintSource === null ? null : stableFingerprint(fingerprintSource);
  const key = actorKey(scope, userId, sessionId, ip);
  const state = getState(key);
  const maxWindowMs = Math.max(
    1,
    ...rules.map((rule) => rule.windowMs),
    ...repeatRules.map((rule) => rule.windowMs)
  );

  state.timestamps.push(now);
  state.timestamps = pruneTimestamps(state.timestamps, now, maxWindowMs);

  if (fingerprint) {
    const existing = state.fingerprints.get(fingerprint) || [];
    existing.push(now);
    state.fingerprints.set(fingerprint, pruneTimestamps(existing, now, maxWindowMs));
  }

  const anomalies = [];

  for (const rule of rules) {
    const count = state.timestamps.filter((timestamp) => now - timestamp <= rule.windowMs).length;
    if (count < rule.limit) {
      continue;
    }
    anomalies.push({
      scope,
      severity: rule.severity,
      code: rule.code,
      count,
      windowMs: rule.windowMs,
      userId,
      sessionId,
      ip,
      userAgent,
      fingerprint,
      metadata,
      loggedAt: new Date(now),
    });
  }

  if (fingerprint) {
    const fingerprintTimestamps = state.fingerprints.get(fingerprint) || [];
    for (const rule of repeatRules) {
      const count = fingerprintTimestamps.filter((timestamp) => now - timestamp <= rule.windowMs).length;
      if (count < rule.limit) {
        continue;
      }
      anomalies.push({
        scope,
        severity: rule.severity,
        code: rule.code,
        count,
        windowMs: rule.windowMs,
        userId,
        sessionId,
        ip,
        userAgent,
        fingerprint,
        metadata,
        loggedAt: new Date(now),
      });
    }
  }

  if (anomalies.length) {
    for (const anomaly of anomalies) {
      await persistAnomaly(anomaly);
      // eslint-disable-next-line no-console
      console.warn('[SecurityEvent]', JSON.stringify({
        scope: anomaly.scope,
        severity: anomaly.severity,
        code: anomaly.code,
        count: anomaly.count,
        windowMs: anomaly.windowMs,
        userId: anomaly.userId,
        sessionId: anomaly.sessionId,
        ip: anomaly.ip,
      }));
    }
  }

  return {
    blocked: anomalies.some((anomaly) => anomaly.severity === 'block'),
    anomalies,
  };
}

module.exports = {
  auditRequestAnomaly,
  recordSecurityEvent,
};
