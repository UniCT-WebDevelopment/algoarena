/* eslint-disable no-console */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../server/models/User');

const FIRST_NAMES = [
  'Luca', 'Marco', 'Francesco', 'Alessandro', 'Matteo', 'Andrea', 'Giuseppe', 'Antonio',
  'Davide', 'Riccardo', 'Federico', 'Gabriele', 'Simone', 'Stefano', 'Paolo', 'Nicola',
  'Giulia', 'Sara', 'Francesca', 'Chiara', 'Martina', 'Elisa', 'Valentina', 'Alessia',
  'Maria', 'Sofia', 'Aurora', 'Elena', 'Beatrice', 'Alice', 'Roberta', 'Claudia',
];

const LAST_NAMES = [
  'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Gallo', 'Costa',
  'Fontana', 'Moretti', 'Conti', 'Marino', 'Greco', 'Lombardi', 'Barbieri', 'Giordano',
  'Mancini', 'Rizzo', 'Lombardo', 'Colombo', 'Ricci', 'Caruso', 'Ferrara', 'Longo',
  'Leone', 'Sorrentino', 'De Luca', 'Martini', 'Mariani', 'Rinaldi', 'Ferri', 'Gatti',
];

const CATEGORIES = ['code', 'heap', 'rbTree', 'graphs', 'master', 'huffman', 'dp', 'hashTable'];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z.]/g, '');
}

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

async function main() {
  const countArg = process.argv.find((arg) => arg.startsWith('--count='));
  const count = countArg ? Math.max(1, parseInt(countArg.split('=')[1], 10) || 0) : 20;
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/algo-arena';

  await mongoose.connect(uri);

  const topUser = await User.findOne({}).sort({ totalScore: -1 }).select('totalScore');
  const maxScore = topUser?.totalScore ?? 0;
  const maxAllowed = maxScore > 0 ? maxScore - 1 : 0;

  const passwordHash = await bcrypt.hash('Password123!', 10);
  const users = [];
  let suffix = Date.now();

  for (let i = 0; i < count; i += 1) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const name = `${first} ${last}`;
    let email = `${slugify(first)}.${slugify(last)}.${suffix}@algo-arena.it`;
    suffix += 1;

    const totalScore = maxAllowed > 0 ? Math.floor(Math.random() * (maxAllowed + 1)) : 0;

    const categoryScores = distributeScore(totalScore);

    users.push({
      name,
      email,
      passwordHash,
      totalScore,
      categoryScores,
      completedExercises: [],
    });
  }

  await User.insertMany(users, { ordered: false });
  console.log(`Inseriti ${users.length} utenti casuali. Max score attuale: ${maxScore}.`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('Errore seed utenti:', error);
  process.exit(1);
});
