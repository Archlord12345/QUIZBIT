import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import AIModel, { Question } from '../models/AIModel';
import {
  db,
  firebaseEnabled,
  firebaseMissingConfigMessage,
} from '../utils/firebase';
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

class BattleRoyaleController {
  async createRoom(
    host: UserAccount,
    config: BattleRoyaleConfig,
  ): Promise<BattleRoyaleRoom> {
    this.assertFirestoreReady();
    const room: BattleRoyaleRoom = {
      id: `room-${Date.now()}`,
      code: this.generateCode(),
      hostId: host.id,
      status: 'waiting',
      config: this.normalizeConfig(config),
      players: [this.createPlayer(host)],
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(collection(db!, 'battleRooms'), room.code), room);
    return room;
  }

  async joinRoom(
    code: string,
    account: UserAccount,
  ): Promise<BattleRoyaleRoom> {
    const room = await this.getRoom(code.trim().toUpperCase());
    if (!room) {
      throw new Error('Salle battle royale introuvable dans Firestore.');
    }
    if (room.status !== 'waiting') {
      throw new Error('Cette salle a deja demarre.');
    }
    if (room.players.length >= room.config.maxPlayers) {
      throw new Error('Cette salle est complete.');
    }

    const exists = room.players.some(player => player.userId === account.id);
    const updatedRoom = exists
      ? room
      : { ...room, players: [...room.players, this.createPlayer(account)] };
    await this.saveRoom(updatedRoom);
    return updatedRoom;
  }

  async startRoom(room: BattleRoyaleRoom): Promise<BattleRoyaleRoom> {
    const questions = await AIModel.generateQuestions(
      room.config.theme,
      room.config.questionCount,
    );
    const updatedRoom: BattleRoyaleRoom = {
      ...room,
      status: 'active',
      questions,
    };
    await this.saveRoom(updatedRoom);
    return updatedRoom;
  }

  async finishPlayer(
    room: BattleRoyaleRoom,
    account: UserAccount,
    score: number,
  ): Promise<BattleRoyaleRoom> {
    const latestRoom = (await this.getRoom(room.code)) || room;
    const players = latestRoom.players.map(player =>
      player.userId === account.id
        ? {
            ...player,
            score,
            finished: true,
            eliminated: score < latestRoom.config.eliminationScore,
          }
        : player,
    );
    const allFinished = players.every(player => player.finished);
    const survivors = players.filter(player => !player.eliminated);
    const winner = [...players].sort(
      (left, right) => right.score - left.score,
    )[0];
    const updatedRoom: BattleRoyaleRoom = {
      ...latestRoom,
      players,
      status: allFinished ? 'finished' : latestRoom.status,
      winnerId: allFinished
        ? survivors[0]?.userId || winner?.userId
        : latestRoom.winnerId,
    };
    await this.saveRoom(updatedRoom);
    return updatedRoom;
  }

  async getRoom(code: string): Promise<BattleRoyaleRoom | null> {
    this.assertFirestoreReady();
    const snapshot = await getDoc(doc(db!, 'battleRooms', code));
    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as BattleRoyaleRoom;
  }

  private async saveRoom(room: BattleRoyaleRoom) {
    this.assertFirestoreReady();
    await setDoc(
      doc(db!, 'battleRooms', room.code),
      { ...room },
      { merge: true },
    );
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

  private createPlayer(account: UserAccount): BattleRoyalePlayer {
    return {
      userId: account.id,
      displayName: account.displayName,
      score: 0,
      eliminated: false,
      finished: false,
    };
  }

  private generateCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  private assertFirestoreReady() {
    if (!firebaseEnabled || !db) {
      throw new Error(firebaseMissingConfigMessage);
    }
  }
}

export default new BattleRoyaleController();
