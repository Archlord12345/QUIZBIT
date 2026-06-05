import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const MODEL = String(process.env.OLLAMA_MODEL || 'smollm2:135m-instruct-q4_1').trim();
const BASE = String(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(
  /\/+$/,
  '',
);

const hasOllamaCli = () => {
  try {
    execSync('command -v ollama', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const fetchTags = async (timeoutMs = 5000) => {
  const response = await fetch(`${BASE}/api/tags`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`Ollama HTTP ${response.status}`);
  }
  return response.json();
};

const isDaemonUp = async () => {
  try {
    await fetchTags(3000);
    return true;
  } catch {
    return false;
  }
};

const isModelInstalled = async () => {
  const data = await fetchTags();
  const names = (data.models || []).map(entry => String(entry.name || ''));
  const root = MODEL.split(':')[0];
  return names.some(
    name => name === MODEL || name.startsWith(`${root}:`) || name === root,
  );
};

const startDaemon = async () => {
  const child = spawn('ollama', ['serve'], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await sleep(500);
    if (await isDaemonUp()) {
      return true;
    }
  }
  return false;
};

const pullModel = () => {
  console.log(`[ollama] Telechargement du modele ${MODEL} (~98 Mo)...`);
  execSync(`ollama pull "${MODEL}"`, { stdio: 'inherit' });
};

const smokeTest = async () => {
  const response = await fetch(`${BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt: 'Reponds {"ok":true}',
      stream: false,
      format: 'json',
      options: { num_predict: 16, temperature: 0 },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || `Test Ollama HTTP ${response.status}`);
  }
};

const main = async () => {
  if (process.env.OLLAMA_DISABLED === '1') {
    console.log('[ollama] Desactive (OLLAMA_DISABLED=1).');
    return;
  }

  if (!hasOllamaCli()) {
    console.warn(
      '[ollama] CLI absente — installe https://ollama.com puis relance npm start',
    );
    return;
  }

  if (!(await isDaemonUp())) {
    console.log('[ollama] Demarrage du service ollama serve...');
    if (!(await startDaemon())) {
      console.warn('[ollama] Service non demarre. Lance manuellement: ollama serve');
      return;
    }
  }

  if (!(await isModelInstalled())) {
    pullModel();
  } else {
    console.log(`[ollama] Modele deja present: ${MODEL}`);
  }

  await smokeTest();
  console.log(`[ollama] Pret — generation IA locale active (${MODEL})`);
};

main().catch(error => {
  console.warn(
    `[ollama] Configuration incomplete: ${error?.message || error}`,
  );
  console.warn('[ollama] Le serveur demarre quand meme (fallback questions locales).');
  process.exitCode = 0;
});
