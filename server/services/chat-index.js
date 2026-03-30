const fs = require('fs/promises');
const path = require('path');
const pdfParse = require('pdf-parse');

const DEFAULT_CHUNK_SIZE = 700;
const DEFAULT_CHUNK_OVERLAP = 100;

function chunkText(text, size = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_CHUNK_OVERLAP) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const chunks = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(normalized.length, start + size);
    chunks.push(normalized.slice(start, end));
    if (end === normalized.length) break;
    start = end - overlap;
  }
  return chunks;
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

class ChatIndex {
  constructor({ pdfDir, ollamaUrl, embedModel, chunkSize, chunkOverlap, maxChunks }) {
    this.pdfDir = pdfDir;
    this.ollamaUrl = ollamaUrl;
    this.embedModel = embedModel;
    this.chunkSize = chunkSize || DEFAULT_CHUNK_SIZE;
    this.chunkOverlap = chunkOverlap || DEFAULT_CHUNK_OVERLAP;
    this.maxChunks = maxChunks || 2000;
    this.chunks = [];
    this.ready = false;
    this.indexing = null;
  }

  async ensureReady() {
    if (this.ready) return;
    if (!this.indexing) {
      this.indexing = this.buildIndex();
    }
    await this.indexing;
  }

  async reindex() {
    this.ready = false;
    this.indexing = this.buildIndex();
    await this.indexing;
  }

  async buildIndex() {
    try {
      const files = await fs.readdir(this.pdfDir);
      const pdfFiles = files.filter((file) => file.toLowerCase().endsWith('.pdf'));
      const chunks = [];

      for (const file of pdfFiles) {
        const filePath = path.join(this.pdfDir, file);
        const data = await fs.readFile(filePath);
        const parsed = await pdfParse(data);
        const text = parsed.text || '';
        const partChunks = chunkText(text, this.chunkSize, this.chunkOverlap);
        for (const chunk of partChunks) {
          const embedding = await this.embed(chunk);
          if (!embedding) continue;
          chunks.push({ text: chunk, embedding, source: file });
          if (chunks.length >= this.maxChunks) break;
        }
        if (chunks.length >= this.maxChunks) break;
      }

      this.chunks = chunks;
      this.ready = true;
    } catch (error) {
      this.ready = false;
      this.chunks = [];
      throw error;
    }
  }

  async embed(text) {
    const response = await fetchWithRetry(`${this.ollamaUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.embedModel, prompt: text }),
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.embedding;
  }

  async search(query, topK = 4) {
    await this.ensureReady();
    if (!this.chunks.length) return [];
    const queryEmbedding = await this.embed(query);
    if (!queryEmbedding) return [];

    const scored = this.chunks.map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}

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

module.exports = { ChatIndex };
