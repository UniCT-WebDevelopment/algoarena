const jwt = require('jsonwebtoken');
const { JWT_SECRET, AUTH_COOKIE_NAME } = require('../config');
const User = require('../models/User');

function readCookie(req, cookieName) {
  const header = req.headers.cookie;
  if (typeof header !== 'string' || !header.trim()) {
    return null;
  }
  const parts = header.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    if (key !== cookieName) {
      continue;
    }
    const rawValue = trimmed.slice(separatorIndex + 1);
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  }
  return null;
}

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const bearerToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  const cookieToken = readCookie(req, AUTH_COOKIE_NAME);
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ error: 'Token mancante' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Utente non valido' });
    }
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token non valido' });
  }
};
