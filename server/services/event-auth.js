const crypto = require('crypto');

function createNonce() {
  return crypto.randomBytes(24).toString('base64url');
}

function hashNonce(nonce) {
  return crypto.createHash('sha256').update(String(nonce || '')).digest('hex');
}

function createEventAuthState() {
  const nonce = createNonce();
  return {
    state: {
      nextSequence: 1,
      nonceHash: hashNonce(nonce),
      issuedAt: new Date().toISOString(),
      lastAcceptedAt: null,
    },
    client: {
      sequence: 1,
      nonce,
    },
  };
}

function verifyEventAuth(expectedState, provided) {
  const expectedSequence = Number(expectedState?.nextSequence || 0);
  const providedSequence = Number(provided?.sequence);
  const providedNonce = typeof provided?.nonce === 'string' ? provided.nonce.trim() : '';

  if (!expectedSequence || !expectedState?.nonceHash) {
    return { ok: false, reason: 'missing-server-state' };
  }
  if (!Number.isInteger(providedSequence) || !providedNonce) {
    return { ok: false, reason: 'missing-client-auth' };
  }
  if (providedSequence !== expectedSequence) {
    return {
      ok: false,
      reason: 'sequence-mismatch',
      expectedSequence,
      providedSequence,
    };
  }
  if (hashNonce(providedNonce) !== expectedState.nonceHash) {
    return { ok: false, reason: 'nonce-mismatch', expectedSequence, providedSequence };
  }
  return { ok: true };
}

function rotateEventAuth(state) {
  const nonce = createNonce();
  const nextSequence = Math.max(1, Number(state?.nextSequence || 1)) + 1;
  const nextState = {
    nextSequence,
    nonceHash: hashNonce(nonce),
    issuedAt: new Date().toISOString(),
    lastAcceptedAt: new Date().toISOString(),
  };
  return {
    state: nextState,
    client: {
      sequence: nextSequence,
      nonce,
    },
  };
}

module.exports = {
  createEventAuthState,
  verifyEventAuth,
  rotateEventAuth,
};
