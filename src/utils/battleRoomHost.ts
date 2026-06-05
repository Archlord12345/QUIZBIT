import { BattleRoyaleRoom } from '../controllers/BattleRoyaleController';

const PLACEHOLDER_PLAYER_IDS = new Set(['offline-demo']);

export function resolveRoomHostId(room: BattleRoyaleRoom): string {
  const players = room.players || [];
  const realPlayers = players.filter(
    player => !PLACEHOLDER_PLAYER_IDS.has(player.userId),
  );
  const activePlayers = realPlayers.length > 0 ? realPlayers : players;
  const hostId = String(room.hostId || '').trim();

  if (hostId && activePlayers.some(player => player.userId === hostId)) {
    return hostId;
  }

  return activePlayers[0]?.userId || '';
}
