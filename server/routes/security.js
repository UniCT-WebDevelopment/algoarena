const express = require('express');
const auth = require('../middleware/auth');
const { recordSecurityEvent } = require('../services/security-monitor');
const {
  getPublicChallengeConfig,
  isChallengeEnabled,
  setChallengeClearance,
  verifyTurnstileToken,
} = require('../services/security-challenge');

const router = express.Router();

router.get('/challenge/config', auth, (_req, res) => {
  return res.json(getPublicChallengeConfig());
});

router.post('/challenge/verify', auth, async (req, res, next) => {
  try {
    if (!isChallengeEnabled()) {
      return res.status(503).json({ error: 'Challenge provider non configurato.' });
    }

    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'Token challenge mancante.' });
    }

    const verification = await verifyTurnstileToken({
      token,
      remoteIp: req.ip,
    });

    if (!verification.ok) {
      await recordSecurityEvent({
        scope: 'challenge',
        severity: 'block',
        code: `challenge-${verification.reason}`,
        userId: req.user._id.toString(),
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
        metadata: {
          provider: 'turnstile',
        },
      });
      return res.status(400).json({ error: 'Verifica challenge non valida.' });
    }

    const clearance = setChallengeClearance(res, {
      userId: req.user._id.toString(),
      ip: req.ip,
      scopes: ['global'],
    });

    return res.json({
      success: true,
      clearanceExpiresAt: clearance.expiresAt,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
