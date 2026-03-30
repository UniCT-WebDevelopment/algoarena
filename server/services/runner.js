const { RUNNER_URL } = require('../config');

function normalizeOutput(output) {
  return output.replace(/\r\n/g, '\n').trim();
}

async function runCode({ language, code, input, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs ?? 3000);

  try {
    const response = await fetch(`${RUNNER_URL}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, code, input }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Runner error ${response.status}: ${message}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  normalizeOutput,
  runCode,
};
