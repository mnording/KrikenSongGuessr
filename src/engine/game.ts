// Spelmotorn: rena funktioner utan Firebase eller Spotify, så att de går att enhetstesta.

export type Song = {
  id: string;
  spotifyUri: string;
  title: string;
  artist: string;
  year: number;
};

export type TimelineCard = {
  cardId: string;
  title: string;
  artist: string;
  year: number;
};

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 10;
export const MIN_TARGET = 3;
export const MAX_TARGET = 15;
export const DEFAULT_TARGET = 7;

export function toTimelineCard(song: Song): TimelineCard {
  return { cardId: song.id, title: song.title, artist: song.artist, year: song.year };
}

/** Fisher–Yates. `random` går att byta ut i tester. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Luckorna i en tidslinje med n kort är 0..n, där 0 är före första kortet. */
export function slotCount(timeline: readonly TimelineCard[]): number {
  return timeline.length + 1;
}

export function isValidSlot(timeline: readonly TimelineCard[], slotIndex: number): boolean {
  return Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex <= timeline.length;
}

/**
 * Rätt om a <= year <= b, där a är kortet till vänster om luckan och b kortet till höger.
 * En saknad granne ignoreras. Lika år räknas som rätt.
 */
export function isPlacementCorrect(
  timeline: readonly TimelineCard[],
  slotIndex: number,
  year: number,
): boolean {
  if (!isValidSlot(timeline, slotIndex)) return false;
  const left = timeline[slotIndex - 1];
  const right = timeline[slotIndex];
  if (left && left.year > year) return false;
  if (right && year > right.year) return false;
  return true;
}

export function insertCard(
  timeline: readonly TimelineCard[],
  slotIndex: number,
  card: TimelineCard,
): TimelineCard[] {
  const result = [...timeline];
  result.splice(slotIndex, 0, card);
  return result;
}

export type Evaluation = {
  correct: boolean;
  timeline: TimelineCard[];
};

/** Rätt: kortet läggs in i luckan. Fel: tidslinjen är oförändrad. */
export function evaluatePlacement(
  timeline: readonly TimelineCard[],
  slotIndex: number,
  card: TimelineCard,
): Evaluation {
  const correct = isPlacementCorrect(timeline, slotIndex, card.year);
  return { correct, timeline: correct ? insertCard(timeline, slotIndex, card) : [...timeline] };
}

export function clampTarget(target: number): number {
  if (!Number.isFinite(target)) return DEFAULT_TARGET;
  return Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.round(target)));
}

/**
 * Nästa lag efter `currentUid` i turordningen, bland lagen som fortfarande finns med.
 * Finns inte nuvarande lag kvar (borttaget) börjar vi från dess gamla plats.
 */
export function nextTeamUid(
  turnOrder: readonly string[],
  currentUid: string | null,
  activeUids: ReadonlySet<string> = new Set(turnOrder),
): string | null {
  const candidates = turnOrder.filter((uid) => activeUids.has(uid));
  if (candidates.length === 0) return null;
  const position = currentUid === null ? -1 : turnOrder.indexOf(currentUid);
  if (position === -1) return candidates[0];
  for (let step = 1; step <= turnOrder.length; step++) {
    const uid = turnOrder[(position + step) % turnOrder.length];
    if (activeUids.has(uid)) return uid;
  }
  return null;
}

export type Deck = {
  deckOrder: string[];
  deckIndex: number;
};

export function createDeck(songIds: readonly string[], random: () => number = Math.random): Deck {
  return { deckOrder: shuffle(songIds, random), deckIndex: 0 };
}

export function cardsLeft(deck: Deck): number {
  return Math.max(0, deck.deckOrder.length - deck.deckIndex);
}

/** Drar nästa kort utan återanvändning. `null` när kortleken är slut. */
export function drawCard(deck: Deck): { cardId: string; deck: Deck } | null {
  if (cardsLeft(deck) === 0) return null;
  return {
    cardId: deck.deckOrder[deck.deckIndex],
    deck: { deckOrder: deck.deckOrder, deckIndex: deck.deckIndex + 1 },
  };
}

export type StartSetup = {
  turnOrder: string[];
  startCards: Record<string, string>;
  deck: Deck;
};

/** Slumpar turordning och ger varje lag ett startkort ur kortleken. */
export function setupGame(
  teamUids: readonly string[],
  songIds: readonly string[],
  random: () => number = Math.random,
): StartSetup {
  if (teamUids.length < MIN_TEAMS) throw new Error(`Minst ${MIN_TEAMS} lag behövs`);
  if (teamUids.length > MAX_TEAMS) throw new Error(`Högst ${MAX_TEAMS} lag får vara med`);
  if (songIds.length <= teamUids.length) throw new Error('För få låtar för så många lag');
  const turnOrder = shuffle(teamUids, random);
  let deck = createDeck(songIds, random);
  const startCards: Record<string, string> = {};
  for (const uid of turnOrder) {
    const drawn = drawCard(deck)!;
    startCards[uid] = drawn.cardId;
    deck = drawn.deck;
  }
  return { turnOrder, startCards, deck };
}

export function hasReachedTarget(timeline: readonly TimelineCard[], target: number): boolean {
  return timeline.length >= target;
}

/** Lagen med flest kort. Används när kortleken tar slut, och som resultattavla. */
export function leaders(timelines: Record<string, readonly TimelineCard[]>): string[] {
  const entries = Object.entries(timelines);
  if (entries.length === 0) return [];
  const best = Math.max(...entries.map(([, t]) => t.length));
  return entries.filter(([, t]) => t.length === best).map(([uid]) => uid);
}

export function generateGameCode(random: () => number = Math.random): string {
  return String(Math.floor(random() * 1_000_000)).padStart(6, '0');
}
