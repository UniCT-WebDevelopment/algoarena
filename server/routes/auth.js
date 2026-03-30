const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { clearChallengeClearance } = require('../services/security-challenge');
const {
  JWT_SECRET,
  TOKEN_EXPIRES_IN,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_SAME_SITE,
  AUTH_COOKIE_SECURE,
} = require('../config');

const router = express.Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return typeof email === 'string' && emailRegex.test(email.trim());
}

function isValidPassword(password) {
  return typeof password === 'string' && password.trim().length >= 8;
}

function isValidName(name) {
  return typeof name === 'string' && name.trim().length >= 2;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function createToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

function parseTokenTtlMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1000, value);
  }
  if (typeof value !== 'string') {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)(ms|s|m|h|d)?$/i);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return Math.max(1000, amount * (multipliers[unit] || 1));
}

function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: AUTH_COOKIE_SAME_SITE,
    secure: AUTH_COOKIE_SECURE,
    path: '/',
    maxAge: parseTokenTtlMs(TOKEN_EXPIRES_IN),
  };
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: AUTH_COOKIE_SAME_SITE,
    secure: AUTH_COOKIE_SECURE,
    path: '/',
  });
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
}

function publicUser(user) {
  const categoryScores = user.categoryScores instanceof Map
    ? Object.fromEntries(user.categoryScores)
    : user.categoryScores || {};
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    totalScore: user.totalScore ?? 0,
    categoryScores,
    completedExercises: user.completedExercises ?? [],
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!isValidName(name)) {
      return res.status(400).json({ error: 'Nome non valido' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email non valida' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password troppo corta (min 8 caratteri)' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'Utente già esistente' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const token = createToken(user._id.toString());
    setAuthCookie(res, token);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!isValidEmail(email) || typeof password !== 'string') {
      return res.status(400).json({ error: 'Credenziali non valide' });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(401).json({ error: 'Email o password errate' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Email o password errate' });
    }

    const token = createToken(user._id.toString());
    setAuthCookie(res, token);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email non valida' });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    let resetToken = null;
    let resetTokenExpiresAt = null;

    if (user) {
      resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 60);

      user.resetPasswordTokenHash = resetTokenHash;
      user.resetPasswordExpiresAt = resetTokenExpiresAt;
      await user.save();
    }

    return res.json({
      message: 'Se l\'email esiste riceverai le istruzioni per il reset.',
      resetToken,
      resetTokenExpiresAt,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({ error: 'Token non valido' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password troppo corta (min 8 caratteri)' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token non valido o scaduto' });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    const jwtToken = createToken(user._id.toString());
    setAuthCookie(res, jwtToken);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', auth, (req, res) => {
  return res.json({ user: publicUser(req.user) });
});

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  clearChallengeClearance(res);
  return res.status(204).send();
});

module.exports = router;
