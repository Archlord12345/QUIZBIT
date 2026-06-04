import { loadStore, mutateStore, saveStore } from './store.js';

const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const json = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
};

const readBody = req =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

const normalize = value =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseOfflineToken = token => {
  const match = String(token || '').match(/^offline\.([^.]+)\./);
  return match?.[1] || null;
};

const issueToken = userId => `offline.${userId}.${Date.now()}`;

const getUserFromRequest = (body, state) => {
  const token = body.idToken || '';
  const userId = parseOfflineToken(token) || body.userId || body.account?.id;
  if (!userId) return null;
  return state.users.find(user => user.id === userId) || null;
};

const pickQuestions = (state, prompt, count, options = {}) => {
  const cleanPrompt = normalize(prompt);
  const ranked = [...state.quizzes].sort((a, b) => {
    const aFormat = a.format === 'quizbit-quiz-v1' ? 1 : 0;
    const bFormat = b.format === 'quizbit-quiz-v1' ? 1 : 0;
    if (bFormat !== aFormat) return bFormat - aFormat;
    const aTheme = normalize(a.theme);
    const bTheme = normalize(b.theme);
    const aScore = aTheme.includes(cleanPrompt) || cleanPrompt.includes(aTheme) ? 2 : 0;
    const bScore = bTheme.includes(cleanPrompt) || cleanPrompt.includes(bTheme) ? 2 : 0;
    return bScore - aScore;
  });

  const source = ranked[0]?.questions?.length
    ? ranked[0].questions
    : buildFallbackQuestions(prompt, count, options);

  return source.slice(0, count).map((question, index) => ({
    id: question.id || `offline-${index + 1}`,
    text: question.text,
    answer: question.answer,
    options: question.options,
    exactAnswer: Boolean(question.exactAnswer),
    type: question.type === 'open' ? 'open' : 'mcq',
  }));
};

const buildFallbackQuestions = (prompt, count, options) => {
  const theme = String(prompt || 'Quiz offline').trim();
  const questionType = options.questionType || 'mixed';
  const choiceCount = Math.max(2, Math.min(5, Number(options.choiceCount || 4)));
  const items = [];

  for (let index = 0; index < count; index += 1) {
    const useOpen =
      questionType === 'open' ||
      (questionType === 'mixed' && index % 2 === 1);
    if (useOpen) {
      items.push({
        id: uid('open'),
        text: `Question ouverte ${index + 1} sur ${theme}`,
        answer: `Reponse ${index + 1}`,
        type: 'open',
        exactAnswer: options.openAnswerMode === 'exact',
      });
      continue;
    }
    const answer = 'A';
    const optionsList = Array.from({ length: choiceCount }, (_, i) =>
      String.fromCharCode(65 + i),
    );
    items.push({
      id: uid('mcq'),
      text: `Question ${index + 1} sur ${theme}`,
      answer,
      options: optionsList,
      type: 'mcq',
    });
  }
  return items;
};

const accountFromUser = (user, idToken) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl || '',
  gamesPlayed: user.gamesPlayed,
  totalScore: user.totalScore,
  bestScore: user.bestScore,
  idToken,
});

