import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

const database_name = "QuizBit.db";

export const getDBConnection = async () => {
  return SQLite.openDatabase({ name: database_name, location: 'default' });
};

export const createTable = async (db: SQLite.SQLiteDatabase) => {
  const query = `CREATE TABLE IF NOT EXISTS Scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        theme TEXT NOT NULL,
        score INTEGER NOT NULL,
        date TEXT DEFAULT CURRENT_TIMESTAMP
    );`;
  await db.executeSql(query);
};

export const saveScore = async (db: SQLite.SQLiteDatabase, theme: string, score: number) => {
  const insertQuery = `INSERT INTO Scores (theme, score) VALUES (?, ?)`;
  return db.executeSql(insertQuery, [theme, score]);
};

export const getScores = async (db: SQLite.SQLiteDatabase) => {
  const scores: any[] = [];
  const results = await db.executeSql(`SELECT * FROM Scores ORDER BY date DESC`);
  results.forEach(result => {
    for (let index = 0; index < result.rows.length; index++) {
      scores.push(result.rows.item(index));
    }
  });
  return scores;
};
