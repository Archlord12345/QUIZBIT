import { buildFallbackQuestions, normalizeGenerationOptions } from './quiz-build.js';

const DEFAULT_OLLAMA_BASE = 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = 'smollm2:135m-instruct-q4_1';

export const getOllamaConfig = () => ({
  baseUrl: String(process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE).replace(
    /\/+$/,
    '',
  ),
  model: String(process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL).trim(),
  enabled: process.env.OLLAMA_DISABLED !== '1',
});

const requestWithTimeout = async (url, options = {}, timeoutMs = 120000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const buildBatchPrompt = (prompt, count, options = {}) => {
  const questionType = options.questionType || 'mixed';
  const choiceCount = Math.max(2, Math.min(5, Number(options.choiceCount || 4)));
  return [
    `Theme: ${prompt}`,
    `Genere ${count} questions de quiz en francais.`,
    questionType === 'open'
      ? 'Uniquement questions ouvertes (type open, sans options).'
      : questionType === 'mcq'
      ? `Uniquement QCM avec ${choiceCount} options (type mcq).`
      : 'Melange QCM et questions ouvertes.',
    'Reponds en JSON: {"questions":[{"id":"1","text":"...","answer":"...","options":["A","B"],"type":"mcq"}]}',
  ].join('\n');
};

const buildSinglePrompt = (prompt, index, options = {}) => {
  const choiceCount = Math.max(2, Math.min(5, Number(options.choiceCount || 4)));
  const letters = Array.from({ length: choiceCount }, (_, i) =>
    String.fromCharCode(65 + i),
  ).join(', ');
  return [
    `Theme: ${prompt}`,
    `Question ${index + 1} de quiz en francais.`,
    `Reponds en une ligne JSON compact: {"text":"...","answer":"...","options":[${letters.split(', ').map(() => '"..."').join(',')}] ,"type":"mcq"}`,
  ].join('\n');
};

const extractJsonObject = text => {
  const clean = String(text || '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    return null;
  }
};

const normalizeQuestion = (item, index, options = {}) => {
  if (!item || typeof item !== 'object') return null;
  const text = String(item.text || item.question || '').trim();
  const answer = String(item.answer || item.reponse || item.correct || '').trim();
  const requestedType = item.type === 'open' ? 'open' : 'mcq';
  const questionType = options.questionType || 'mixed';
  const choiceCount = Math.max(2, Math.min(5, Number(options.choiceCount || 4)));
  const rawOptions = Array.isArray(item.options)
    ? item.options.map(option => String(option).trim()).filter(Boolean)
    : Array.isArray(item.choices)
    ? item.choices.map(option => String(option).trim()).filter(Boolean)
    : [];

  if (!text || !answer) return null;
  if (
    questionType === 'mcq' &&
    (requestedType === 'open' || rawOptions.length < 2)
  ) {
    return null;
  }
  if (
    questionType === 'open' ||
    requestedType === 'open' ||
    rawOptions.length < 2
  ) {
    return {
      id: String(item.id || `open-${index + 1}`),
      text,
      answer,
      exactAnswer: options.openAnswerMode === 'exact',
      type: 'open',
    };
  }
  const optionsList = rawOptions.includes(answer)
    ? rawOptions
    : [answer, ...rawOptions.filter(option => option !== answer)];
  return {
    id: String(item.id || `mcq-${index + 1}`),
    text,
    answer,
    options: optionsList.slice(0, choiceCount),
    type: 'mcq',
  };
};

const parseQuestionsPayload = (text, count, options = {}) => {
  const object = extractJsonObject(text);
  if (!object) return [];
  const list = Array.isArray(object)
    ? object
    : Array.isArray(object.questions)
    ? object.questions
    : [object];
  return list
    .map((item, index) => normalizeQuestion(item, index, options))
    .filter(Boolean)
    .slice(0, count);
};

const callOllama = async (prompt, predict = 700, modelOverride = null) => {
  const { baseUrl, model: defaultModel } = getOllamaConfig();
  const model = modelOverride || defaultModel;
  const response = await requestWithTimeout(
    `${baseUrl}/api/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.15, num_predict: predict },
      }),
    },
    90000,
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Ollama HTTP ${response.status}`);
  }
  return String(data.response || '');
};

export const listOllamaModels = async () => {
  const { baseUrl } = getOllamaConfig();
  const response = await requestWithTimeout(`${baseUrl}/api/tags`, {}, 5000);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Ollama HTTP ${response.status}`);
  }
  return data.models || [];
};

export const isOllamaAvailable = async (modelOverride = null) => {
  const { enabled, model: defaultModel } = getOllamaConfig();
  if (!enabled) return false;
  const model = modelOverride || defaultModel;
  try {
    const models = await listOllamaModels();
    const names = models.map(entry => entry.name);
    const root = model.split(':')[0];
    return names.some(
      name => name === model || name.startsWith(`${root}:`) || name === root,
    );
  } catch {
    return false;
  }
};

export const testOllama = async (modelOverride = null) => {
  const { model: defaultModel } = getOllamaConfig();
  const model = modelOverride || defaultModel;
  await callOllama('Reponds {"ok":true}', 40, model);
  return { model, message: `Ollama OK (${model})` };
};

export const generateQuestionsWithOllama = async (
  prompt,
  count,
  body = {},
  mediaPayload = null,
) => {
  const options = normalizeGenerationOptions(body);
  const modelOverride = String(body.model || '').trim() || null;
  const { model: defaultModel } = getOllamaConfig();
  const model = modelOverride || defaultModel;

  let theme = String(prompt || '').trim();
  if (mediaPayload?.textContent) {
    theme += `\nSupport: ${String(mediaPayload.textContent).slice(0, 4000)}`;
  }

  let questions = [];
  let usedFallback = false;

  try {
    const batchText = await callOllama(
      buildBatchPrompt(theme, count, options),
      Math.min(3500, count * 450),
      model,
    );
    questions = parseQuestionsPayload(batchText, count, options);
  } catch {
    questions = [];
  }

  let index = questions.length;
  while (index < count) {
    try {
      const singleText = await callOllama(
        buildSinglePrompt(theme, index, options),
        500,
        model,
      );
      const parsed = parseQuestionsPayload(singleText, 1, options);
      if (parsed[0]) {
        questions.push({ ...parsed[0], id: parsed[0].id || `q-${index + 1}` });
      }
    } catch {
      // ignore single-question errors
    }
    index = questions.length;
    if (index < count) {
      const fillers = buildFallbackQuestions(theme, count - index, options).map(
        (item, fillerIndex) => ({
          ...item,
          id: item.id || `fallback-${index + fillerIndex + 1}`,
        }),
      );
      questions.push(...fillers);
      usedFallback = true;
      break;
    }
  }

  questions = questions.slice(0, count);
  if (!questions.length) {
    throw new Error(`Ollama (${model}): aucune question exploitable.`);
  }

  return {
    provider: 'ollama',
    model,
    questions,
    offlineNote: usedFallback
      ? `Ollama (${model}): certaines questions completees par le modele local.`
      : `Genere localement via Ollama (${model}).`,
    fallbackFrom: usedFallback ? 'ollama-partial' : undefined,
  };
};
