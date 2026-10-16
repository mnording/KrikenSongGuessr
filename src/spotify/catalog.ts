// Låtlistan och hur den kopplas till Spotify-URI:er.
// songs.json kan sakna URI. Då söker spelledarens telefon fram spåret och sparar svaret lokalt.
import type { Song } from '../engine/game';
import { spotifyFetch } from './auth';

const CACHE_KEY = 'spotify.uriCache';

let songsPromise: Promise<Song[]> | null = null;

/** Laddas först när spelledarvyn öppnas, så att listan inte ligger i lagens kod. */
export function loadSongs(): Promise<Song[]> {
  songsPromise ??= import('../data/songs.json').then((m) => m.default as Song[]);
  return songsPromise;
}

function readCache(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

function writeCache(id: string, uri: string) {
  const cache = readCache();
  cache[id] = uri;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

type SearchTrack = {
  uri: string;
  name: string;
  artists: { name: string }[];
  album?: { name: string; release_date?: string };
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export async function searchTracks(query: string, limit = 5): Promise<SearchTrack[]> {
  const params = new URLSearchParams({ q: query, type: 'track', limit: String(limit), market: 'from_token' });
  const res = await spotifyFetch(`/search?${params}`);
  if (!res.ok) throw new Error(`Sökningen misslyckades (${res.status})`);
  const data = (await res.json()) as { tracks?: { items: (SearchTrack | null)[] } };
  return (data.tracks?.items ?? []).filter((t): t is SearchTrack => t !== null);
}

/** Väljer en träff där artisten stämmer och titeln inte är en liveversion eller remix. */
function pickBest(song: Song, tracks: SearchTrack[]): SearchTrack | null {
  const artist = normalize(song.artist);
  const title = normalize(song.title);
  const bad = /\b(live|remix|karaoke|instrumental|acoustic|cover|tribute)\b/;
  const scored = tracks.map((t) => {
    const name = normalize(t.name);
    let score = 0;
    if (t.artists.some((a) => normalize(a.name) === artist)) score += 4;
    else if (t.artists.some((a) => normalize(a.name).includes(artist) || artist.includes(normalize(a.name)))) score += 2;
    if (name === title) score += 3;
    else if (name.startsWith(title) || title.startsWith(name)) score += 1;
    if (bad.test(name) && !bad.test(title)) score -= 3;
    return { t, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0] && scored[0].score >= 3 ? scored[0].t : null;
}

export async function resolveUri(song: Song): Promise<string> {
  if (song.spotifyUri) return song.spotifyUri;
  const cached = readCache()[song.id];
  if (cached) return cached;
  const exact = await searchTracks(`track:"${song.title}" artist:"${song.artist}"`);
  let best = pickBest(song, exact);
  if (!best) best = pickBest(song, await searchTracks(`${song.title} ${song.artist}`));
  if (!best) throw new Error(`Hittade inte "${song.title}" med ${song.artist} på Spotify`);
  writeCache(song.id, best.uri);
  return best.uri;
}

export function cachedUri(song: Song): string | null {
  return song.spotifyUri || readCache()[song.id] || null;
}

export function overrideUri(songId: string, uri: string) {
  writeCache(songId, uri);
}

type PlaylistItem = { item?: SearchTrack | null; track?: SearchTrack | null };

/** Dev-verktyg: exporterar en egen spellista till samma format som songs.json. */
export async function exportPlaylist(playlistId: string): Promise<Song[]> {
  const songs: Song[] = [];
  let path: string | null = `/playlists/${encodeURIComponent(playlistId)}/items?limit=50`;
  while (path) {
    const res = await spotifyFetch(path);
    if (!res.ok) throw new Error(`Kunde inte läsa spellistan (${res.status})`);
    const data = (await res.json()) as { items: PlaylistItem[]; next: string | null };
    for (const entry of data.items) {
      // Efter februari 2026 heter fältet "item". Äldre svar använder "track".
      const track = entry.item ?? entry.track;
      if (!track?.uri?.startsWith('spotify:track:')) continue;
      songs.push({
        id: track.uri.split(':')[2],
        spotifyUri: track.uri,
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        // Albumets datum är ofta en remaster. Kontrollera årtalen för hand.
        year: Number(track.album?.release_date?.slice(0, 4)) || 0,
      });
    }
    path = data.next ? data.next.replace('https://api.spotify.com/v1', '') : null;
  }
  return songs;
}
