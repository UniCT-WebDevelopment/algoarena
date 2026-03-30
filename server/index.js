const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const browserGuard = require('./middleware/browser-guard');
const authRoutes = require('./routes/auth');
const codeRoutes = require('./routes/code');
const leaderboardRoutes = require('./routes/leaderboard');
const chatRoutes = require('./routes/chat');
const progressRoutes = require('./routes/progress');
const securityRoutes = require('./routes/security');
const usersRoutes = require('./routes/users');
const { PORT, MONGODB_URI, CLIENT_ORIGINS } = require('./config');

const app = express();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(
  cors({
    origin: CLIENT_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);
app.use('/api', browserGuard);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/users', usersRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('API error:', err);
  res.status(500).json({ error: 'Errore interno del server' });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`MongoDB connesso: ${MONGODB_URI}`);
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server attivo su http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Errore connessione MongoDB:', error);
    process.exit(1);
  });
