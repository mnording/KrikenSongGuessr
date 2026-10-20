// Artistgissningen i Familj-läget: fyra alternativ, ett rätt. Rena funktioner som resten av motorn.
import { insertCard, shuffle, type Evaluation, type Song, type TimelineCard } from './game';

export const CHOICE_COUNT = 4;

/** Gemener, utan accenter och skiljetecken. Delas med Spotify-sökningen. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Artisterna bakom ett namn, så att "Lady Gaga & Bruno Mars" och "Bruno Mars" räknas som samma. */
export function artistKeys(name: string): string[] {
  return name
    .split(/\s+(?:ft\.?|feat\.?|featuring|&|and|och)\s+/i)
    .map((part) => normalizeName(part).replace(/^the /, ''))
    .filter(Boolean);
}

export function sameArtist(a: string, b: string): boolean {
  const keys = new Set(artistKeys(a));
  return artistKeys(b).some((key) => keys.has(key));
}

/** Hur många decennier från låtens år varje artists närmaste låt ligger. */
function decadesAway(year: number, songs: readonly Song[]): Map<string, number> {
  const distance = new Map<string, number>();
  for (const s of songs) {
    const d = Math.floor(Math.abs(s.year - year) / 10);
    distance.set(s.artist, Math.min(d, distance.get(s.artist) ?? d));
  }
  return distance;
}

/**
 * Fyra artister i slumpad ordning, där en är låtens. De tre andra kommer från ungefär samma era,
 * så att man inte kan sålla bort dem bara på att de låter gamla, och delar ingen artist med varandra.
 */
export function pickChoices(song: Song, songs: readonly Song[], random: () => number = Math.random): string[] {
  const distance = decadesAway(song.year, songs);
  const candidates = shuffle([...distance.keys()], random).sort((a, b) => distance.get(a)! - distance.get(b)!);
  const choices = [song.artist];
  for (const artist of candidates) {
    if (choices.length === CHOICE_COUNT) break;
    if (!choices.some((c) => sameArtist(c, artist))) choices.push(artist);
  }
  return shuffle(choices, random);
}

/** Platsen där kortet hamnar i årsordning, efter kort från samma år. */
export function sortedSlot(timeline: readonly TimelineCard[], year: number): number {
  return timeline.filter((c) => c.year <= year).length;
}

/** Vilket av alternativen som är rätt, eller null om inget är det. */
export function answerIndex(choices: readonly string[], artist: string): number | null {
  const index = choices.findIndex((c) => sameArtist(c, artist));
  return index === -1 ? null : index;
}

/** Rätt artist: kortet läggs in på sin plats i årsordning. Fel: tidslinjen är oförändrad. */
export function evaluateArtistChoice(
  timeline: readonly TimelineCard[],
  choices: readonly string[],
  choice: number,
  card: TimelineCard,
): Evaluation & { slotIndex: number } {
  const slotIndex = sortedSlot(timeline, card.year);
  const picked = choices[choice];
  const correct = picked !== undefined && sameArtist(picked, card.artist);
  return { correct, slotIndex, timeline: correct ? insertCard(timeline, slotIndex, card) : [...timeline] };
}
