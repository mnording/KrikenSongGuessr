import type { Timestamp } from 'firebase/firestore';
import type { Song, TimelineCard } from '../engine/game';

export type GameStatus = 'lobby' | 'playing' | 'finished';
export type GamePhase = 'placing' | 'revealed';

export type LastResult = {
  teamUid: string;
  turnIndex: number;
  slotIndex: number;
  correct: boolean;
  card: TimelineCard;
  /** Laget nådde mållängden med det här kortet. */
  reachedTarget: boolean;
};

export type GameDoc = {
  hostUid: string;
  status: GameStatus;
  phase: GamePhase;
  settings: { targetLength: number };
  turnOrder: string[];
  /** Turens nummer. Ökar hela tiden, även mellan omgångar, så att gamla drag aldrig matchar. */
  turnIndex: number;
  currentTeamUid: string | null;
  lastResult: LastResult | null;
  winnerUids: string[];
  endReason: 'target' | 'deck' | 'host' | null;
  cardsLeft: number;
  createdAt?: Timestamp;
};

export type TeamDoc = {
  name: string;
  /** Följer maskoten. Lag från före maskotarna har bara färgen. */
  color: string;
  mascot?: string;
  connected: boolean;
  lastSeen?: Timestamp | null;
  joinedAt?: Timestamp | null;
  timeline?: TimelineCard[];
  pendingSlot?: number | null;
};

export type Team = TeamDoc & { uid: string };

export type MoveDoc = {
  teamUid: string;
  turnIndex: number;
  slotIndex: number;
  createdAt?: Timestamp;
};

export type PrivateState = {
  deckOrder: string[];
  deckIndex: number;
  currentCard: Song | null;
  spotifyDeviceId: string | null;
};

export const OFFLINE_AFTER_MS = 30_000;
export const HEARTBEAT_MS = 10_000;

export function isOnline(team: TeamDoc, now = Date.now()): boolean {
  if (!team.connected) return false;
  const seen = team.lastSeen?.toMillis();
  // Ett nyss skrivet serverTimestamp är null lokalt tills servern svarat.
  if (seen === undefined) return true;
  return now - seen < OFFLINE_AFTER_MS;
}
