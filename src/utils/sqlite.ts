type Score = {
  id: number;
  theme: string;
  score: number;
  date: string;
};

export type QuizBitDatabase = {
  scores: Score[];
};

const memoryDatabase: QuizBitDatabase = {
  scores: [],
};

export const getDBConnection = async (): Promise<QuizBitDatabase> => {
  return memoryDatabase;
};

export const createTable = async (_db: QuizBitDatabase) => {
  // The stable APK keeps score persistence in memory until a storage backend is wired.
};

export const saveScore = async (
  db: QuizBitDatabase,
  theme: string,
  score: number,
) => {
  db.scores.unshift({
    id: Date.now(),
    theme,
    score,
    date: new Date().toISOString(),
  });
};

export const getScores = async (db: QuizBitDatabase) => {
  return [...db.scores];
};
