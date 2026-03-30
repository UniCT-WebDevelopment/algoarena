const express = require('express');
const auth = require('../middleware/auth');
const { ChatIndex } = require('../services/chat-index');
const {
  OLLAMA_URL,
  OLLAMA_MODEL,
  OLLAMA_EMBED_MODEL,
  PDF_DIR,
  CHAT_MAX_CONTEXT_CHUNKS,
  CHAT_MAX_CONTEXT_CHARS,
  CHAT_MIN_SCORE,
  CHAT_MAX_HISTORY_TURNS,
  CHAT_MAX_HISTORY_CHARS,
  CHAT_CHUNK_SIZE,
  CHAT_CHUNK_OVERLAP,
  CHAT_MAX_CHUNKS,
  OLLAMA_NUM_CTX,
  OLLAMA_NUM_PREDICT,
  OLLAMA_TEMPERATURE,
  OLLAMA_TOP_P,
  OLLAMA_REPEAT_PENALTY,
  CHAT_MIN_TOKEN_COVERAGE,
  CHAT_MIN_TOKEN_COUNT,
  CHAT_MAX_EVIDENCE_QUOTES,
  CHAT_MAX_EVIDENCE_CHARS,
} = require('../config');

const router = express.Router();

const chatIndex = new ChatIndex({
  pdfDir: PDF_DIR,
  ollamaUrl: OLLAMA_URL,
  embedModel: OLLAMA_EMBED_MODEL,
  chunkSize: CHAT_CHUNK_SIZE,
  chunkOverlap: CHAT_CHUNK_OVERLAP,
  maxChunks: CHAT_MAX_CHUNKS,
});

chatIndex.ensureReady().catch(() => {
  // indexing failure is logged via error handler during first request
});

