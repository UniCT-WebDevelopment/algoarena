const { CLIENT_ORIGINS } = require('../config');
const { recordSecurityEvent } = require('../services/security-monitor');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ALLOWED_FETCH_SITES = new Set(['same-origin', 'same-site', 'none']);

function parseOriginFromReferer(referer) {
  if (typeof referer !== 'string' || !referer.trim()) {
    return null;
  }
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function resolveRequestOrigin(req) {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
  if (origin) {
    return origin;
  }
  return parseOriginFromReferer(req.headers.referer);
}

module.exports = async function browserGuard(req, res, next) {
  const method = String(req.method || 'GET').toUpperCase();
  if (SAFE_METHODS.has(method)) {
    return next();
  }

  const resolvedOrigin = resolveRequestOrigin(req);
  const fetchSite = typeof req.headers['sec-fetch-site'] === 'string' ? req.headers['sec-fetch-site'].trim() : '';

  if (!resolvedOrigin || !CLIENT_ORIGINS.includes(resolvedOrigin)) {
    await recordSecurityEvent({
      scope: 'request',
      severity: 'block',
      code: 'origin-mismatch',
      ip: req.ip,
      userAgent: req.get('user-agent') || null,
      metadata: {
        method,
        path: req.originalUrl,
        origin: typeof req.headers.origin === 'string' ? req.headers.origin : null,
        referer: typeof req.headers.referer === 'string' ? req.headers.referer : null,
      },
    });
    return res.status(403).json({ error: 'Origine richiesta non valida.' });
  }

  if (fetchSite && !ALLOWED_FETCH_SITES.has(fetchSite)) {
    await recordSecurityEvent({
      scope: 'request',
      severity: 'block',
      code: 'fetch-site-blocked',
      ip: req.ip,
      userAgent: req.get('user-agent') || null,
      metadata: {
        method,
        path: req.originalUrl,
        fetchSite,
      },
    });
    return res.status(403).json({ error: 'Contesto browser non valido per questa richiesta.' });
  }

  return next();
};
