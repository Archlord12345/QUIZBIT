import { Question } from '../models/AIModel';
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
    const response = await apiPost<BattleRoomResponse>('/api/battle-create', {
      account: host,
      config,
      idToken: host.idToken,
    });
    return response.room;
  }

  async joinRoom(
    code: string,
    account: UserAccount,
  ): Promise<BattleRoyaleRoom> {
    this.assertAuthenticated(account);
    const response = await apiPost<BattleRoomResponse>('/api/battle-join', {
      account,
      code,
      idToken: account.idToken,
    });
    return response.room;
  }

  async startRoom(
    room: BattleRoyaleRoom,
    account?: UserAccount,
  ): Promise<BattleRoyaleRoom> {
    const currentAccount = account || ({ idToken: undefined } as UserAccount);
    this.assertAuthenticated(currentAccount);
    const response = await apiPost<BattleRoomResponse>('/api/battle-start', {
      code: room.code,
      idToken: currentAccount.idToken,
    });
    return response.room;
  }

  async finishPlayer(
    room: BattleRoyaleRoom,
    account: UserAccount,
    score: number,
  ): Promise<BattleRoyaleRoom> {
    this.assertAuthenticated(account);
    const response = await apiPost<BattleRoomResponse>('/api/battle-finish', {
      account,
      code: room.code,
      idToken: account.idToken,
      score,
    });
    return response.room;
  }

  async getRoom(
    code: string,
    account: UserAccount,
  ): Promise<BattleRoyaleRoom | null> {
    this.assertAuthenticated(account);
    const response = await apiPost<{
      ok: boolean;
      room: BattleRoyaleRoom | null;
    }>('/api/battle-get', {
      code,
      idToken: account.idToken,
    });
    return response.room;
  }

  private assertAuthenticated(account: UserAccount) {
    if (!account.idToken) {
      throw new Error('Session Vercel/Firebase manquante. Reconnecte-toi.');
    }
  }
}

export default new BattleRoyaleController();
