/* eslint-disable no-console */
const mongoose = require('mongoose');
const User = require('../server/models/User');

const CATEGORIES = ['code', 'heap', 'rbTree', 'graphs', 'master', 'huffman', 'dp', 'hashTable'];

function distributeScore(total) {
  if (!total || total <= 0) return {};
  const weights = CATEGORIES.map(() => Math.random());
  const weightSum = weights.reduce((sum, v) => sum + v, 0) || 1;
  const allocations = weights.map((w) => Math.floor((w / weightSum) * total));
  let remainder = total - allocations.reduce((sum, v) => sum + v, 0);
  let index = 0;
  while (remainder > 0) {
    allocations[index % allocations.length] += 1;
    remainder -= 1;
    index += 1;
  }
  return CATEGORIES.reduce((acc, key, i) => {
    acc[key] = allocations[i];
    return acc;
  }, {});
}

function sumScores(scores) {
  if (!scores) return 0;
  return Object.values(scores).reduce((sum, v) => sum + (Number.isFinite(Number(v)) ? Number(v) : 0), 0);
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/algo-arena';
  await mongoose.connect(uri);

  const users = await User.find({ email: /@algo-arena\.it$/i }).select('totalScore categoryScores');
  let updated = 0;

  for (const user of users) {
    const totalScore = user.totalScore ?? 0;
    const current = user.categoryScores instanceof Map
      ? Object.fromEntries(user.categoryScores)
      : user.categoryScores || {};
    const currentSum = sumScores(current);
    if (currentSum === totalScore && currentSum !== 0) continue;
    const categoryScores = distributeScore(totalScore);
    user.categoryScores = categoryScores;
    await user.save();
    updated += 1;
  }

  console.log(`Aggiornati ${updated} utenti seed.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Errore fix seed:', error);
  process.exit(1);
});
