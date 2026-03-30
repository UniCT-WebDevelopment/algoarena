function decodeBase64Url(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    return Buffer.from(padded, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function parseEncodedJson(value) {
  const decoded = decodeBase64Url(value);
  if (!decoded) {
    return null;
  }
  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function evaluateAutomationRisk(req, options = {}) {
  const {
    requireRecentInteraction = false,
    maxInteractionAgeMs = 15 * 1000,
  } = options;

  const automation = parseEncodedJson(req.headers['x-client-automation']);
  const interaction = parseEncodedJson(req.headers['x-client-interaction']);
  const userAgent = String(req.headers['user-agent'] || '');
  const secChUa = String(req.headers['sec-ch-ua'] || '');

  const reasons = [];
  let score = 0;

  if (/HeadlessChrome|PhantomJS|puppeteer|playwright/i.test(`${userAgent} ${secChUa}`)) {
    score += 6;
    reasons.push('headless-user-agent');
  }

  if (automation) {
    if (Number(automation.wd) === 1) {
      score += 6;
      reasons.push('webdriver-true');
    }
    if (Number(automation.hu) === 1) {
      score += 4;
      reasons.push('headless-client-signal');
    }
    if (Number(automation.pl) === 0) {
      score += 1;
      reasons.push('no-plugins');
    }
    if (Number(automation.ll) === 0) {
      score += 1;
      reasons.push('no-languages');
    }
    if (Number(automation.ch) === 0 && /Chrome|Chromium/i.test(userAgent)) {
      score += 1;
      reasons.push('missing-window-chrome');
    }
    if (typeof automation.glr === 'string' && /SwiftShader|llvmpipe|software/i.test(automation.glr)) {
      score += 3;
      reasons.push('software-renderer');
    }
  } else {
    score += 2;
    reasons.push('missing-automation-header');
  }

  if (requireRecentInteraction) {
    const interactionTs = Number(interaction?.ts);
    const interactionType = typeof interaction?.type === 'string' ? interaction.type : '';
    const ageMs = Number.isFinite(interactionTs) ? Date.now() - interactionTs : Number.POSITIVE_INFINITY;
    if (!interactionType || ageMs > maxInteractionAgeMs) {
      score += 2;
      reasons.push('stale-or-missing-interaction');
    }
  }

  return {
    score,
    reasons,
    severe: score >= 6,
    suspicious: score >= 3,
    automation,
    interaction,
  };
}

module.exports = {
  evaluateAutomationRisk,
};
