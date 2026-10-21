// TMDB (The Movie Database): premiärår och affischer för filmlistan. Används bara i verktyget på
// /host/songs?lista=film. Spelet läser det som sparats i films.json och visar bara bilderna.
import { pickFilm, type TmdbFilm, type TmdbResult } from './match';

// Bara i utvecklingsläget: Vite bygger in VITE_-variabler i koden som publiceras, och nyckeln ska inte
// ligga på den publika sajten. I produktion tas grenen bort och nyckeln följer inte med.
const KEY = import.meta.env.DEV ? (import.meta.env.VITE_TMDB_API_KEY as string | undefined) : undefined;

export const hasTmdbKey = () => Boolean(KEY);

/** TMDB:s läsnyckel (v4) skickas som Bearer, den äldre API-nyckeln (v3) som parameter. */
async function tmdbFetch(path: string, params: Record<string, string>): Promise<Response> {
  if (!KEY) throw new Error('VITE_TMDB_API_KEY saknas i .env.local');
  const bearer = KEY.startsWith('eyJ');
  const query = new URLSearchParams(bearer ? params : { ...params, api_key: KEY });
  return fetch(`https://api.themoviedb.org/3${path}?${query}`, {
    headers: bearer ? { Authorization: `Bearer ${KEY}`, accept: 'application/json' } : { accept: 'application/json' },
  });
}

/** Söker filmen på svenska och väljer den träff som passar namnet och året bäst. */
export async function findFilm(name: string, year?: number): Promise<TmdbFilm | null> {
  const res = await tmdbFetch('/search/movie', { query: name, language: 'sv-SE', include_adult: 'false' });
  if (!res.ok) throw new Error(`TMDB svarade ${res.status}`);
  const data = (await res.json()) as { results?: TmdbResult[] };
  return pickFilm(data.results ?? [], name, year);
}

export type { TmdbFilm };
