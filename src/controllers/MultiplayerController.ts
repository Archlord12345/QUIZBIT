import AIModel, { Question } from '../models/AIModel';
import NetworkModel, { NetworkMessage } from '../models/NetworkModel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OfflinePlayer = {
  id: string;
  displayName: string;
  /** '127.0.0.1' for the local host player */
  ip: string;
  score: number;
  currentIndex: number;
  finished: boolean;
  lastSeen: number;
};

export type OfflineGameState = {
  status: 'lobby' | 'active' | 'finished';
  theme: string;
  questions: Question[];
  players: OfflinePlayer[];
  hostId: string;
};

// ---------------------------------------------------------------------------
// MultiplayerController singleton
// ---------------------------------------------------------------------------

class MultiplayerController {
  private gameState: OfflineGameState | null = null;
  private localPlayerId = '';
  private localDisplayName = '';
  private stateListener: ((state: OfflineGameState) => void) | null = null;
  private removeMsgHandler: (() => void) | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Register a callback invoked every time the game state changes. */
  setStateListener(fn: (state: OfflineGameState) => void): void {
    this.stateListener = fn;
  }

  getState(): OfflineGameState | null { return this.gameState; }
  isHost(): boolean { return this.gameState?.hostId === this.localPlayerId; }
  getLocalPlayerId(): string { return this.localPlayerId; }

  // ---- HOST side -----------------------------------------------------------

  /**
   * Create a game room on this device.
   * Opens a UDP socket, publishes a Zeroconf service and waits for players.
   */
  async hostGame(
    playerId: string,
    displayName: string,
    theme: string,
  ): Promise<OfflineGameState> {
    this.localPlayerId = playerId;
    this.localDisplayName = displayName;

    NetworkModel.initSocket(true);
    NetworkModel.publishService(displayName);

    this.gameState = {
      status: 'lobby',
      theme,
      questions: [],
      players: [
        {
          id: playerId,
          displayName,
          ip: '127.0.0.1',
          score: 0,
          currentIndex: 0,
          finished: false,
          lastSeen: Date.now(),
        },
      ],
      hostId: playerId,
    };

    this.removeMsgHandler = NetworkModel.onMessage((msg, fromIp) => {
      this.handleAsHost(msg, fromIp);
    });

    // Periodic ping to detect disconnected players
    this.pingTimer = setInterval(() => {
      if (!this.gameState) return;
      const ips = this.getRemotePlayerIps();
      if (ips.length === 0) return;
      NetworkModel.broadcast(
        { type: 'ping', playerId: this.localPlayerId, timestamp: Date.now() },
        ips,
      );
    }, 5000);

    this.emit();
    return this.gameState;
  }

  /**
   * Generate questions and start the game for all players (host only).
   */
  async startGame(questionCount: number): Promise<OfflineGameState> {
    if (!this.gameState) throw new Error('Aucune salle active.');

    const questions = await AIModel.generateQuestions(this.gameState.theme, {
      count: Math.max(3, Math.min(15, questionCount)),
      questionType: 'mcq',
      choiceCount: 4,
    });

    this.gameState = { ...this.gameState, questions, status: 'active' };
    this.broadcastState();
    this.emit();
    return this.gameState;
  }

  // ---- PLAYER side ---------------------------------------------------------

  /**
   * Discover a host on the local network and join their game.
   * Throws if no host is found within the discovery window.
   */
  async joinGame(playerId: string, displayName: string): Promise<void> {
    this.localPlayerId = playerId;
    this.localDisplayName = displayName;

    NetworkModel.initSocket(false);
    NetworkModel.startDiscovery();

    // Wait for Zeroconf resolution (up to 3 s)
    await new Promise<void>(resolve => setTimeout(resolve, 3000));

    const hostIp = NetworkModel.getHostIp();
    if (!hostIp) {
      NetworkModel.destroy();
      throw new Error(
        "Aucun hôte QuizBit trouvé sur ce réseau. Vérifie que l'hôte a lancé une salle et que vous êtes sur le même Wi-Fi.",
      );
    }

    this.removeMsgHandler = NetworkModel.onMessage(msg => {
      this.handleAsPlayer(msg);
    });

    // Announce ourselves to the host
    NetworkModel.sendTo(hostIp, {
      type: 'join',
      playerId,
      displayName,
      timestamp: Date.now(),
    });
  }

  // ---- SHARED --------------------------------------------------------------

