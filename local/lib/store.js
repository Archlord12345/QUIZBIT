import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const SEED_PATH = path.join(DATA_DIR, 'store.seed.json');

const defaultState = () => ({
  users: [
    {
      id: 'offline-demo',
      email: 'demo@local.quizbit',
      password: 'demo123',
      displayName: 'Joueur Demo',
      gamesPlayed: 0,
      totalScore: 0,
      bestScore: 0,
      avatarUrl: '',
    },
  ],
  quizzes: [
    {
      id: 'quiz-seed-1',
      theme: 'Culture generale',
      createdAt: new Date().toISOString(),
      questions: [
        {
          id: 'q1',
          text: 'Quelle est la capitale de la France ?',
          answer: 'Paris',
          options: ['Paris', 'Lyon', 'Marseille', 'Lille'],
          type: 'mcq',
        },
        {
          id: 'q2',
          text: 'Combien de continents existe-t-il sur Terre ?',
          answer: '7',
          options: ['5', '6', '7', '8'],
          type: 'mcq',
        },
        {
          id: 'q3',
          text: 'Qui a peint la Joconde ?',
          answer: 'Leonard de Vinci',
          type: 'open',
        },
      ],
    },
  ],
  scores: [],
  battleRooms: {},
  sessions: {},
});

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
};

export const loadStore = () => {
  ensureDataDir();
  if (!fs.existsSync(STORE_PATH)) {
    const seed = fs.existsSync(SEED_PATH)
      ? JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'))
      : defaultState();
    fs.writeFileSync(STORE_PATH, JSON.stringify(seed, null, 2));
    return seed;
  }
  try {
    return { ...defaultState(), ...JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')) };
  } catch {
    const seed = defaultState();
    saveStore(seed);
    return seed;
  }
};

export const saveStore = state => {
  ensureDataDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2));
};

export const mutateStore = mutator => {
  const state = loadStore();
  const next = mutator(state) || state;
  saveStore(next);
  return next;
};
