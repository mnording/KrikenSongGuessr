// Urvalet ur låtbiblioteket: decennier och etiketter. Rena funktioner som resten av motorn.
import type { Song } from './game';

export const SONG_TAGS = ['svenskt', 'melodifestivalen', 'dans', 'rock', 'hiphop'] as const;

export type SongTag = (typeof SONG_TAGS)[number];

/** Tomma listor betyder alla. Decennier och etiketter gäller samtidigt; inom varje räcker en träff. */
export type SongFilter = { decades: number[]; tags: SongTag[] };

export const decadeOf = (year: number) => Math.floor(year / 10) * 10;

/** Decennierna som finns i listan, i ordning. */
export function decadesIn(songs: readonly Song[]): number[] {
  return [...new Set(songs.map((s) => decadeOf(s.year)))].sort((a, b) => a - b);
}

export function filterSongs(songs: readonly Song[], filter: SongFilter | undefined | null): Song[] {
  const decades = filter?.decades ?? [];
  const tags = filter?.tags ?? [];
  return songs.filter(
    (s) =>
      (decades.length === 0 || decades.includes(decadeOf(s.year))) &&
      (tags.length === 0 || tags.some((t) => s.tags?.includes(t))),
  );
}

/** Ett startkort per lag och minst ett kort kvar att spela. */
export function hasEnoughSongs(songCount: number, teamCount: number): boolean {
  return songCount > teamCount;
}

/**
 * Ungefär hur många låtar ett spel kan behöva: ett startkort per lag, och ungefär två turer
 * per kort laget behöver vinna, om hälften av gissningarna är rätt.
 */
export function songsNeeded(teamCount: number, targetLength: number): number {
  return Math.max(1, teamCount) * (2 * (targetLength - 1) + 1);
}
