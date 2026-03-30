const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const LabSession = require('../models/LabSession');
const { computeAward } = require('../services/scoring');
const { createLabSessionDescriptor, applyLabSubmission } = require('../services/lab-engine');
const { auditRequestAnomaly, recordSecurityEvent } = require('../services/security-monitor');
const { enforceSecurityChallenge } = require('../services/security-challenge');
const { createEventAuthState, verifyEventAuth, rotateEventAuth } = require('../services/event-auth');
const { evaluateAutomationRisk } = require('../services/automation-risk');

const router = express.Router();
const sessionStepQueues = new Map();
const LAB_SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const ALLOWED_CATEGORIES = new Set([
  'code',
  'heap',
  'rbTree',
  'graphs',
  'huffman',
  'dp',
  'hashTable',
  'master',
  'greedy',
]);

function buildUserPayload(user) {
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

function queueSessionStep(sessionId, task) {
  const previous = sessionStepQueues.get(sessionId) ?? Promise.resolve();
  const run = previous.catch(() => {}).then(task);
  const settled = run.catch(() => {});
  sessionStepQueues.set(sessionId, settled);
  return run.finally(() => {
    if (sessionStepQueues.get(sessionId) === settled) {
      sessionStepQueues.delete(sessionId);
    }
  });
}

function buildSessionExpiry(now = Date.now()) {
  return new Date(now + LAB_SESSION_TTL_MS);
}

function isSessionExpired(session, now = Date.now()) {
  const expiresAt = session?.expiresAt ? new Date(session.expiresAt).getTime() : NaN;
  return Number.isFinite(expiresAt) && expiresAt <= now;
}

async function applyAwards(userId, awards) {
  if (!Array.isArray(awards) || !awards.length) {
    return {
      pointsAwarded: 0,
      awards: [],
      user: null,
    };
  }

  const awardResults = [];
  let totalAwarded = 0;

  for (const award of awards) {
    const exerciseId = typeof award?.exerciseId === 'string' ? award.exerciseId.trim() : '';
    const category = typeof award?.category === 'string' ? award.category.trim() : '';
    const basePoints = Number(award?.points);
    if (!exerciseId || !category || !ALLOWED_CATEGORIES.has(category) || !Number.isFinite(basePoints)) {
      continue;
    }

    const { awarded } = computeAward({
      basePoints,
      durationMs: award.durationMs ?? undefined,
      errors: award.errors ?? 0,
      attempts: award.attempts ?? 1,
    });

    const completion = {
      exerciseId,
      category,
      pointsAwarded: awarded,
      basePoints,
      durationMs: award.durationMs ?? undefined,
      errors: award.errors ?? 0,
      attempts: award.attempts ?? 1,
      completedAt: new Date(),
    };

    const updateResult = await User.updateOne(
      { _id: userId, completedExercises: { $ne: exerciseId } },
      {
        $inc: {
          totalScore: awarded,
          [`categoryScores.${category}`]: awarded,
        },
        $addToSet: { completedExercises: exerciseId },
        $push: { completionHistory: completion },
      }
    );

    const claimed = Number(updateResult.modifiedCount || 0) > 0;
    if (claimed) {
      totalAwarded += awarded;
    }

    awardResults.push({
      exerciseId,
      category,
      alreadyCompleted: !claimed,
      pointsAwarded: claimed ? awarded : 0,
    });
  }

  const updatedUser = await User.findById(userId);
  if (!updatedUser) {
    throw new Error('Utente non trovato');
  }

  return {
    pointsAwarded: totalAwarded,
    awards: awardResults,
    user: buildUserPayload(updatedUser),
  };
}

router.post('/labs/start', auth, async (req, res, next) => {
  try {
    const labType = typeof req.body?.labType === 'string' ? req.body.labType.trim() : '';
    const variant = typeof req.body?.variant === 'string' ? req.body.variant.trim() : undefined;
    if (!labType) {
      return res.status(400).json({ error: 'Laboratorio non valido' });
    }

    const startAutomationRisk = evaluateAutomationRisk(req);
    if (startAutomationRisk.severe) {
      await recordSecurityEvent({
        scope: 'labStart',
        severity: 'block',
        code: 'automation-risk-high',
        userId: req.user._id.toString(),
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
        metadata: {
          labType,
          reasons: startAutomationRisk.reasons,
          score: startAutomationRisk.score,
        },
      });
      const challengeOutcome = await enforceSecurityChallenge(req, res, {
        scope: 'labStart',
        reason: 'automation-risk-high',
        statusCode: 429,
        userId: req.user._id.toString(),
      });
      if (challengeOutcome !== true) {
        return challengeOutcome;
      }
    } else if (startAutomationRisk.suspicious) {
      await recordSecurityEvent({
        scope: 'labStart',
        severity: 'warn',
        code: 'automation-risk-medium',
        userId: req.user._id.toString(),
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
        metadata: {
          labType,
          reasons: startAutomationRisk.reasons,
          score: startAutomationRisk.score,
        },
      });
    }

    const startAudit = await auditRequestAnomaly({
      scope: 'labStart',
      userId: req.user._id.toString(),
      ip: req.ip,
      userAgent: req.get('user-agent') || null,
      fingerprintSource: { labType, variant },
      metadata: { labType, variant },
    });
    if (startAudit.blocked) {
      const challengeOutcome = await enforceSecurityChallenge(req, res, {
        scope: 'labStart',
        reason: startAudit.anomalies[0]?.code || 'lab-start-suspicious',
        statusCode: 429,
        userId: req.user._id.toString(),
      });
      if (challengeOutcome !== true) {
        return challengeOutcome;
      }
    }

    const session = new LabSession({
      userId: req.user._id,
      labType,
      category: labType,
      variant: variant ?? null,
      status: 'active',
      expiresAt: buildSessionExpiry(),
      scenario: {},
      state: {},
      progress: {},
      eventAuth: {},
      lastClientState: {},
    });

    const descriptor = createLabSessionDescriptor({
      sessionId: session._id.toString(),
      labType,
      variant,
    });

    session.category = descriptor.category;
    session.variant = descriptor.variant ?? variant ?? null;
    session.scenario = descriptor.scenario;
    session.state = descriptor.state;
    session.progress = descriptor.progress;
    const eventAuth = createEventAuthState();
    session.eventAuth = eventAuth.state;

    await session.save();

    return res.json({
      sessionId: session._id.toString(),
      labType: session.labType,
      category: session.category,
      variant: session.variant,
      scenario: descriptor.clientScenario,
      progress: descriptor.progress,
      result: descriptor.initialResult,
      eventAuth: eventAuth.client,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/labs/:sessionId/step', auth, async (req, res, next) => {
  try {
    const sessionId = typeof req.params?.sessionId === 'string' ? req.params.sessionId.trim() : '';
    if (!sessionId) {
      return res.status(400).json({ error: 'Sessione laboratorio non valida' });
    }
    return await queueSessionStep(sessionId, async () => {
      const session = await LabSession.findOne({ _id: sessionId, userId: req.user._id });
      if (!session) {
        return res.status(404).json({ error: 'Sessione laboratorio non trovata' });
      }
      if (isSessionExpired(session)) {
        session.status = 'abandoned';
        await session.save();
        return res.status(410).json({ error: 'Sessione laboratorio scaduta. Avviane una nuova.' });
      }

      const stepAutomationRisk = evaluateAutomationRisk(req);
      if (stepAutomationRisk.severe) {
        await recordSecurityEvent({
          scope: 'labStep',
          severity: 'block',
          code: 'automation-risk-high',
          userId: req.user._id.toString(),
          sessionId,
          ip: req.ip,
          userAgent: req.get('user-agent') || null,
          metadata: {
            labType: session.labType,
            reasons: stepAutomationRisk.reasons,
            score: stepAutomationRisk.score,
          },
        });
        const challengeOutcome = await enforceSecurityChallenge(req, res, {
          scope: 'labStep',
          reason: 'automation-risk-high',
          statusCode: 429,
          userId: req.user._id.toString(),
        });
        if (challengeOutcome !== true) {
          return challengeOutcome;
        }
      } else if (stepAutomationRisk.suspicious) {
        await recordSecurityEvent({
          scope: 'labStep',
          severity: 'warn',
          code: 'automation-risk-medium',
          userId: req.user._id.toString(),
          sessionId,
          ip: req.ip,
          userAgent: req.get('user-agent') || null,
          metadata: {
            labType: session.labType,
            reasons: stepAutomationRisk.reasons,
            score: stepAutomationRisk.score,
          },
        });
      }

      const eventAuthCheck = verifyEventAuth(session.eventAuth, req.body?.eventAuth);
      if (!eventAuthCheck.ok) {
        await recordSecurityEvent({
          scope: 'labStep',
          severity: 'block',
          code: `event-auth-${eventAuthCheck.reason}`,
          userId: req.user._id.toString(),
          sessionId,
          ip: req.ip,
          userAgent: req.get('user-agent') || null,
          metadata: {
            labType: session.labType,
            expectedSequence: eventAuthCheck.expectedSequence ?? null,
            providedSequence: eventAuthCheck.providedSequence ?? null,
          },
        });
        return res.status(409).json({ error: 'Sequenza eventi non valida per questa sessione laboratorio.' });
      }

      const stepAudit = await auditRequestAnomaly({
        scope: 'labStep',
        userId: req.user._id.toString(),
        sessionId,
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
        fingerprintSource: req.body ?? {},
        metadata: {
          labType: session.labType,
          eventType: typeof req.body?.eventType === 'string' ? req.body.eventType : 'draft',
        },
      });
      if (stepAudit.blocked) {
        const challengeOutcome = await enforceSecurityChallenge(req, res, {
          scope: 'labStep',
          reason: stepAudit.anomalies[0]?.code || 'lab-step-suspicious',
          statusCode: 429,
          userId: req.user._id.toString(),
        });
        if (challengeOutcome !== true) {
          return challengeOutcome;
        }
      }

      const evaluation = applyLabSubmission(session, req.body ?? {});
      session.state = evaluation.state;
      session.progress = evaluation.progress;
      session.lastClientState = evaluation.lastClientState;
      session.status = evaluation.status ?? session.status;
      session.expiresAt = buildSessionExpiry();
      const nextEventAuth = rotateEventAuth(session.eventAuth);
      session.eventAuth = nextEventAuth.state;
      session.markModified('state');
      session.markModified('progress');
      session.markModified('eventAuth');
      session.markModified('lastClientState');
      await session.save();

      const awardOutcome = await applyAwards(req.user._id, evaluation.awards);

      return res.json({
        sessionId: session._id.toString(),
        labType: session.labType,
        category: session.category,
        status: session.status,
        progress: evaluation.progress,
        result: evaluation.result,
        eventAuth: nextEventAuth.client,
        pointsAwarded: awardOutcome.pointsAwarded,
        awards: awardOutcome.awards,
        user: awardOutcome.user,
      });
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/complete', auth, async (req, res, next) => {
  try {
    return res.status(410).json({
      error: 'Endpoint legacy disabilitato. Il punteggio viene assegnato solo dal server.',
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
