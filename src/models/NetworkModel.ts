import Zeroconf from 'react-native-zeroconf';
import dgram from 'react-native-udp';
import { Buffer } from 'buffer';

// ---------------------------------------------------------------------------
// Message types
// ---------------------------------------------------------------------------
export type NetMsgType =
  | 'join'
  | 'leave'
  | 'score_update'
  | 'game_state'
  | 'ping'
  | 'pong';

export type NetworkMessage = {
  type: NetMsgType;
  playerId: string;
  displayName?: string;
  payload?: unknown;
  timestamp: number;
};

type MessageHandler = (message: NetworkMessage, fromIp: string) => void;
type PeerChangeHandler = (peers: Array<{ ip: string; name: string }>) => void;

// ---------------------------------------------------------------------------
// NetworkModel singleton
// ---------------------------------------------------------------------------
class NetworkModel {
  private zeroconf = new Zeroconf();
  private socket: any = null;
  private readonly port = 12345;

  /** ip → display-name */
  private peers: Map<string, string> = new Map();
  private hostIp: string | null = null;

  private msgHandlers: Set<MessageHandler> = new Set();
  private peerHandlers: Set<PeerChangeHandler> = new Set();

  constructor() {
    this.zeroconf.on('resolved', (service: any) => {
      const addresses: string[] = service.addresses ?? [];
      if (addresses.length === 0) return;
      const ip = addresses[0];
      this.peers.set(ip, service.name ?? 'Hôte');
      this.hostIp = ip;
      this.notifyPeers();
    });

    this.zeroconf.on('remove', (name: string) => {
      for (const [ip, n] of this.peers.entries()) {
        if (n === name) { this.peers.delete(ip); break; }
      }
      this.notifyPeers();
    });

    // Swallow internal Zeroconf errors so they don't crash the app
    this.zeroconf.on('error', () => {});
  }

  // -------------------------------------------------------------------------
  // Listener registration
  // -------------------------------------------------------------------------

  /** Subscribe to incoming UDP messages. Returns an unsubscribe function. */
  onMessage(handler: MessageHandler): () => void {
    this.msgHandlers.add(handler);
    return () => this.msgHandlers.delete(handler);
  }

  /** Subscribe to Zeroconf peer-list changes. Returns an unsubscribe function. */
  onPeersChange(handler: PeerChangeHandler): () => void {
    this.peerHandlers.add(handler);
    // Immediately emit current state
    handler(this.getPeers());
    return () => this.peerHandlers.delete(handler);
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  getPeers(): Array<{ ip: string; name: string }> {
    return Array.from(this.peers.entries()).map(([ip, name]) => ({ ip, name }));
  }

  getHostIp(): string | null { return this.hostIp; }

  // -------------------------------------------------------------------------
  // Socket
  // -------------------------------------------------------------------------

  initSocket(asHost: boolean): void {
    // Close any existing socket first
    this.closeSocket();

    this.socket = dgram.createSocket({ type: 'udp4' });
    this.socket.bind(this.port, () => {
      if (asHost) {
        try { this.socket?.setBroadcast(true); } catch {}
      }
    });

    this.socket.on('message', (msg: any, rinfo: any) => {
      try {
        const text = Buffer.isBuffer(msg)
          ? msg.toString('utf8')
          : String(msg);
        const parsed: NetworkMessage = JSON.parse(text);
        this.msgHandlers.forEach(h => h(parsed, rinfo.address));
      } catch {
        // ignore malformed packets
      }
    });

    this.socket.on('error', () => {});
  }

  // -------------------------------------------------------------------------
  // Zeroconf
  // -------------------------------------------------------------------------

  startDiscovery(): void {
    try { this.zeroconf.scan('quizbit', 'tcp', 'local.'); } catch {}
  }

  stopDiscovery(): void {
    try { this.zeroconf.stop(); } catch {}
  }

  publishService(name: string): void {
    try { this.zeroconf.publishService('quizbit', 'tcp', 'local.', name, this.port); } catch {}
  }

  unpublishService(): void {
    try { this.zeroconf.unpublishService('quizbit'); } catch {}
  }

  // -------------------------------------------------------------------------
  // Sending
  // -------------------------------------------------------------------------

  sendTo(ip: string, message: NetworkMessage): void {
    if (!this.socket) return;
    try {
      const buf = Buffer.from(JSON.stringify(message), 'utf8');
      this.socket.send(buf, 0, buf.length, this.port, ip, () => {});
    } catch {}
  }

  broadcast(message: NetworkMessage, ips: string[]): void {
    ips.forEach(ip => this.sendTo(ip, message));
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  /** Close socket + Zeroconf but keep handlers (for reconnect scenarios). */
  closeSocket(): void {
    if (this.socket) {
      try { this.socket.close(); } catch {}
      this.socket = null;
    }
    this.stopDiscovery();
    this.unpublishService();
    this.peers.clear();
    this.hostIp = null;
  }

  /** Full teardown — removes all handlers too. */
  destroy(): void {
    this.closeSocket();
    this.msgHandlers.clear();
    this.peerHandlers.clear();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private notifyPeers(): void {
    const peers = this.getPeers();
    this.peerHandlers.forEach(h => h(peers));
  }
}

export default new NetworkModel();
