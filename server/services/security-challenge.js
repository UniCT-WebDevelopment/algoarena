const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {
  JWT_SECRET,
  CLIENT_ORIGINS,
  AUTH_COOKIE_SAME_SITE,
  AUTH_COOKIE_SECURE,
  SECURITY_CLEARANCE_COOKIE_NAME,
  SECURITY_CLEARANCE_TTL_MS,
  TURNSTILE_SITE_KEY,
  TURNSTILE_SECRET_KEY,
  TURNSTILE_EXPECTED_ACTION,
} = require('../config');

const SECURITY_CLEARANCE_TYPE = 'security-clearance';

function isChallengeEnabled() {
  return Boolean(TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY);
}

function ipHash(ip) {
  return crypto.createHash('sha256').update(String(ip || '')).digest('hex');
}

function readCookie(req, cookieName) {
  const header = req.headers.cookie;
  if (typeof header !== 'string' || !header.trim()) {
    return null;
  }
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    if (key !== cookieName) {
      continue;
    }
    const value = trimmed.slice(separatorIndex + 1);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

function challengeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: AUTH_COOKIE_SAME_SITE,
    secure: AUTH_COOKIE_SECURE,
    path: '/',
    maxAge: SECURITY_CLEARANCE_TTL_MS,
  };
}

function getAllowedHostnames() {
  const hostnames = new Set();
  for (const origin of CLIENT_ORIGINS) {
    try {
      hostnames.add(new URL(origin).hostname);
    } catch {
      continue;
    }
  }
  return hostnames;
}

function createClearanceToken({ userId, ip, scopes = ['global'] }) {
  return jwt.sign(
    {
      type: SECURITY_CLEARANCE_TYPE,
      sub: userId || null,
      ipHash: ipHash(ip),
      scopes,
    },
    JWT_SECRET,
    { expiresIn: Math.max(60, Math.round(SECURITY_CLEARANCE_TTL_MS / 1000)) }
  );
}

function hasValidChallengeClearance(req, scope, userId) {
  const token = readCookie(req, SECURITY_CLEARANCE_COOKIE_NAME);
  if (!token) {
    return false;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload?.type !== SECURITY_CLEARANCE_TYPE) {
      return false;
    }
    if ((payload?.sub || null) !== (userId || null)) {
      return false;
    }
    if (payload?.ipHash !== ipHash(req.ip)) {
      return false;
    }
    const scopes = Array.isArray(payload?.scopes) ? payload.scopes : [];
    return scopes.includes('global') || scopes.includes(scope);
  } catch {
    return false;
  }
}

function setChallengeClearance(res, { userId, ip, scopes = ['global'] }) {
  const token = createClearanceToken({ userId, ip, scopes });
  res.cookie(SECURITY_CLEARANCE_COOKIE_NAME, token, challengeCookieOptions());
  return {
    expiresAt: new Date(Date.now() + SECURITY_CLEARANCE_TTL_MS).toISOString(),
  };
}

function clearChallengeClearance(res) {
  res.clearCookie(SECURITY_CLEARANCE_COOKIE_NAME, {
    httpOnly: true,
    sameSite: AUTH_COOKIE_SAME_SITE,
    secure: AUTH_COOKIE_SECURE,
    path: '/',
  });
}

function getPublicChallengeConfig() {
  return {
    enabled: isChallengeEnabled(),
    provider: 'turnstile',
    siteKey: TURNSTILE_SITE_KEY || null,
    action: TURNSTILE_EXPECTED_ACTION,
  };
}

async function verifyTurnstileToken({ token, remoteIp }) {
  if (!isChallengeEnabled()) {
    return { ok: false, reason: 'disabled' };
  }

  const body = new URLSearchParams();
  body.set('secret', TURNSTILE_SECRET_KEY);
  body.set('response', token);
  if (remoteIp) {
    body.set('remoteip', remoteIp);
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const result = await response.json();
  if (!result?.success) {
    return { ok: false, reason: 'provider-rejected', providerResult: result };
  }

  if (result.action && result.action !== TURNSTILE_EXPECTED_ACTION) {
    return { ok: false, reason: 'action-mismatch', providerResult: result };
  }

  const hostname = typeof result.hostname === 'string' ? result.hostname.trim() : '';
  const allowedHostnames = getAllowedHostnames();
  if (hostname && allowedHostnames.size && !allowedHostnames.has(hostname)) {
    return { ok: false, reason: 'hostname-mismatch', providerResult: result };
  }

  return { ok: true, providerResult: result };
}

async function enforceSecurityChallenge(req, res, {
  scope,
  reason,
  statusCode = 429,
  userId = null,
}) {
  if (hasValidChallengeClearance(req, scope, userId)) {
    return true;
  }

  if (!isChallengeEnabled()) {
    return res.status(statusCode).json({ error: 'Richiesta bloccata per attività sospetta.' });
  }

  return res.status(statusCode).json({
    error: 'Verifica aggiuntiva richiesta.',
    challengeRequired: true,
    challenge: {
      provider: 'turnstile',
      scope,
      reason,
      action: TURNSTILE_EXPECTED_ACTION,
    },
  });
}

module.exports = {
  clearChallengeClearance,
  enforceSecurityChallenge,
  getPublicChallengeConfig,
  hasValidChallengeClearance,
  isChallengeEnabled,
  setChallengeClearance,
  verifyTurnstileToken,
};
