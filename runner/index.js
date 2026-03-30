const express = require('express');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');
const { execFile, spawn } = require('child_process');
const util = require('util');

const execFileAsync = util.promisify(execFile);
const app = express();

app.use(express.json({ limit: '256kb' }));

const MAX_CODE_SIZE = 20000;
const COMPILE_TIMEOUT = 5000;
const RUN_TIMEOUT = 2000;
const MAX_BUFFER = 1024 * 1024;

async function compileAndRun({ language, code, input }) {
  if (!['c', 'cpp'].includes(language)) {
    return { error: 'Linguaggio non supportato' };
  }
  if (typeof code !== 'string' || code.length > MAX_CODE_SIZE) {
    return { error: 'Codice non valido' };
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'arena-'));
  const srcExt = language === 'c' ? 'c' : 'cpp';
  const srcPath = path.join(dir, `main.${srcExt}`);
  const binPath = path.join(dir, 'main');

  try {
    await fs.writeFile(srcPath, code, 'utf8');

    const compiler = language === 'c' ? 'gcc' : 'g++';
    const args = language === 'c'
      ? ['-O2', '-std=c11', srcPath, '-o', binPath]
      : ['-O2', '-std=c++17', srcPath, '-o', binPath];

    try {
      await execFileAsync(compiler, args, { timeout: COMPILE_TIMEOUT, maxBuffer: MAX_BUFFER });
    } catch (error) {
      return {
        compileError: error.stderr || error.stdout || error.message,
        exitCode: error.code ?? 1,
      };
    }

    const runResult = await new Promise((resolve) => {
      const child = spawn(binPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      let killed = false;
      let timedOut = false;
      let maxedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        killed = child.kill('SIGKILL');
      }, RUN_TIMEOUT);

      const onData = (chunk, which) => {
        if (maxedOut) return;
        const text = chunk.toString();
        if (which === 'out') stdout += text;
        else stderr += text;
        if (stdout.length + stderr.length > MAX_BUFFER) {
          maxedOut = true;
          killed = child.kill('SIGKILL');
        }
      };

      child.stdout.on('data', (chunk) => onData(chunk, 'out'));
      child.stderr.on('data', (chunk) => onData(chunk, 'err'));

      child.on('error', (error) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: 1,
          timedOut,
          signal: null,
          message: error.message ?? '',
        });
      });

      child.on('close', (code, signal) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: typeof code === 'number' ? code : 1,
          timedOut,
          signal,
          message: maxedOut ? 'Output troppo grande' : '',
        });
      });

      child.stdin.write(input ?? '');
      child.stdin.end();
    });

    if (process.env.RUNNER_DEBUG === '1' && runResult.exitCode !== 0) {
      // eslint-disable-next-line no-console
      console.error('Runtime error:', {
        exitCode: runResult.exitCode,
        signal: runResult.signal,
        timedOut: runResult.timedOut,
        message: runResult.message,
      });
    }

    return runResult;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

app.post('/run', async (req, res) => {
  const { language, code, input } = req.body || {};
  const result = await compileAndRun({ language, code, input });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.json(result);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Runner attivo su http://localhost:${PORT}`);
});
