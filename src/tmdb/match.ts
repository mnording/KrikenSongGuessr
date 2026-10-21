// Väljer rätt film bland TMDB:s sökträffar. Rena funktioner, så att de går att testa utan nätverk.
import { normalizeName } from '../engine/artist';

/** Det vi behöver ur en sökträff från TMDB (/search/movie). */
export type TmdbResult = {
  id: number;
  title: string;
  original_title: string;
  release_date?: string;
  poster_path?: string | null;
  popularity?: number;
};

export type TmdbFilm = {
  id: number;
  /** Titeln på svenska om TMDB har en översättning, annars originaltiteln. */
  title: string;
  year: number | null;
  /** Sökväg till affischen hos TMDB, till exempel "/abc.jpg". */
  poster: string | null;
};

const yearOf = (date: string | undefined) => (date && /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null);

/**
 * Bästa träffen: titeln stämmer (svensk eller original) och året ligger nära vårt.
 * Popularitet avgör mellan lika bra träffar, så att en remake inte väljs före originalet av en slump.
 */
export function pickFilm(results: readonly TmdbResult[], name: string, year?: number): TmdbFilm | null {
  if (results.length === 0) return null;
  const wanted = normalizeName(name);
  const scored = results.map((r) => {
    const y = yearOf(r.release_date);
    let score = 0;
    if (normalizeName(r.title) === wanted || normalizeName(r.original_title) === wanted) score += 3;
    if (year !== undefined && y !== null) score += Math.abs(y - year) <= 1 ? 2 : Math.abs(y - year) <= 5 ? 1 : 0;
    return { r, y, score };
  });
  scored.sort((a, b) => b.score - a.score || (b.r.popularity ?? 0) - (a.r.popularity ?? 0));
  const best = scored[0];
  return { id: best.r.id, title: best.r.title, year: best.y, poster: best.r.poster_path ?? null };
}

/** Affischens adress hos TMDB. w185 räcker för korten, w342 för verktyget. */
export const posterUrl = (path: string, size: 'w92' | 'w185' | 'w342' = 'w185') => `https://image.tmdb.org/t/p/${size}${path}`;