async function fetchWithRetry(url, options, retries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function ensureModel(model) {
  const tagsRes = await fetchWithRetry(`${OLLAMA_URL}/api/tags`, { method: 'GET' });
  if (!tagsRes.ok) {
    throw new Error('Impossibile verificare i modelli Ollama');
  }
  const tags = await tagsRes.json();
  const exists = Array.isArray(tags.models) && tags.models.some((m) => m.name === model);
  if (exists) return;

  const pullRes = await fetchWithRetry(`${OLLAMA_URL}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: false }),
  }, 5);

  if (!pullRes.ok) {
    const message = await pullRes.text();
    throw new Error(message || `Impossibile scaricare il modello ${model}`);
  }
}

async function generateChat(messages, overrides = {}) {
  await ensureModel(OLLAMA_MODEL);
  const options = {
    num_ctx: OLLAMA_NUM_CTX,
    num_predict: OLLAMA_NUM_PREDICT,
    temperature: OLLAMA_TEMPERATURE,
    top_p: OLLAMA_TOP_P,
    repeat_penalty: OLLAMA_REPEAT_PENALTY,
    ...overrides,
  };
  const response = await fetchWithRetry(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'LLM error');
  }

  const data = await response.json();
  return data.message?.content || '';
}

function ensureCompletionHint(answer) {
  const trimmed = String(answer || '').trim();
  if (!trimmed) return trimmed;
  const hint = 'Se vuoi, posso continuare.';
  if (trimmed.toLowerCase().endsWith('posso continuare.')) return trimmed;
  const lastChar = trimmed[trimmed.length - 1];
  const endsOk = ['.', '!', '?', ')', ']', '}', '"', '»'].includes(lastChar);
  if (!endsOk) {
    return `${trimmed}\n\n${hint}`;
  }
  return trimmed;
}

const STOP_WORDS = new Set([
  'il',
  'lo',
  'la',
  'i',
  'gli',
  'le',
  'un',
  'uno',
  'una',
  'di',
  'a',
  'da',
  'in',
  'su',
  'con',
  'per',
  'tra',
  'fra',
  'e',
  'ed',
  'o',
  'od',
  'ma',
  'che',
  'chi',
  'cosa',
  'come',
  'dove',
  'quando',
  'quanto',
  'quale',
  'quali',
  'del',
  'dello',
  'della',
  'dei',
  'degli',
  'delle',
  'al',
  'allo',
  'alla',
  'ai',
  'agli',
  'alle',
  'nel',
  'nello',
  'nella',
  'nei',
  'negli',
  'nelle',
  'sul',
  'sullo',
  'sulla',
  'sui',
  'sugli',
  'sulle',
  'dal',
  'dallo',
  'dalla',
  'dai',
  'dagli',
  'dalle',
  'mi',
  'ti',
  'si',
  'ci',
  'vi',
  'ne',
  'io',
  'tu',
  'lui',
  'lei',
  'noi',
  'voi',
  'loro',
  'questo',
  'questa',
  'questi',
  'queste',
  'quello',
  'quella',
  'quelli',
  'quelle',
  'e\'',
  'era',
  'sono',
  'sei',
  'sia',
  'siano',
  'essere',
  'avere',
  'ha',
  'hanno',
  'ho',
  'hai',
  'anche',
  'solo',
  'piu',
  'piu\'',
  'meno',
  'molto',
  'molti',
  'molte',
  'tanto',
  'tanti',
  'tante',
  'ogni',
  'qualche',
  'the',
  'a',
  'an',
  'of',
  'to',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'in',
  'on',
  'for',
  'with',
  'as',
  'by',
  'at',
]);

const MIN_TOKEN_LENGTH = 2;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9à-ü]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function extractKeywords(text) {
  const raw = tokenize(text);
  const filtered = raw.filter((token) => token.length >= MIN_TOKEN_LENGTH && !STOP_WORDS.has(token));
  const unique = [];
  const seen = new Set();
  for (const token of filtered) {
    if (seen.has(token)) continue;
    seen.add(token);
    unique.push(token);
  }
  return unique;
}

function computeTokenCoverage(question, context) {
  const keywords = extractKeywords(question);
  if (!keywords.length) {
    return {
      keywords,
      matched: 0,
      total: 0,
      coverage: 0,
    };
  }
  const contextLower = String(context || '').toLowerCase();
  let matched = 0;
  for (const token of keywords) {
    if (contextLower.includes(token)) {
      matched += 1;
    }
  }
  return {
    keywords,
    matched,
    total: keywords.length,
    coverage: matched / keywords.length,
  };
}

function clipSnippet(text, index, maxChars) {
  const limit = Math.max(40, maxChars || 160);
  const half = Math.floor(limit / 2);
  let start = Math.max(0, index - half);
  let end = Math.min(text.length, index + half);
  while (start > 0 && !/\s/.test(text[start - 1])) start -= 1;
  while (end < text.length && !/\s/.test(text[end])) end += 1;
  let snippet = text.slice(start, end).trim();
  if (snippet.length > limit) {
    snippet = snippet.slice(0, limit - 3).trim();
  }
  if (start > 0) snippet = `...${snippet}`;
  if (end < text.length) snippet = `${snippet}...`;
  return snippet;
}

function buildEvidenceBlock(question, matches) {
  const keywords = extractKeywords(question);
  if (!keywords.length) return '';
  const quotes = [];
  const seen = new Set();
  for (const match of matches) {
    if (quotes.length >= CHAT_MAX_EVIDENCE_QUOTES) break;
    const text = String(match.text || '');
    const lower = text.toLowerCase();
    for (const token of keywords) {
      if (quotes.length >= CHAT_MAX_EVIDENCE_QUOTES) break;
      const idx = lower.indexOf(token);
      if (idx === -1) continue;
      const snippet = clipSnippet(text, idx, CHAT_MAX_EVIDENCE_CHARS);
      const key = `${match.source}:${snippet}`;
      if (seen.has(key)) continue;
      seen.add(key);
      quotes.push({ source: match.source, snippet });
    }
  }
  if (!quotes.length) return '';
  const lines = quotes.map((quote) => `- ${quote.snippet} (Fonte: ${quote.source})`);
  return `Estratti dal PDF:\n${lines.join('\n')}`;
}

function extractJsonObject(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function enforceTopicGuard(question, answer) {
  const checkMessages = [
    {
      role: 'system',
      content:
        'Sei un controllore di coerenza. Devi solo rispondere con JSON valido.',
    },
    {
      role: 'user',
      content:
        `Domanda: ${question}\n` +
        `Risposta: ${answer}\n\n` +
        'Valuta se la risposta è coerente con la domanda. ' +
        'Rispondi ESCLUSIVAMENTE in JSON con questo schema: ' +
        '{"ok":true|false,"reason":"..."}.\n' +
        'Se ok=true, reason deve essere stringa vuota. ' +
        'Se ok=false, spiega brevemente il motivo.',
    },
  ];

  const result = await generateChat(checkMessages, { temperature: 0, top_p: 1, num_predict: 128 });
  const parsed = extractJsonObject(result);
  if (!parsed || typeof parsed.ok !== 'boolean') {
    return { ok: false, reason: 'Risposta del controllore non valida.' };
  }
  if (parsed.ok === false) {
    return { ok: false, reason: parsed.reason || '' };
  }
  return { ok: true };
}
router.post('/ask', auth, async (req, res, next) => {
  try {
    const question = String(req.body?.question || '').trim();
    if (question.length < 3) {
      return res.status(400).json({ error: 'Domanda non valida' });
    }
    const historyRaw = Array.isArray(req.body?.history) ? req.body.history : [];
    const trimmedHistory = historyRaw
      .filter((msg) => msg && (msg.role === 'user' || msg.role === 'assistant') && typeof msg.content === 'string')
      .slice(-CHAT_MAX_HISTORY_TURNS);
    let totalChars = 0;
    const history = [];
    for (let i = trimmedHistory.length - 1; i >= 0; i -= 1) {
      const content = trimmedHistory[i].content.trim();
      if (!content) continue;
      totalChars += content.length;
      if (totalChars > CHAT_MAX_HISTORY_CHARS) break;
      history.unshift({ role: trimmedHistory[i].role, content });
    }

    await ensureModel(OLLAMA_EMBED_MODEL);
    const matches = await chatIndex.search(question, CHAT_MAX_CONTEXT_CHUNKS);
    const filtered = matches.filter((m) => (m.score ?? 0) >= CHAT_MIN_SCORE);
    const rawContext = filtered
      .map((m, idx) => `Fonte ${idx + 1} (${m.source}): ${m.text}`)
      .join('\n\n');
    const context = rawContext.slice(0, CHAT_MAX_CONTEXT_CHARS);

    if (!context.trim()) {
      return res.json({
        answer:
          'Non ho trovato informazioni pertinenti nel PDF per rispondere con certezza. ' +
          'Puoi riformulare la domanda o indicare un punto specifico?',
      });
    }

    const coverage = computeTokenCoverage(question, context);
    if (coverage.total >= CHAT_MIN_TOKEN_COUNT && coverage.coverage < CHAT_MIN_TOKEN_COVERAGE) {
      return res.json({
        answer:
          'Nel PDF non trovo abbastanza riferimenti diretti alla tua domanda per rispondere con certezza. ' +
          'Puoi indicare un capitolo, una definizione o parole chiave piu specifiche?',
      });
    }

    const messages = [
      {
        role: 'system',
        content:
          'Sei un tutor di algoritmi. Rispondi in italiano in modo conciso e chiaro. ' +
          'Mantieni coerenza con la conversazione recente quando presente. ' +
          'Se noti errori nelle risposte precedenti, correggili esplicitamente. ' +
          'Usa SOLO le informazioni nel contesto PDF: non inventare nulla. ' +
          'Se il contesto non contiene la risposta, dillo esplicitamente e chiedi di riformulare. ' +
          'Non cambiare argomento: rispondi esattamente alla domanda dell’utente. ' +
          'Quando affermi qualcosa, cita brevemente la fonte con "Fonte N". ' +
          'Se la risposta è lunga e rischia di troncarla, termina con "Se vuoi, posso continuare.".',
      },
      {
        role: 'system',
        content: `Contesto PDF:\n${context || 'Nessun contesto disponibile.'}`,
      },
      ...history,
      { role: 'user', content: question },
    ];

    const rawAnswer = await generateChat(messages);
    const guard = await enforceTopicGuard(question, rawAnswer);
    if (!guard.ok) {
      return res.json({
        answer:
          'Non ho trovato una risposta sufficientemente coerente nel PDF. ' +
          'Puoi riformulare o chiedere un caso più specifico?',
      });
    }
    const evidenceBlock = buildEvidenceBlock(question, filtered);
    let finalAnswer = String(rawAnswer || '').trim();
    if (evidenceBlock) {
      finalAnswer = `${finalAnswer}\n\n${evidenceBlock}`;
    }
    finalAnswer = ensureCompletionHint(finalAnswer);
    return res.json({ answer: finalAnswer });
  } catch (error) {
    return next(error);
  }
});

router.post('/reindex', auth, async (req, res, next) => {
  try {
    await chatIndex.reindex();
    return res.json({ status: 'ok' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
