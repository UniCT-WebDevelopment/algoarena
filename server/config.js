const dotenv = require('dotenv');

dotenv.config();

const DEFAULT_JWT_SECRET = 'dev-secret-change-this';
const jwtSecret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
const authCookieName = process.env.AUTH_COOKIE_NAME || 'algo_arena_session';
const authCookieSameSite = process.env.AUTH_COOKIE_SAME_SITE || 'lax';
const securityClearanceCookieName = process.env.SECURITY_CLEARANCE_COOKIE_NAME || 'algo_arena_clearance';
const isProduction = process.env.NODE_ENV === 'production';
const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:4200')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && jwtSecret === DEFAULT_JWT_SECRET) {
  throw new Error('JWT_SECRET deve essere configurato in produzione.');
}

module.exports = {
  PORT: process.env.PORT || 3001,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/algo-arena',
  JWT_SECRET: jwtSecret,
  TOKEN_EXPIRES_IN: process.env.TOKEN_EXPIRES_IN || '7d',
  AUTH_COOKIE_NAME: authCookieName,
  AUTH_COOKIE_SAME_SITE: authCookieSameSite,
  AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE === 'true' || (isProduction && authCookieSameSite === 'none'),
  SECURITY_CLEARANCE_COOKIE_NAME: securityClearanceCookieName,
  SECURITY_CLEARANCE_TTL_MS: parseInt(process.env.SECURITY_CLEARANCE_TTL_MS || `${15 * 60 * 1000}`, 10),
  TURNSTILE_SITE_KEY: process.env.TURNSTILE_SITE_KEY || '',
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || '',
  TURNSTILE_EXPECTED_ACTION: process.env.TURNSTILE_EXPECTED_ACTION || 'security_challenge',
  CLIENT_ORIGIN: clientOrigins[0] || 'http://localhost:4200',
  CLIENT_ORIGINS: clientOrigins,
  RUNNER_URL: process.env.RUNNER_URL || 'http://localhost:4000',
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://ollama:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3.2:3b',
  OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
  PDF_DIR: process.env.PDF_DIR || '/data/pdfs',
  CHAT_CHUNK_SIZE: parseInt(process.env.CHAT_CHUNK_SIZE || '700', 10),
  CHAT_CHUNK_OVERLAP: parseInt(process.env.CHAT_CHUNK_OVERLAP || '100', 10),
  CHAT_MAX_CHUNKS: parseInt(process.env.CHAT_MAX_CHUNKS || '2000', 10),
  CHAT_MAX_CONTEXT_CHUNKS: parseInt(process.env.CHAT_MAX_CONTEXT_CHUNKS || '3', 10),
  CHAT_MAX_CONTEXT_CHARS: parseInt(process.env.CHAT_MAX_CONTEXT_CHARS || '3000', 10),
  CHAT_MIN_SCORE: parseFloat(process.env.CHAT_MIN_SCORE || '0.22'),
  CHAT_MAX_HISTORY_TURNS: parseInt(process.env.CHAT_MAX_HISTORY_TURNS || '12', 10),
  CHAT_MAX_HISTORY_CHARS: parseInt(process.env.CHAT_MAX_HISTORY_CHARS || '4000', 10),
  OLLAMA_NUM_CTX: parseInt(process.env.OLLAMA_NUM_CTX || '2048', 10),
  OLLAMA_NUM_PREDICT: parseInt(process.env.OLLAMA_NUM_PREDICT || '768', 10),
  OLLAMA_TEMPERATURE: parseFloat(process.env.OLLAMA_TEMPERATURE || '0.2'),
  OLLAMA_TOP_P: parseFloat(process.env.OLLAMA_TOP_P || '0.9'),
  OLLAMA_REPEAT_PENALTY: parseFloat(process.env.OLLAMA_REPEAT_PENALTY || '1.1'),
  CHAT_MIN_TOKEN_COVERAGE: parseFloat(process.env.CHAT_MIN_TOKEN_COVERAGE || '0.25'),
  CHAT_MIN_TOKEN_COUNT: parseInt(process.env.CHAT_MIN_TOKEN_COUNT || '3', 10),
  CHAT_MAX_EVIDENCE_QUOTES: parseInt(process.env.CHAT_MAX_EVIDENCE_QUOTES || '4', 10),
  CHAT_MAX_EVIDENCE_CHARS: parseInt(process.env.CHAT_MAX_EVIDENCE_CHARS || '160', 10),
};
