import type { Timestamp } from 'firebase/firestore';
import type { Song, TimelineCard } from '../engine/game';

export type GameStatus = 'lobby' | 'playing' | 'finished';
export type GamePhase = 'placing' | 'revealed';

/** Tidslinje: alla lägger låten rätt. Familj: varje lag väljer nivå, och alla får gissa artist. */
export type GameMode = 'timeline' | 'family';

/** Lätt: välj artist bland fyra. Svår: lägg låten i tidslinjen. */
export type TeamLevel = 'easy' | 'hard';

export type LastResult = {
  teamUid: string;
  turnIndex: number;
  slotIndex: number;
  correct: boolean;
  card: TimelineCard;
  /** Laget nådde mållängden med det här kortet. */
  reachedTarget: boolean;
  /** Familj: alternativet laget valde, om det valde artist. */
  choice?: number | null;
  /** Familj: vilket alternativ som var rätt. */
  answer?: number | null;
};

export type GameDoc = {
  hostUid: string;
  status: GameStatus;
  phase: GamePhase;
  /** mode saknas i spel från före spellägena, och betyder då tidslinje. */
  settings: { targetLength: number; mode?: GameMode };
  turnOrder: string[];
  /** Turens nummer. Ökar hela tiden, även mellan omgångar, så att gamla drag aldrig matchar. */
  turnIndex: number;
  currentTeamUid: string | null;
  lastResult: LastResult | null;
  winnerUids: string[];
  endReason: 'target' | 'deck' | 'host' | null;
  cardsLeft: number;
  /** Familj: turens fyra artister. Vilken som är rätt vet bara spelledaren tills avslöjandet. */
  choices?: string[] | null;
  createdAt?: Timestamp;
};

export const gameMode = (game: GameDoc): GameMode => game.settings.mode ?? 'timeline';

export type TeamDoc = {
  name: string;
  /** Följer maskoten. Lag från före maskotarna har bara färgen. */
  color: string;
  mascot?: string;
  /** Gäller i Familj-läget. Saknas den är laget svårt. */
  level?: TeamLevel;
  /** Familj: lagets egen gissning när det inte är dess tur. Ger inga kort. */
  guess?: { turnIndex: number; choice: number } | null;
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
  /** Svåra lag lägger i en lucka, lätta lag väljer ett alternativ. */
  slotIndex?: number;
  choice?: number;
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

export const teamLevel = (team: TeamDoc): TeamLevel => team.level ?? 'hard';

export function isOnline(team: TeamDoc, now = Date.now()): boolean {
  if (!team.connected) return false;
  const seen = team.lastSeen?.toMillis();
  // Ett nyss skrivet serverTimestamp är null lokalt tills servern svarat.
  if (seen === undefined) return true;
  return now - seen < OFFLINE_AFTER_MS;
}
