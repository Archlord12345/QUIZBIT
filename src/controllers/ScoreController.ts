import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import AuthController, { UserAccount } from './AuthController';
import { db, firebaseEnabled } from '../utils/firebase';

export type GameMode = 'solo' | 'battle_royale';

export type ScoreEntry = {
  id: string;
  userId: string;
  displayName: string;
  theme: string;
  score: number;
  mode: GameMode;
  createdAt: string;
};

const localScores: ScoreEntry[] = [];

class ScoreController {
  async recordScore(
    account: UserAccount,
    theme: string,
    score: number,
    mode: GameMode,
  ): Promise<{ account: UserAccount; scoreEntry: ScoreEntry }> {
    const scoreEntry: ScoreEntry = {
      id: `score-${Date.now()}`,
      userId: account.id,
      displayName: account.displayName,
      theme,
      score,
      mode,
      createdAt: new Date().toISOString(),
    };

    localScores.unshift(scoreEntry);

    if (firebaseEnabled && db && !account.isGuest) {
      const ref = await addDoc(collection(db, 'scores'), {
        ...scoreEntry,
        createdAt: Timestamp.fromDate(new Date(scoreEntry.createdAt)),
      });
      scoreEntry.id = ref.id;
    }

    const updatedAccount = await AuthController.updateScoreStats(
      account,
      score,
    );
    return { account: updatedAccount, scoreEntry };
  }

  async getLeaderboard(mode?: GameMode): Promise<ScoreEntry[]> {
    if (firebaseEnabled && db) {
      const snapshot = await getDocs(
        query(collection(db, 'scores'), orderBy('score', 'desc'), limit(25)),
      );
      return snapshot.docs
        .map(docSnapshot => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            userId: String(data.userId || ''),
            displayName: String(data.displayName || 'Player'),
            theme: String(data.theme || ''),
            score: Number(data.score || 0),
            mode: data.mode === 'battle_royale' ? 'battle_royale' : 'solo',
            createdAt:
              typeof data.createdAt?.toDate === 'function'
                ? data.createdAt.toDate().toISOString()
                : String(data.createdAt || new Date().toISOString()),
          } as ScoreEntry;
        })
        .filter(score => !mode || score.mode === mode);
    }

    return [...localScores]
      .filter(score => !mode || score.mode === mode)
      .sort((left, right) => right.score - left.score)
      .slice(0, 25);
  }
}

export default new ScoreController();
