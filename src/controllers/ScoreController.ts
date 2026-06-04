import AuthController, { UserAccount } from './AuthController';
import { apiPost } from '../utils/api';

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

type RecordScoreResponse = {
  ok: boolean;
  scoreEntry: ScoreEntry;
};

type LeaderboardResponse = {
  ok: boolean;
  scores: ScoreEntry[];
};

class ScoreController {
  async recordScore(
    account: UserAccount,
    theme: string,
    score: number,
    mode: GameMode,
  ): Promise<{ account: UserAccount; scoreEntry: ScoreEntry }> {
    if (!account.idToken) {
      throw new Error('Session Vercel/Firebase manquante. Reconnecte-toi.');
    }

    const savedScore = await apiPost<RecordScoreResponse>(
      '/api/scores-record',
      {
        account,
        idToken: account.idToken,
        theme,
        score,
        mode,
      },
    );
    const updatedAccount = await AuthController.updateScoreStats(
      account,
      score,
    );
    return { account: updatedAccount, scoreEntry: savedScore.scoreEntry };
  }

  async getLeaderboard(
    mode?: GameMode,
    accountOverride?: UserAccount,
  ): Promise<ScoreEntry[]> {
    const account = accountOverride || AuthController.getCurrentAccount();
    if (!account?.idToken) {
      throw new Error('Session Vercel/Firebase manquante. Reconnecte-toi.');
    }
    const response = await apiPost<LeaderboardResponse>('/api/scores-list', {
      idToken: account.idToken,
      mode,
    });
    return response.scores;
  }
}

export default new ScoreController();
