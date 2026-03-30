const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { exercises } = require('../data/codeExercises');
const { normalizeOutput, runCode } = require('../services/runner');
const { computeAward } = require('../services/scoring');
const { auditRequestAnomaly, recordSecurityEvent } = require('../services/security-monitor');
const { enforceSecurityChallenge } = require('../services/security-challenge');
const { evaluateAutomationRisk } = require('../services/automation-risk');

const router = express.Router();

const MAX_CODE_LENGTH = 20000;
const STARTER_C = `#include <stdio.h>

int main() {
  return 0;
}
`;
const STARTER_CPP = `#include <iostream>

int main() {
  return 0;
}
`;

function buildStarterCode(languages = []) {
  const starterCode = {};
  if (languages.includes('c')) starterCode.c = STARTER_C;
  if (languages.includes('cpp')) starterCode.cpp = STARTER_CPP;
  return starterCode;
}

function simpleResult(testIndex, passed) {
  return { test: testIndex, passed };
}

function sanitizeExercise(exercise) {
  const { tests, starterCode, ...safe } = exercise;
  return { ...safe, starterCode: buildStarterCode(exercise.languages ?? []) };
}

router.get('/exercises', auth, (req, res) => {
  res.json({ exercises: exercises.map(sanitizeExercise) });
});

router.post('/submit', auth, async (req, res, next) => {
  try {
    const { exerciseId, language, code } = req.body;
    const durationMs = null;

    if (typeof exerciseId !== 'string' || !exerciseId.trim()) {
      return res.status(400).json({ error: 'Esercizio non valido' });
    }
    if (!['c', 'cpp'].includes(language)) {
      return res.status(400).json({ error: 'Linguaggio non supportato' });
    }
    if (typeof code !== 'string' || code.trim().length < 10 || code.length > MAX_CODE_LENGTH) {
      return res.status(400).json({ error: 'Codice non valido' });
    }

    const automationRisk = evaluateAutomationRisk(req, {
      requireRecentInteraction: true,
      maxInteractionAgeMs: 20 * 1000,
    });
    if (automationRisk.severe) {
      await recordSecurityEvent({
        scope: 'codeSubmit',
        severity: 'block',
        code: 'automation-risk-high',
        userId: req.user._id.toString(),
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
        metadata: {
          exerciseId: exerciseId.trim(),
          reasons: automationRisk.reasons,
          score: automationRisk.score,
        },
      });
      const challengeOutcome = await enforceSecurityChallenge(req, res, {
        scope: 'codeSubmit',
        reason: 'automation-risk-high',
        statusCode: 429,
        userId: req.user._id.toString(),
      });
      if (challengeOutcome !== true) {
        return challengeOutcome;
      }
    } else if (automationRisk.suspicious) {
      await recordSecurityEvent({
        scope: 'codeSubmit',
        severity: 'warn',
        code: 'automation-risk-medium',
        userId: req.user._id.toString(),
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
        metadata: {
          exerciseId: exerciseId.trim(),
          reasons: automationRisk.reasons,
          score: automationRisk.score,
        },
      });
    }

    const submitAudit = await auditRequestAnomaly({
      scope: 'codeSubmit',
      userId: req.user._id.toString(),
      ip: req.ip,
      userAgent: req.get('user-agent') || null,
      fingerprintSource: { exerciseId, language, code },
      metadata: {
        exerciseId: exerciseId.trim(),
        language,
        codeLength: code.length,
      },
    });
    if (submitAudit.blocked) {
      const challengeOutcome = await enforceSecurityChallenge(req, res, {
        scope: 'codeSubmit',
        reason: submitAudit.anomalies[0]?.code || 'code-submit-suspicious',
        statusCode: 429,
        userId: req.user._id.toString(),
      });
      if (challengeOutcome !== true) {
        return challengeOutcome;
      }
    }

    const exercise = exercises.find((item) => item.id === exerciseId);
    if (!exercise) {
      return res.status(404).json({ error: 'Esercizio non trovato' });
    }

    const attemptPath = `exerciseAttempts.${exerciseId}`;
    const attemptUser = await User.findByIdAndUpdate(
      req.user._id,
      { $inc: { [attemptPath]: 1 } },
      { new: true }
    );
    const attempts = attemptUser?.exerciseAttempts?.get(exerciseId) ?? 1;

    const results = [];

    for (let i = 0; i < exercise.tests.length; i += 1) {
      const test = exercise.tests[i];
      const runResult = await runCode({ language, code, input: test.input });

      if (runResult.compileError) {
        results.push(simpleResult(i + 1, false));
        break;
      }

      if (runResult.timedOut || runResult.exitCode !== 0) {
        results.push(simpleResult(i + 1, false));
        break;
      }

      const normalizedOutput = normalizeOutput(runResult.stdout ?? '');
      const expectedOutput = normalizeOutput(test.output);
      const passed = normalizedOutput === expectedOutput;

      results.push(simpleResult(i + 1, passed));

      if (!passed) {
        break;
      }
    }

    const correct = results.length === exercise.tests.length && results.every((r) => r.passed);

    let pointsAwarded = 0;
    let alreadyCompleted = false;
    let updatedUser = null;

    if (correct) {
      const failedAttempts = Math.max(0, attempts - 1);
      const { awarded } = computeAward({
        basePoints: exercise.points,
        durationMs: durationMs ?? undefined,
        errors: failedAttempts,
        attempts,
      });
      const scoreCategory = exercise.scoreCategory || exercise.category;
      const completion = {
        exerciseId,
        category: scoreCategory,
        pointsAwarded: awarded,
        basePoints: exercise.points,
        durationMs: durationMs ?? undefined,
        errors: failedAttempts,
        attempts,
        completedAt: new Date(),
      };
      const inc = {
        totalScore: awarded,
        [`categoryScores.${scoreCategory}`]: awarded,
      };

      updatedUser = await User.findOneAndUpdate(
        { _id: req.user._id, completedExercises: { $ne: exerciseId } },
        {
          $inc: inc,
          $addToSet: { completedExercises: exerciseId },
          $push: { completionHistory: completion },
        },
        { new: true }
      );

      if (updatedUser) {
        pointsAwarded = awarded;
      } else {
        alreadyCompleted = true;
        updatedUser = await User.findById(req.user._id);
      }
    }

    if (!updatedUser) {
      updatedUser = await User.findById(req.user._id);
    }

    const categoryScores = updatedUser.categoryScores instanceof Map
      ? Object.fromEntries(updatedUser.categoryScores)
      : updatedUser.categoryScores || {};

    return res.json({
      correct,
      pointsAwarded,
      alreadyCompleted,
      results,
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        totalScore: updatedUser.totalScore ?? 0,
        categoryScores,
        completedExercises: updatedUser.completedExercises ?? [],
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
