import AIModel, { Question } from '../models/AIModel';
import { apiPost } from '../utils/api';
import { UserAccount } from './AuthController';

export type BattleRoyaleMode = 'classic' | 'timed_mcq';

export type BattleRoyaleConfig = {
  mode: BattleRoyaleMode;
  theme: string;
  maxPlayers: number;
  questionCount: number;
  eliminationScore: number;
  timeLimitSeconds: number;
};

export type BattleRoyaleChatMessage = {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
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
  chatMessages?: BattleRoyaleChatMessage[];
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


  async getRoom(code: string, account: UserAccount): Promise<BattleRoyaleRoom> {
    this.assertAuthenticated(account);
    const response = await apiPost<BattleRoomResponse>('/api/battle-room-get', {
      code: code.trim().toUpperCase(),
      idToken: account.idToken,
    });
    return response.room;
  }

  async sendChatMessage(
    room: BattleRoyaleRoom,
    account: UserAccount,
    text: string,
  ): Promise<BattleRoyaleRoom> {
    this.assertAuthenticated(account);
    const response = await apiPost<BattleRoomResponse>('/api/battle-room-chat', {
      account,
      code: room.code,
      idToken: account.idToken,
      text,
    });
    return response.room;
  }

  async deleteRoom(
    room: BattleRoyaleRoom,
    account: UserAccount,
  ): Promise<void> {
    this.assertAuthenticated(account);
    await apiPost<{ ok: boolean }>('/api/battle-room-delete', {
      account,
      code: room.code,
      idToken: account.idToken,
    });
  }

  async startRoom(room: BattleRoyaleRoom, host?: UserAccount): Promise<BattleRoyaleRoom> {
    if (host) this.assertAuthenticated(host);
    const questions = await AIModel.generateQuestions(room.config.theme, {
      choiceCount: 4,
      count: room.config.questionCount,
      questionType: room.config.mode === 'timed_mcq' ? 'mcq' : 'mixed',
    });
    const response = await apiPost<BattleRoomResponse>('/api/battle-room-start', {
      account: host,
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
      mode: config.mode === 'timed_mcq' ? 'timed_mcq' : 'classic',
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
      timeLimitSeconds: Math.max(5, Math.min(120, Math.floor(config.timeLimitSeconds || 15))),
    };
  }

  private assertAuthenticated(account: UserAccount) {
    if (!account.idToken) {
      throw new Error('Session Vercel/Firebase manquante. Reconnecte-toi.');
    }
  }
}

export default new BattleRoyaleController();
