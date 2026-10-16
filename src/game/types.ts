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
  color: string;
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

export const TEAM_COLORS = [
  { value: '#e11d48', name: 'Röd' },
  { value: '#f97316', name: 'Orange' },
  { value: '#eab308', name: 'Gul' },
  { value: '#22c55e', name: 'Grön' },
  { value: '#14b8a6', name: 'Turkos' },
  { value: '#3b82f6', name: 'Blå' },
  { value: '#8b5cf6', name: 'Lila' },
  { value: '#ec4899', name: 'Rosa' },
  { value: '#a16207', name: 'Brun' },
  { value: '#64748b', name: 'Grå' },
];

export const OFFLINE_AFTER_MS = 30_000;
export const HEARTBEAT_MS = 10_000;

export function isOnline(team: TeamDoc, now = Date.now()): boolean {
  if (!team.connected) return false;
  const seen = team.lastSeen?.toMillis();
  // Ett nyss skrivet serverTimestamp är null lokalt tills servern svarat.
  if (seen === undefined) return true;
  return now - seen < OFFLINE_AFTER_MS;
}
