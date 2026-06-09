import { createRequire } from 'node:module';
import { loadStore, mutateStore, saveStore } from './store.js';
import {
  buildFallbackQuestions,
  normalizeGenerationOptions,
} from './quiz-build.js';

const require = createRequire(import.meta.url);
const { buildDefaultAvatarUrl, resolveAvatarUrl } = require(
  '../../vercel/lib/default-avatar.js',
);
const {
  getSeasonKey,
  isDateInSeason,
  rankBestScoresForSeason,
} = require('../../vercel/lib/season.js');

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

const PLACEHOLDER_PLAYER_IDS = new Set(['offline-demo']);

const normalizeBattleRoom = room => {
  if (!room || typeof room !== 'object') return room;
  const players = Array.isArray(room.players) ? room.players : [];
  const realPlayers = players.filter(
    player => player?.userId && !PLACEHOLDER_PLAYER_IDS.has(player.userId),
  );
  const activePlayers = realPlayers.length > 0 ? realPlayers : players;
  let hostId = String(room.hostId || '').trim();
  const hostIsReal = hostId && activePlayers.some(player => player.userId === hostId);

  if (!hostIsReal && activePlayers.length > 0) {
    hostId = activePlayers[0].userId;
  } else if (!hostIsReal) {
    hostId = '';
  }

  return {
    ...room,
    hostId,
    players: activePlayers,
  };
};

const saveBattleRoom = (code, room) => {
  const normalized = normalizeBattleRoom(room);
  mutateStore(state => ({
    ...state,
    battleRooms: { ...state.battleRooms, [code]: normalized },
  }));
  return normalized;
};

const toLobbySummary = room => {
  const normalized = normalizeBattleRoom(room);
  const players = Array.isArray(normalized.players) ? normalized.players : [];
  const host =
    players.find(player => player.userId === normalized.hostId) || players[0] || null;
  return {
    code: String(room.code || room.id || '').trim().toUpperCase(),
    theme: String(room.config?.theme || 'Culture generale').trim(),
    status: room.status === 'active' ? 'active' : 'waiting',
    mode: room.config?.mode === 'timed_mcq' ? 'timed_mcq' : 'classic',
    playerCount: players.length,
    maxPlayers: Math.max(2, Number(room.config?.maxPlayers || 10)),
    hostName: host?.displayName || (normalized.hostId ? 'Hote' : 'En attente'),
    createdAt: normalized.createdAt || null,
  };
};

const battleRoomsList = state =>
  Object.values(state.battleRooms || {})
    .filter(Boolean)
    .filter(room => room.status === 'waiting' || room.status === 'active')
    .map(toLobbySummary)
    .sort(
      (left, right) =>
        new Date(right.createdAt || 0).getTime() -
        new Date(left.createdAt || 0).getTime(),
    );

const accountFromUser = (user, idToken) => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  avatarUrl: resolveAvatarUrl(user.avatarUrl, user.id, user.displayName),
  gamesPlayed: user.gamesPlayed,
  totalScore: user.totalScore,
  bestScore: user.bestScore,
  cups: Math.max(0, Number(user.cups || 0)),
  idToken,
});

const incrementOfflineUserCups = (state, userId, amount = 1) =>
  mutateStore(current => ({
    ...current,
    users: current.users.map(item =>
      item.id === userId
        ? {
            ...item,
            cups: Math.max(0, Number(item.cups || 0) + Math.max(0, Number(amount || 0))),
          }
        : item,
    ),
  }));

