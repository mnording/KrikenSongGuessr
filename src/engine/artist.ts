// Gissningar bland fyra alternativ: artisten i Familj-läget, filmen i Film-läget. Rena funktioner.
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

/** Två filmer är samma om namnen är lika bortsett från stora bokstäver och skiljetecken. */
export function sameFilm(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

/** Hur många decennier från låtens år varje namns närmaste låt ligger. */
function decadesAway(year: number, songs: readonly Song[], nameOf: (s: Song) => string | undefined): Map<string, number> {
  const distance = new Map<string, number>();
  for (const s of songs) {
    const name = nameOf(s);
    if (!name) continue;
    const d = Math.floor(Math.abs(s.year - year) / 10);
    distance.set(name, Math.min(d, distance.get(name) ?? d));
  }
  return distance;
}

/**
 * Fyra namn i slumpad ordning, där ett är låtens. De tre andra kommer från ungefär samma era,
 * så att man inte kan sålla bort dem bara på att de låter gamla, och är inte samma som varandra.
 */
function pickFour(
  song: Song,
  songs: readonly Song[],
  nameOf: (s: Song) => string | undefined,
  same: (a: string, b: string) => boolean,
  random: () => number,
): string[] {
  const answer = nameOf(song);
  if (!answer) return [];
  const distance = decadesAway(song.year, songs, nameOf);
  const candidates = shuffle([...distance.keys()], random).sort((a, b) => distance.get(a)! - distance.get(b)!);
  const choices = [answer];
  for (const name of candidates) {
    if (choices.length === CHOICE_COUNT) break;
    if (!choices.some((c) => same(c, name))) choices.push(name);
  }
  return shuffle(choices, random);
}

/** Familj: fyra artister. */
export function pickChoices(song: Song, songs: readonly Song[], random: () => number = Math.random): string[] {
  return pickFour(song, songs, (s) => s.artist, sameArtist, random);
}

/** Film: fyra filmer. */
export function pickFilmChoices(song: Song, songs: readonly Song[], random: () => number = Math.random): string[] {
  return pickFour(song, songs, (s) => s.film, sameFilm, random);
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

export function filmAnswerIndex(choices: readonly string[], film: string | undefined): number | null {
  const index = film ? choices.findIndex((c) => sameFilm(c, film)) : -1;
  return index === -1 ? null : index;
}

/** Rätt val: kortet läggs in på sin plats i årsordning. Fel: tidslinjen är oförändrad. */
function evaluateChoice(
  timeline: readonly TimelineCard[],
  picked: string | undefined,
  card: TimelineCard,
  isRight: (picked: string) => boolean,
): Evaluation & { slotIndex: number } {
  const slotIndex = sortedSlot(timeline, card.year);
  const correct = picked !== undefined && isRight(picked);
  return { correct, slotIndex, timeline: correct ? insertCard(timeline, slotIndex, card) : [...timeline] };
}

export function evaluateArtistChoice(
  timeline: readonly TimelineCard[],
  choices: readonly string[],
  choice: number,
  card: TimelineCard,
): Evaluation & { slotIndex: number } {
  return evaluateChoice(timeline, choices[choice], card, (p) => sameArtist(p, card.artist));
}

export function evaluateFilmChoice(
  timeline: readonly TimelineCard[],
  choices: readonly string[],
  choice: number,
  card: TimelineCard,
): Evaluation & { slotIndex: number } {
  return evaluateChoice(timeline, choices[choice], card, (p) => card.film !== undefined && sameFilm(p, card.film));
}