  /**
   * Record a local player's answer result and propagate to host.
   * Must be called after each MCQ answer.
   */
  submitAnswer(questionIndex: number, isCorrect: boolean): void {
    if (!this.gameState) return;
    const player = this.gameState.players.find(p => p.id === this.localPlayerId);
    if (!player) return;

    if (isCorrect) player.score += 10;
    player.currentIndex = questionIndex + 1;
    if (player.currentIndex >= this.gameState.questions.length) {
      player.finished = true;
    }

    if (this.isHost()) {
      // Host computes completion locally
      if (this.gameState.players.every(p => p.finished)) {
        this.gameState.status = 'finished';
      }
      this.broadcastState();
    } else {
      // Players report their state to the host
      const hostIp = NetworkModel.getHostIp();
      if (hostIp) {
        NetworkModel.sendTo(hostIp, {
          type: 'score_update',
          playerId: this.localPlayerId,
          payload: {
            score: player.score,
            currentIndex: player.currentIndex,
            finished: player.finished,
          },
          timestamp: Date.now(),
        });
      }
    }

    this.emit();
  }

  /** Gracefully leave the current room and tear down networking. */
  leaveGame(): void {
    if (this.gameState && !this.isHost()) {
      const hostIp = NetworkModel.getHostIp();
      if (hostIp) {
        NetworkModel.sendTo(hostIp, {
          type: 'leave',
          playerId: this.localPlayerId,
          timestamp: Date.now(),
        });
      }
    }
    this.cleanup();
  }

  /** Full teardown (called on unmount or explicit leave). */
  cleanup(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    if (this.removeMsgHandler) { this.removeMsgHandler(); this.removeMsgHandler = null; }
    NetworkModel.destroy();
    this.gameState = null;
    this.stateListener = null;
  }

  // -------------------------------------------------------------------------
  // Private — host message handling
  // -------------------------------------------------------------------------

  private handleAsHost(msg: NetworkMessage, fromIp: string): void {
    if (!this.gameState) return;

    if (msg.type === 'join') {
      const alreadyIn = this.gameState.players.some(p => p.id === msg.playerId);
      if (!alreadyIn) {
        this.gameState.players.push({
          id: msg.playerId,
          displayName: msg.displayName ?? 'Joueur',
          ip: fromIp,
          score: 0,
          currentIndex: 0,
          finished: false,
          lastSeen: Date.now(),
        });
      }
      // Sync full state to the newcomer
      NetworkModel.sendTo(fromIp, {
        type: 'game_state',
        playerId: this.localPlayerId,
        payload: this.gameState,
        timestamp: Date.now(),
      });
      this.broadcastState();
      this.emit();
    } else if (msg.type === 'score_update') {
      const player = this.gameState.players.find(p => p.id === msg.playerId);
      if (player && msg.payload) {
        const p = msg.payload as {
          score: number;
          currentIndex: number;
          finished: boolean;
        };
        player.score = p.score;
        player.currentIndex = p.currentIndex;
        player.finished = p.finished;
        player.lastSeen = Date.now();
      }
      if (this.gameState.players.every(pl => pl.finished)) {
        this.gameState.status = 'finished';
      }
      this.broadcastState();
      this.emit();
    } else if (msg.type === 'pong') {
      const player = this.gameState.players.find(p => p.id === msg.playerId);
      if (player) player.lastSeen = Date.now();
    } else if (msg.type === 'leave') {
      this.gameState.players = this.gameState.players.filter(
        p => p.id !== msg.playerId,
      );
      this.broadcastState();
      this.emit();
    }
  }

  // -------------------------------------------------------------------------
  // Private — player message handling
  // -------------------------------------------------------------------------

  private handleAsPlayer(msg: NetworkMessage): void {
    if (msg.type === 'game_state') {
      // Merge incoming state but preserve local player's live progress
      // (in case of packet race condition)
      const incoming = msg.payload as OfflineGameState;
      if (this.gameState) {
        const localPlayer = incoming.players.find(
          p => p.id === this.localPlayerId,
        );
        const myLive = this.gameState.players.find(
          p => p.id === this.localPlayerId,
        );
        if (localPlayer && myLive) {
          localPlayer.score = Math.max(localPlayer.score, myLive.score);
          localPlayer.currentIndex = Math.max(
            localPlayer.currentIndex,
            myLive.currentIndex,
          );
          localPlayer.finished = localPlayer.finished || myLive.finished;
        }
      }
      this.gameState = incoming;
      this.emit();
    } else if (msg.type === 'ping') {
      const hostIp = NetworkModel.getHostIp();
      if (hostIp) {
        NetworkModel.sendTo(hostIp, {
          type: 'pong',
          playerId: this.localPlayerId,
          timestamp: Date.now(),
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private getRemotePlayerIps(): string[] {
    return (
      this.gameState?.players
        .filter(p => p.ip !== '127.0.0.1')
        .map(p => p.ip) ?? []
    );
  }

  private broadcastState(): void {
    const ips = this.getRemotePlayerIps();
    if (ips.length === 0) return;
    NetworkModel.broadcast(
      {
        type: 'game_state',
        playerId: this.localPlayerId,
        payload: this.gameState,
        timestamp: Date.now(),
      },
      ips,
    );
  }

  private emit(): void {
    if (this.gameState && this.stateListener) {
      this.stateListener({
        ...this.gameState,
        players: [...this.gameState.players],
      });
    }
  }
}

export default new MultiplayerController();