export const handleOfflineApi = async (req, res, routeName) => {
  if (req.method === 'OPTIONS') {
    return json(res, 204, { ok: true });
  }

  if (req.method === 'GET' && routeName === 'health') {
    return json(res, 200, { ok: true, mode: 'offline', message: 'QuizBit local API' });
  }

  if (req.method === 'GET' && routeName === 'admin/state') {
    return json(res, 200, { ok: true, state: loadStore() });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return json(res, 405, { ok: false, message: 'Method not allowed' });
  }

  let body = {};
  try {
    body = await readBody(req);
  } catch {
    return json(res, 400, { ok: false, message: 'JSON invalide.' });
  }

  if (routeName === 'admin/state') {
    if (!body.state || typeof body.state !== 'object') {
      return json(res, 400, { ok: false, message: 'state requis.' });
    }
    saveStore({ ...loadStore(), ...body.state });
    return json(res, 200, { ok: true });
  }

  const state = loadStore();

  try {
    switch (routeName) {
      case 'auth-register': {
        const email = String(body.email || '')
          .trim()
          .toLowerCase();
        const password = String(body.password || '');
        const displayName =
          String(body.displayName || '').trim() || email.split('@')[0] || 'Player';
        if (!email.includes('@') || password.length < 6) {
          return json(res, 400, { ok: false, message: 'Email ou mot de passe invalide.' });
        }
        if (state.users.some(user => user.email === email)) {
          return json(res, 400, { ok: false, message: 'Un compte existe deja avec cet email.' });
        }
        const user = {
          id: uid('user'),
          email,
          password,
          displayName,
          gamesPlayed: 0,
          totalScore: 0,
          bestScore: 0,
          avatarUrl: '',
        };
        const next = mutateStore(s => ({ ...s, users: [user, ...s.users] }));
        const token = issueToken(user.id);
        return json(res, 200, {
          ok: true,
          account: accountFromUser(user, token),
        });
      }

      case 'auth-login': {
        const email = String(body.email || '')
          .trim()
          .toLowerCase();
        const password = String(body.password || '');
        const user = state.users.find(
          item => item.email === email && item.password === password,
        );
        if (!user) {
          return json(res, 400, { ok: false, message: 'Email ou mot de passe invalide.' });
        }
        const token = issueToken(user.id);
        return json(res, 200, {
          ok: true,
          account: accountFromUser(user, token),
        });
      }

      case 'generate-questions': {
        const prompt = String(body.prompt || body.theme || '').trim();
        const maxCount =
          String(body.source || '').trim() === 'offline-studio' ? 50 : 20;
        const count = Math.max(1, Math.min(maxCount, Number(body.count || 5)));
        if (!prompt && !body.mediaPayload) {
          return json(res, 400, { ok: false, message: 'Theme ou media requis.' });
        }
        const user = getUserFromRequest(body, state);
        if (!user && body.idToken) {
          return json(res, 401, { ok: false, message: 'Session offline invalide.' });
        }
        const questions = pickQuestions(state, prompt || 'Quiz audio offline', count, body);
        return json(res, 200, {
          ok: true,
          provider: 'offline',
          model: 'quizbit-local-store',
          questions,
          offlineNote: body.mediaPayload
            ? 'Mode offline: media analyse via quiz importe ou questions locales.'
            : undefined,
        });
      }

      case 'validate-answer': {
        const userAnswer = String(body.userAnswer || '').trim();
        const correctAnswer = String(body.correctAnswer || '').trim();
        if (!userAnswer || !correctAnswer) {
          return json(res, 400, {
            ok: false,
            message: 'userAnswer et correctAnswer requis.',
          });
        }
        const exact = Boolean(body.exactAnswer);
        const correct = exact
          ? userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
          : normalize(userAnswer) === normalize(correctAnswer) ||
            normalize(correctAnswer)
              .split(' ')
              .filter(word => word.length > 3)
              .every(word => normalize(userAnswer).includes(word));
        return json(res, 200, { ok: true, correct, mode: 'offline', provider: 'local' });
      }

      case 'scores-list': {
        const mode = body.mode;
        const scores = [...state.scores]
          .filter(score => !mode || score.mode === mode)
          .sort((a, b) => Number(b.score) - Number(a.score));
        return json(res, 200, { ok: true, scores });
      }

      case 'scores-record': {
        const user = getUserFromRequest(body, state);
        if (!user) {
          return json(res, 401, { ok: false, message: 'Compte offline requis.' });
        }
        const score = Math.max(0, Math.min(10000, Number(body.score || 0)));
        const scoreEntry = {
          id: uid('score'),
          userId: user.id,
          displayName: user.displayName,
          theme: String(body.theme || '').trim().slice(0, 120),
          score,
          mode: body.mode === 'battle_royale' ? 'battle_royale' : 'solo',
          createdAt: new Date().toISOString(),
        };
        mutateStore(s => ({
          ...s,
          scores: [scoreEntry, ...s.scores],
        }));
        return json(res, 200, { ok: true, scoreEntry });
      }

      case 'user-update-stats': {
        const user = getUserFromRequest(body, state);
        if (!user) return json(res, 401, { ok: false, message: 'Session offline invalide.' });
        const score = Math.max(0, Number(body.score || 0));
        const next = mutateStore(s => ({
          ...s,
          users: s.users.map(item =>
            item.id === user.id
              ? {
                  ...item,
                  gamesPlayed: item.gamesPlayed + 1,
                  totalScore: item.totalScore + score,
                  bestScore: Math.max(item.bestScore, score),
                }
              : item,
          ),
        }));
        const updated = next.users.find(item => item.id === user.id);
        return json(res, 200, {
          ok: true,
          account: accountFromUser(updated, body.idToken),
        });
      }

      case 'user-update-avatar': {
        const user = getUserFromRequest(body, state);
        if (!user) return json(res, 401, { ok: false, message: 'Session offline invalide.' });
        const next = mutateStore(s => ({
          ...s,
          users: s.users.map(item =>
            item.id === user.id
              ? { ...item, avatarUrl: String(body.avatarUrl || item.avatarUrl || '') }
              : item,
          ),
        }));
        const updated = next.users.find(item => item.id === user.id);
        return json(res, 200, {
          ok: true,
          account: accountFromUser(updated, body.idToken),
        });
      }

      case 'battle-room-create': {
        const user = getUserFromRequest(body, state);
        if (!user) return json(res, 401, { ok: false, message: 'Compte offline requis.' });
        const config = body.config || {};
        const code = Math.random().toString(36).slice(2, 8).toUpperCase();
        const room = {
          id: uid('room'),
          code,
          hostId: user.id,
          status: 'waiting',
          config: {
            mode: config.mode === 'timed_mcq' ? 'timed_mcq' : 'classic',
            theme: String(config.theme || 'culture generale').trim(),
            maxPlayers: Math.max(2, Math.min(100, Number(config.maxPlayers || 10))),
            questionCount: Math.max(3, Math.min(20, Number(config.questionCount || 5))),
            eliminationScore: Math.max(0, Number(config.eliminationScore || 20)),
            timeLimitSeconds: Math.max(5, Math.min(120, Number(config.timeLimitSeconds || 15))),
          },
          players: [
            {
              userId: user.id,
              displayName: user.displayName,
              score: 0,
              eliminated: false,
              finished: false,
            },
          ],
          chatMessages: [],
          createdAt: new Date().toISOString(),
        };
        mutateStore(s => ({ ...s, battleRooms: { ...s.battleRooms, [code]: room } }));
        return json(res, 200, { ok: true, room });
      }

      case 'battle-room-join': {
        const user = getUserFromRequest(body, state);
        const code = String(body.code || '').trim().toUpperCase();
        const room = state.battleRooms[code];
        if (!room) throw new Error('Salle introuvable.');
        if (room.status !== 'waiting') throw new Error('La partie a deja demarre.');
        const exists = room.players.some(player => player.userId === user.id);
        if (!exists) {
          room.players.push({
            userId: user.id,
            displayName: user.displayName,
            score: 0,
            eliminated: false,
            finished: false,
          });
        }
        mutateStore(s => ({ ...s, battleRooms: { ...s.battleRooms, [code]: room } }));
        return json(res, 200, { ok: true, room });
      }

      case 'battle-room-get': {
        const code = String(body.code || '').trim().toUpperCase();
        const room = state.battleRooms[code];
        if (!room) throw new Error('Salle introuvable.');
        return json(res, 200, { ok: true, room });
      }

      case 'battle-room-start': {
        const user = getUserFromRequest(body, state);
        const code = String(body.code || '').trim().toUpperCase();
        const room = state.battleRooms[code];
        if (!room) throw new Error('Salle introuvable.');
        if (room.hostId !== user.id) throw new Error('Seul l hote peut lancer la partie.');
        const questions =
          Array.isArray(body.questions) && body.questions.length
            ? body.questions
            : pickQuestions(state, room.config.theme, room.config.questionCount, body);
        room.status = 'active';
        room.questions = questions;
        room.chatMessages = [];
        mutateStore(s => ({ ...s, battleRooms: { ...s.battleRooms, [code]: room } }));
        return json(res, 200, { ok: true, room });
      }

      case 'battle-room-finish': {
        const user = getUserFromRequest(body, state);
        const code = String(body.code || '').trim().toUpperCase();
        const room = state.battleRooms[code];
        if (!room) throw new Error('Salle introuvable.');
        const score = Math.max(0, Number(body.score || 0));
        room.players = room.players.map(player =>
          player.userId === user.id
            ? {
                ...player,
                score,
                finished: true,
                eliminated: score < Number(room.config.eliminationScore || 0),
              }
            : player,
        );
        const allFinished = room.players.every(player => player.finished);
        if (allFinished) {
          room.status = 'finished';
          const winner = [...room.players].sort((a, b) => b.score - a.score)[0];
          room.winnerId = winner?.userId;
        }
        mutateStore(s => ({ ...s, battleRooms: { ...s.battleRooms, [code]: room } }));
        return json(res, 200, { ok: true, room });
      }

      case 'battle-room-chat': {
        const user = getUserFromRequest(body, state);
        const code = String(body.code || '').trim().toUpperCase();
        const room = state.battleRooms[code];
        if (!room) throw new Error('Salle introuvable.');
        const text = String(body.text || '').trim().slice(0, 500);
        if (!text) throw new Error('Message vide.');
        room.chatMessages = [
          ...(room.chatMessages || []),
          {
            id: uid('msg'),
            userId: user.id,
            displayName: user.displayName,
            text,
            createdAt: new Date().toISOString(),
          },
        ].slice(-100);
        mutateStore(s => ({ ...s, battleRooms: { ...s.battleRooms, [code]: room } }));
        return json(res, 200, { ok: true, room });
      }

      case 'battle-room-delete': {
        const user = getUserFromRequest(body, state);
        const code = String(body.code || '').trim().toUpperCase();
        const room = state.battleRooms[code];
        if (!room) throw new Error('Salle introuvable.');
        if (room.hostId !== user.id) throw new Error('Seul l hote peut supprimer la salle.');
        mutateStore(s => {
          const nextRooms = { ...s.battleRooms };
          delete nextRooms[code];
          return { ...s, battleRooms: nextRooms };
        });
        return json(res, 200, { ok: true });
      }

      case 'test-gemini':
        return json(res, 200, { ok: true, message: 'Mode offline: Gemini non requis.' });
      case 'test-mistral':
        return json(res, 200, { ok: true, message: 'Mode offline: Mistral non requis.' });
      case 'test-cloudinary':
        return json(res, 200, { ok: true, message: 'Mode offline: Cloudinary non requis.' });
      case 'test-firebase-auth':
        return json(res, 200, { ok: true, message: 'Mode offline: Firebase non requis.' });

      default:
        return json(res, 404, { ok: false, message: `Route inconnue: ${routeName}` });
    }
  } catch (error) {
    return json(res, 400, {
      ok: false,
      message: error.message || 'Erreur API offline.',
    });
  }
};
