import { postPanelApi } from './panelApi.js';

export const PAGE_COLLECTION = {
  questions: 'quizzes',
  users: 'users',
  scores: 'scores',
  battle: 'battleRooms',
};

export const isCrudPage = page => Boolean(PAGE_COLLECTION[page]);

export const defaultDocument = page => {
  if (page === 'questions') {
    return {
      theme: 'Nouveau quiz',
      questions: [
        {
          id: 'q1',
          text: 'Question exemple ?',
          answer: 'Reponse',
          options: ['Reponse', 'Choix B', 'Choix C', 'Choix D'],
          type: 'mcq',
        },
      ],
      format: 'quizbit-quiz-v1',
      source: 'admin-panel',
    };
  }
  if (page === 'users') {
    return {
      displayName: 'Nouveau joueur',
      email: 'joueur@exemple.com',
      gamesPlayed: 0,
      cups: 0,
      totalScore: 0,
      bestScore: 0,
    };
  }
  if (page === 'scores') {
    return {
      displayName: 'Joueur',
      theme: 'Theme',
      score: 100,
      mode: 'solo',
    };
  }
  return {
    code: Math.random().toString(36).slice(2, 8).toUpperCase(),
    status: 'waiting',
    players: [],
    config: {
      theme: 'Culture generale',
      maxPlayers: 10,
      questionCount: 5,
      eliminationScore: 20,
      mode: 'classic',
      timeLimitSeconds: 15,
    },
  };
};

export const deleteFirestoreRecord = async (collection, id) => {
  const data = await postPanelApi('admin-firestore-delete', { collection, id });
  if (data.deleted === false) {
    throw new Error(
      data.message ||
        'Firestore non connecte (Parametres → Connecter Firestore).',
    );
  }
  return data;
};

export const upsertFirestoreRecord = async (collection, document, id) => {
  const data = await postPanelApi('admin-firestore-upsert', {
    collection,
    id: id || document?.id,
    document,
  });
  if (data.saved === false) {
    throw new Error(
      data.message ||
        'Firestore non connecte (Parametres → Connecter Firestore).',
    );
  }
  return data;
};
