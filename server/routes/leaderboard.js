const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit ?? '10', 10) || 10, 50);
    const users = await User.find({})
      .sort({ totalScore: -1, updatedAt: 1 })
      .limit(limit)
      .select('name totalScore categoryScores');

    const leaderboard = users.map((user) => {
      const categoryScores = user.categoryScores instanceof Map
        ? Object.fromEntries(user.categoryScores)
        : user.categoryScores || {};
      return {
        id: user._id.toString(),
        name: user.name,
        totalScore: user.totalScore ?? 0,
        categoryScores,
      };
    });

    res.json({ leaderboard });
  } catch (error) {
    next(error);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalScore = req.user.totalScore ?? 0;
    const higherScore = await User.countDocuments({ totalScore: { $gt: totalScore } });
    const rank = higherScore + 1;

    res.json({ rank, totalUsers, totalScore });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
