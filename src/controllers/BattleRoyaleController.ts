import AIModel, { Question } from '../models/AIModel';
import { apiPost } from '../utils/api';
import { UserAccount } from './AuthController';

export type BattleRoyaleConfig = {
  theme: string;
  maxPlayers: number;
  questionCount: number;
  eliminationScore: number;
};

export type BattleRoyalePlayer = {
  userId: string;
  displayName: string;
  score: number;
  eliminated: boolean;
  finished: boolean;
};

export type BattleRoyaleRoom = {
  id: string;
  code: string;
  hostId: string;
  status: 'waiting' | 'active' | 'finished';
  config: BattleRoyaleConfig;
  players: BattleRoyalePlayer[];
  questions?: Question[];
  winnerId?: string;
  createdAt: string;
};

type BattleRoomResponse = {
  ok: boolean;
  room: BattleRoyaleRoom;
};

class BattleRoyaleController {
  async createRoom(
    host: UserAccount,
    config: BattleRoyaleConfig,
  ): Promise<BattleRoyaleRoom> {
    this.assertAuthenticated(host);
    const response = await apiPost<BattleRoomResponse>('/api/battle-room-create', {
      account: host,
      config: this.normalizeConfig(config),
      idToken: host.idToken,
    });
    return response.room;
  }

  async joinRoom(
    code: string,
    account: UserAccount,
  ): Promise<BattleRoyaleRoom> {
    this.assertAuthenticated(account);
    const response = await apiPost<BattleRoomResponse>('/api/battle-room-join', {
      account,
      code: code.trim().toUpperCase(),
      idToken: account.idToken,
    });
    return response.room;
  }

  async startRoom(room: BattleRoyaleRoom, host?: UserAccount): Promise<BattleRoyaleRoom> {
    if (host) this.assertAuthenticated(host);
    const questions = await AIModel.generateQuestions(room.config.theme, {
      count: room.config.questionCount,
      questionType: 'mixed',
    });
    const response = await apiPost<BattleRoomResponse>('/api/battle-room-start', {
      code: room.code,
      idToken: host?.idToken,
      questions,
    });
    return response.room;
  }

  async finishPlayer(
    room: BattleRoyaleRoom,
    account: UserAccount,
    score: number,
  ): Promise<BattleRoyaleRoom> {
    this.assertAuthenticated(account);
    const response = await apiPost<BattleRoomResponse>('/api/battle-room-finish', {
      account,
      code: room.code,
      idToken: account.idToken,
      score,
    });
    return response.room;
  }

  private normalizeConfig(config: BattleRoyaleConfig): BattleRoyaleConfig {
    return {
      theme: config.theme.trim() || 'culture generale',
      maxPlayers: Math.max(
        2,
        Math.min(100, Math.floor(config.maxPlayers || 10)),
      ),
      questionCount: Math.max(
        3,
        Math.min(20, Math.floor(config.questionCount || 5)),
      ),
      eliminationScore: Math.max(0, Math.floor(config.eliminationScore || 20)),
    };
  }

  private assertAuthenticated(account: UserAccount) {
    if (!account.idToken) {
      throw new Error('Session Vercel/Firebase manquante. Reconnecte-toi.');
    }
  }
}

export default new BattleRoyaleController();
