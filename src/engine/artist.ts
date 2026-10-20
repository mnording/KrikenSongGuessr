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

/** Avstånd i år mellan låtens år och artistens närmaste låt i listan. */
function yearDistance(artist: string, year: number, songs: readonly Song[]): number {
  return Math.min(...songs.filter((s) => s.artist === artist).map((s) => Math.abs(s.year - year)));
}

/**
 * Fyra artister i slumpad ordning, där en är låtens. De tre andra kommer från ungefär samma era,
 * så att man inte kan sålla bort dem bara på att de låter gamla, och delar ingen artist med varandra.
 */
export function pickChoices(song: Song, songs: readonly Song[], random: () => number = Math.random): string[] {
  const candidates = shuffle([...new Set(songs.map((s) => s.artist))], random).sort(
    (a, b) => Math.floor(yearDistance(a, song.year, songs) / 10) - Math.floor(yearDistance(b, song.year, songs) / 10),
  );
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