export const handleOfflineApi = async (req, res, routeName) => {
  if (req.method === 'OPTIONS') {
    return json(res, 204, { ok: true });
  }

  if (req.method === 'GET' && routeName === 'health') {
    let ollama = { enabled: false, available: false, model: '' };
    try {
      const { getOllamaConfig, isOllamaAvailable } = await import(
        './ollama-generate.js'
      );
      const config = getOllamaConfig();
      ollama = {
        enabled: config.enabled,
        model: config.model,
        available: await isOllamaAvailable(),
      };
    } catch {
      // ignore
    }
    return json(res, 200, {
      ok: true,
      mode: 'offline',
      message: 'QuizBit local API',
      ollama,
    });
  }

  if (req.method === 'GET' && routeName === 'test-ollama') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const model = url.searchParams.get('model');
      const { testOllama } = await import('./ollama-generate.js');
      const result = await testOllama(model);
      return json(res, 200, { ok: true, ...result });
    } catch (error) {
      return json(res, 502, {
        ok: false,
        message: error.message || 'Ollama indisponible.',
      });
    }
  }

  if (req.method === 'GET' && routeName === 'admin/state') {
    const { stateForPanel } = await import('./admin-crud.js');
    return json(res, 200, { ok: true, state: stateForPanel(loadStore()) });
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
    const { stateFromPanel } = await import('./admin-crud.js');
    saveStore({ ...loadStore(), ...stateFromPanel(body.state) });
    return json(res, 200, { ok: true });
  }

  if (routeName === 'admin/crud') {
    try {
      const { handleAdminCrud, stateForPanel } = await import('./admin-crud.js');
      const next = handleAdminCrud(body);
      return json(res, 200, { ok: true, state: stateForPanel(next) });
    } catch (error) {
      return json(res, 400, {
        ok: false,
        message: error.message || 'CRUD admin impossible.',
      });
    }
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
        const userId = uid('user');
        const user = {
          id: userId,
          email,
          password,
          displayName,
          gamesPlayed: 0,
          totalScore: 0,
          bestScore: 0,
          cups: 0,
          avatarUrl: buildDefaultAvatarUrl(userId, displayName),
        };
        mutateStore(s => ({ ...s, users: [user, ...s.users] }));
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
        let user = state.users.find(
          item => item.email === email && item.password === password,
        );
        if (!user) {
          return json(res, 400, { ok: false, message: 'Email ou mot de passe invalide.' });
        }
        if (!String(user.avatarUrl || '').trim()) {
          const next = mutateStore(s => ({
            ...s,
            users: s.users.map(item =>
              item.id === user.id
                ? {
                    ...item,
                    avatarUrl: buildDefaultAvatarUrl(item.id, item.displayName),
                  }
                : item,
            ),
          }));
          user = next.users.find(item => item.id === user.id) || user;
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

        const provider = String(body.provider || 'auto').trim();
        const wantsOllama = provider === 'ollama' || provider === 'auto';
        if (wantsOllama) {
          try {
            const { generateQuestionsWithOllama, isOllamaAvailable } =
              await import('./ollama-generate.js');
            if (await isOllamaAvailable()) {
              const result = await generateQuestionsWithOllama(
                prompt || 'Quiz depuis support media',
                count,
                body,
                body.mediaPayload,
              );
              return json(res, 200, { ok: true, ...result });
            }
            if (provider === 'ollama') {
              return json(res, 503, {
                ok: false,
                message:
                  'Ollama indisponible. Lance: npm run setup:ollama (dans local/).',
              });
            }
          } catch (error) {
            if (provider === 'ollama') {
              return json(res, 502, {
                ok: false,
                message: error.message || 'Generation Ollama impossible.',
              });
            }
          }
        }

        const questions = pickQuestions(
          state,
          prompt || 'Quiz audio offline',
          count,
          normalizeGenerationOptions(body),
        );
        return json(res, 200, {
          ok: true,
          provider: 'offline',
          model: 'quizbit-local-store',
          questions,
          fallbackFrom: wantsOllama ? 'ollama' : undefined,
          offlineNote: body.mediaPayload
            ? 'Ollama indisponible ou echec: questions depuis banque locale / generiques.'
            : wantsOllama
            ? 'Ollama indisponible: questions depuis banque locale ou generiques.'
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
        const seasonKey = String(body.season || getSeasonKey()).trim() || getSeasonKey();
        const scores = rankBestScoresForSeason(
          state.scores.filter(
            score =>
              isDateInSeason(score.createdAt, seasonKey) &&
              (!mode || score.mode === mode),
          ),
          seasonKey,
        )
          .slice(0, 50)
          .map(score => {
            const user = state.users.find(item => item.id === score.userId);
            return {
              ...score,
              avatarUrl: resolveAvatarUrl(
                user?.avatarUrl,
                score.userId,
                score.displayName || user?.displayName,
              ),
              cups: Math.max(0, Number(user?.cups || 0)),
            };
          });
        return json(res, 200, { ok: true, season: seasonKey, scores });
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
        const awardCup = Boolean(body.awardCup);
        const next = mutateStore(s => ({
          ...s,
          users: s.users.map(item =>
            item.id === user.id
              ? {
                  ...item,
                  gamesPlayed: item.gamesPlayed + 1,
                  totalScore: item.totalScore + score,
                  bestScore: Math.max(item.bestScore, score),
                  cups: Number(item.cups || 0) + (awardCup ? 1 : 0),
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
          questions: Array.isArray(config.questions)
            ? config.questions.slice(0, Math.max(3, Math.min(20, Number(config.questionCount || 5))))
            : [],
          quizSource: String(config.quizSource || '').trim(),
          createdAt: new Date().toISOString(),
        };
        return json(res, 200, { ok: true, room: saveBattleRoom(code, room) });
      }

      case 'battle-room-list': {
        getUserFromRequest(body, state);
        return json(res, 200, { ok: true, rooms: battleRoomsList(state) });
      }

      case 'battle-room-join': {
        const user = getUserFromRequest(body, state);
        if (!user) return json(res, 401, { ok: false, message: 'Compte offline requis.' });
        const code = String(body.code || '').trim().toUpperCase();
        let room = state.battleRooms[code];
        if (!room) throw new Error('Salle introuvable.');
        if (room.status !== 'waiting') throw new Error('La partie a deja demarre.');
        const players = Array.isArray(room.players) ? room.players : [];
        const exists = players.some(player => player.userId === user.id);
        if (!exists) {
          const maxPlayers = Math.max(2, Number(room.config?.maxPlayers || 10));
          const activeCount = players.filter(
            player => !PLACEHOLDER_PLAYER_IDS.has(player.userId),
          ).length;
          if (activeCount >= maxPlayers) throw new Error('Cette salle est complete.');
          room = {
            ...room,
            players: [
              ...players.filter(player => !PLACEHOLDER_PLAYER_IDS.has(player.userId)),
              {
                userId: user.id,
                displayName: user.displayName,
                score: 0,
                eliminated: false,
                finished: false,
              },
            ],
          };
        }
        return json(res, 200, { ok: true, room: saveBattleRoom(code, room) });
      }

      case 'battle-room-get': {
        const code = String(body.code || '').trim().toUpperCase();
        const room = state.battleRooms[code];
        if (!room) throw new Error('Salle introuvable.');
        return json(res, 200, { ok: true, room: saveBattleRoom(code, room) });
      }

      case 'battle-room-start': {
        const user = getUserFromRequest(body, state);
        if (!user) return json(res, 401, { ok: false, message: 'Compte offline requis.' });
        const code = String(body.code || '').trim().toUpperCase();
        const room = saveBattleRoom(code, state.battleRooms[code]);
        if (!room) throw new Error('Salle introuvable.');
        if (room.status !== 'waiting') throw new Error('La partie a deja demarre.');
        const isPlayer = room.players.some(player => player.userId === user.id);
        if (!isPlayer) throw new Error('Rejoins le salon avant de lancer la partie.');
        const questions =
          Array.isArray(room.questions) && room.questions.length
            ? room.questions.slice(0, room.config.questionCount)
            : Array.isArray(body.questions) && body.questions.length
            ? body.questions
            : pickQuestions(state, room.config.theme, room.config.questionCount, body);
        const nextRoom = {
          ...room,
          status: 'active',
          questions,
          chatMessages: [],
        };
        return json(res, 200, { ok: true, room: saveBattleRoom(code, nextRoom) });
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
        let cupAwarded = false;
        let account = null;
        if (allFinished) {
          room.status = 'finished';
          const winner = [...room.players].sort((a, b) => b.score - a.score)[0];
          room.winnerId = winner?.userId;
        }
        mutateStore(s => ({ ...s, battleRooms: { ...s.battleRooms, [code]: room } }));
        if (allFinished && room.winnerId) {
          const nextState = incrementOfflineUserCups(loadStore(), room.winnerId);
          const winner = nextState.users.find(item => item.id === room.winnerId);
          if (winner && room.winnerId === user.id) {
            cupAwarded = true;
            account = accountFromUser(winner, body.idToken);
          }
        }
        return json(res, 200, { ok: true, room, cupAwarded, account });
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

      case 'cloudinary-upload': {
        const user = getUserFromRequest(body, state);
        if (!user) {
          return json(res, 401, { ok: false, message: 'Session offline invalide.' });
        }
        const imageBase64 = String(body.imageBase64 || '')
          .replace(/^data:[^;]+;base64,/, '')
          .trim();
        if (!imageBase64) {
          throw new Error('Image manquante.');
        }
        const mimeType = String(body.mimeType || 'image/jpeg');
        try {
          const { uploadImageBase64 } = await import(
            '../../vercel/lib/cloudinary-client.js'
          );
          const result = await uploadImageBase64({ imageBase64, mimeType });
          return json(res, 200, {
            ok: true,
            url: result.url,
            publicId: result.publicId,
          });
        } catch {
          return json(res, 200, {
            ok: true,
            url: `data:${mimeType};base64,${imageBase64}`,
          });
        }
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
