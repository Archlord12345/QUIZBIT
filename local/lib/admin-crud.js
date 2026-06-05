import { mutateStore } from './store.js';

const uid = prefix =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const ENTITIES = ['quizzes', 'users', 'scores', 'battleRooms'];

const battleRoomsToArray = battleRooms => {
  if (Array.isArray(battleRooms)) return battleRooms;
  if (!battleRooms || typeof battleRooms !== 'object') return [];
  return Object.values(battleRooms).filter(Boolean);
};

const battleRoomsToMap = rooms => {
  const list = Array.isArray(rooms) ? rooms : battleRoomsToArray(rooms);
  return list.reduce((map, room) => {
    if (!room) return map;
    const code = String(room.code || room.id || '').trim().toUpperCase();
    if (!code) return map;
    map[code] = { ...room, code };
    return map;
  }, {});
};

export const stateForPanel = state => ({
  ...state,
  battleRooms: battleRoomsToArray(state.battleRooms),
});

export const stateFromPanel = state => ({
  ...state,
  battleRooms: battleRoomsToMap(state.battleRooms),
});

const recalcUserStats = users => {
  return users.map(user => ({ ...user }));
};

const applyScoreStats = (users, scores) => {
  const byUser = new Map(users.map(user => [user.id, { ...user }]));
  for (const score of scores) {
    const user = byUser.get(score.userId);
    if (!user) continue;
    const value = Number(score.score) || 0;
    user.gamesPlayed += 1;
    user.totalScore += value;
    user.bestScore = Math.max(user.bestScore, value);
  }
  return Array.from(byUser.values());
};

export const handleAdminCrud = body => {
  const action = String(body.action || '').trim();
  const entity = String(body.entity || '').trim();
  const id = String(body.id || '').trim();
  const data = body.data && typeof body.data === 'object' ? body.data : null;

  if (!ENTITIES.includes(entity)) {
    throw new Error(`Entite invalide: ${entity}`);
  }

  if (action === 'delete') {
    if (!id) throw new Error('id requis pour supprimer.');
    return mutateStore(state => {
      if (entity === 'battleRooms') {
        const map = { ...state.battleRooms };
        const room = battleRoomsToArray(state.battleRooms).find(
          item => item.id === id || item.code === id,
        );
        if (room?.code) delete map[room.code];
        return { ...state, battleRooms: map };
      }
      const list = (state[entity] || []).filter(item => item.id !== id);
      const next = { ...state, [entity]: list };
      if (entity === 'scores') {
        next.users = applyScoreStats(next.users, next.scores);
      }
      return next;
    });
  }

  if (action === 'create' || action === 'update') {
    return mutateStore(state => {
      if (entity === 'battleRooms') {
        const map = { ...state.battleRooms };
        const existing = id
          ? battleRoomsToArray(state.battleRooms).find(
              item => item.id === id || item.code === id,
            )
          : null;
        const code = String(
          data?.code || existing?.code || Math.random().toString(36).slice(2, 8),
        )
          .trim()
          .toUpperCase();
        const room = {
          id: existing?.id || uid('battle'),
          code,
          status: data?.status || existing?.status || 'waiting',
          players: data?.players || existing?.players || [],
          chatMessages: data?.chatMessages || existing?.chatMessages || [],
          hostId: data?.hostId || existing?.hostId || '',
          config: {
            theme:
              data?.config?.theme ||
              data?.theme ||
              existing?.config?.theme ||
              'Culture generale',
            maxPlayers: Number(
              data?.config?.maxPlayers ?? existing?.config?.maxPlayers ?? 10,
            ),
            questionCount: Number(
              data?.config?.questionCount ??
                existing?.config?.questionCount ??
                5,
            ),
            eliminationScore: Number(
              data?.config?.eliminationScore ??
                existing?.config?.eliminationScore ??
                20,
            ),
            mode: data?.config?.mode || existing?.config?.mode || 'classic',
            timeLimitSeconds: Number(
              data?.config?.timeLimitSeconds ??
                existing?.config?.timeLimitSeconds ??
                15,
            ),
          },
          createdAt: existing?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        map[code] = room;
        return { ...state, battleRooms: map };
      }

      const list = [...(state[entity] || [])];
      const index = id ? list.findIndex(item => item.id === id) : -1;

      if (entity === 'quizzes') {
        const quiz = {
          id: id || uid('quiz'),
          theme: data?.theme || 'Quiz',
          questions: Array.isArray(data?.questions) ? data.questions : [],
          format: data?.format || 'quizbit-quiz-v1',
          createdAt:
            index >= 0 ? list[index].createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        if (index >= 0) list[index] = { ...list[index], ...quiz };
        else list.unshift(quiz);
        return { ...state, quizzes: list };
      }

      if (entity === 'users') {
        const user = {
          id: id || uid('user'),
          displayName: data?.displayName || 'Player',
          email: data?.email || 'player@local',
          password: data?.password || list[index]?.password || 'demo123',
          gamesPlayed: Number(
            data?.gamesPlayed ?? list[index]?.gamesPlayed ?? 0,
          ),
          totalScore: Number(data?.totalScore ?? list[index]?.totalScore ?? 0),
          bestScore: Number(data?.bestScore ?? list[index]?.bestScore ?? 0),
          avatarUrl: data?.avatarUrl || list[index]?.avatarUrl || '',
        };
        if (index >= 0) list[index] = { ...list[index], ...user };
        else list.unshift(user);
        return { ...state, users: list };
      }

      if (entity === 'scores') {
        const user = state.users.find(
          item => item.id === (data?.userId || list[index]?.userId),
        );
        const score = {
          id: id || uid('score'),
          userId: data?.userId || user?.id || '',
          displayName:
            data?.displayName || user?.displayName || list[index]?.displayName || 'Player',
          theme: data?.theme || 'Local',
          score: Math.max(0, Number(data?.score ?? list[index]?.score ?? 0)),
          mode: data?.mode === 'battle_royale' ? 'battle_royale' : 'solo',
          createdAt:
            index >= 0 ? list[index].createdAt : new Date().toISOString(),
        };
        if (index >= 0) list[index] = { ...list[index], ...score };
        else list.unshift(score);
        const users = applyScoreStats(state.users, list);
        return { ...state, scores: list, users };
      }

      return state;
    });
  }

  throw new Error('action invalide (create, update, delete).');
};
