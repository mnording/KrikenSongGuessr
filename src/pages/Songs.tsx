// Dev-verktyg för spelledaren: koppla låtarna till Spotify, provspela dem och exportera JSON.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ErrorText, Loading, Screen } from '../components/Common';
import type { Song } from '../engine/game';
import { usePlayer, useSpotifyLoggedIn } from '../hooks/misc';
import { login } from '../spotify/auth';
import { cachedUri, exportPlaylist, loadFilms, loadSongs, overrideUri, resolveUri, spotifyYear } from '../spotify/catalog';
import { activateFromGesture, initPlayer, pause, playTrack } from '../spotify/player';
import { errorMessage } from '../util';

/** spotifyYear: albumets år på Spotify, när det är kontrollerat. */
type RowState = { uri: string | null; status: 'idle' | 'busy' | 'ok' | 'error'; message?: string; spotifyYear?: number | null };

/** Mer än ett års skillnad är värt att titta på. Ofta är det en remaster, men ibland fel år hos oss. */
const yearOff = (song: Song, row: RowState | undefined) =>
  row?.spotifyYear != null && Math.abs(row.spotifyYear - song.year) > 1;

function download(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Godtar spotify:track:ID och https://open.spotify.com/track/ID?... */
function parseTrackUri(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^spotify:track:([A-Za-z0-9]{22})$/) ?? trimmed.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?track\/([A-Za-z0-9]{22})/);
  return match ? `spotify:track:${match[1]}` : null;
}

export default function Songs() {
  // ?lista=film visar Film-lägets lista i stället för den vanliga.
  const [params] = useSearchParams();
  const films = params.get('lista') === 'film';
  const title = films ? 'Filmlåtarna' : 'Låtlistan';
  const file = films ? 'films.json' : 'songs.json';
  const spotify = useSpotifyLoggedIn();
  const player = usePlayer();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [running, setRunning] = useState(false);
  const [playlist, setPlaylist] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [yearCheck, setYearCheck] = useState<{ done: number; total: number; failed: number; finished: boolean } | null>(null);

  useEffect(() => {
    void (films ? loadFilms() : loadSongs()).then((list) => {
      setSongs(list);
      setRows(Object.fromEntries(list.map((s) => [s.id, { uri: cachedUri(s), status: cachedUri(s) ? 'ok' : 'idle' }])));
    });
  }, [films]);

  useEffect(() => {
    if (spotify) void initPlayer().catch((err) => setError(errorMessage(err)));
  }, [spotify]);

  if (!spotify) {
    return (
      <Screen title={title}>
        <button type="button" className="primary" onClick={() => void login(films ? '/host/songs?lista=film' : '/host/songs')}>
          Logga in med Spotify
        </button>
      </Screen>
    );
  }
  if (!songs) return <Loading />;

  const setRow = (id: string, row: RowState) => setRows((r) => ({ ...r, [id]: row }));

  const resolveAll = async () => {
    setRunning(true);
    for (const song of songs) {
      if (rows[song.id]?.uri) continue;
      setRow(song.id, { uri: null, status: 'busy' });
      try {
        setRow(song.id, { uri: await resolveUri(song), status: 'ok' });
      } catch (err) {
        setRow(song.id, { uri: null, status: 'error', message: errorMessage(err) });
      }
    }
    setRunning(false);
  };

  const checkYears = async () => {
    const linked = songs.filter((s) => rows[s.id]?.uri);
    setRunning(true);
    setYearCheck({ done: 0, total: linked.length, failed: 0, finished: false });
    let failed = 0;
    try {
      for (const [i, song] of linked.entries()) {
        const year = await spotifyYear(song);
        if (year === null) failed++;
        setRows((r) => ({ ...r, [song.id]: { ...r[song.id], spotifyYear: year } }));
        setYearCheck({ done: i + 1, total: linked.length, failed, finished: false });
      }
    } finally {
      setYearCheck((c) => (c ? { ...c, finished: true } : c));
      setRunning(false);
    }
  };

  const testPlay = async (song: Song) => {
    activateFromGesture();
    try {
      const uri = rows[song.id]?.uri ?? (await resolveUri(song));
      setRow(song.id, { uri, status: 'ok' });
      await playTrack(uri);
    } catch (err) {
      setRow(song.id, { uri: rows[song.id]?.uri ?? null, status: 'error', message: errorMessage(err) });
    }
  };

  const setManual = (song: Song) => {
    const input = window.prompt(`Spotify-länk eller URI för "${song.title}"`);
    if (!input) return;
    const uri = parseTrackUri(input);
    if (!uri) return setError('Det där ser inte ut som en Spotify-spårlänk.');
    overrideUri(song.id, uri);
    setRow(song.id, { uri, status: 'ok' });
  };

  const exportSongs = () =>
    download(
      file,
      songs.map((s) => ({ ...s, spotifyUri: rows[s.id]?.uri ?? s.spotifyUri })),
    );

  const exportFromPlaylist = async () => {
    setError(null);
    const id = playlist.match(/playlist[/:]([A-Za-z0-9]+)/)?.[1] ?? playlist.trim();
    try {
      download('playlist-songs.json', await exportPlaylist(id));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const resolved = songs.filter((s) => rows[s.id]?.uri).length;
  const off = songs.filter((s) => yearOff(s, rows[s.id])).length;

  return (
    <Screen title={title}>
      <p className="muted">
        {songs.length} låtar, {resolved} kopplade till Spotify. Provspela varje låt en gång så att du vet att den går att
        spela. Kopplingarna sparas på den här telefonen.
      </p>
      <div className="actions">
        <button type="button" className="primary" disabled={running} onClick={() => void resolveAll()}>
          {running ? 'Söker…' : 'Hitta alla på Spotify'}
        </button>
        <button type="button" disabled={running || resolved === 0} onClick={() => void checkYears()}>
          {yearCheck && !yearCheck.finished ? `Kontrollerar… ${yearCheck.done} av ${yearCheck.total}` : 'Kontrollera år'}
        </button>
        <button type="button" onClick={exportSongs}>Ladda ner {file}</button>
        <button type="button" onClick={() => void pause()}>Pausa</button>
      </div>
      <ErrorText error={error ?? player.error} />
      {yearCheck?.finished && (
        <p className="muted" role="status">
          {off === 0 ? 'Klart: inga avvikande år.' : `Klart: ${off} låtar har ett annat år på Spotify. Ofta är det en remaster eller samling, men kontrollera originalåret.`}
          {yearCheck.failed > 0 && ` ${yearCheck.failed} gick inte att kontrollera.`}
          {songs.length > yearCheck.total && ` ${songs.length - yearCheck.total} är inte kopplade till Spotify än.`}
        </p>
      )}

      <ul className="song-list">
        {songs.map((song) => {
          const row = rows[song.id];
          const playing = row?.uri && player.trackUri === row.uri && !player.paused;
          return (
            <li key={song.id} className={row?.status}>
              <span className="card-year">{song.year}</span>
              <span className="song-text">
                <span className="card-title">{song.title}</span>
                <span className="card-artist">
                  {song.artist}
                  {song.film ? ` · ${song.film}` : ''}
                  {song.tags?.length ? ` · ${song.tags.join(', ')}` : ''}
                </span>
                {yearOff(song, row) && (
                  <span className="year-off small">
                    <span aria-hidden="true">⚠ </span>Spotify har {row!.spotifyYear}, vi har {song.year}
                  </span>
                )}
                {row?.status === 'error' && <span className="error small">{row.message}</span>}
                {row?.uri && <span className="muted small">{row.uri}</span>}
              </span>
              <span className="song-buttons">
                <button type="button" onClick={() => void testPlay(song)} aria-label={`Spela ${song.title}`}>
                  {playing ? '♪' : '▶'}
                </button>
                <button type="button" onClick={() => setManual(song)} aria-label={`Ändra Spotify-spår för ${song.title}`}>
                  ✎
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="card-box">
        <h2>Exportera en egen spellista</h2>
        <p className="muted small">Fungerar för spellistor du äger. Årtalen kommer från albumet och måste kontrolleras för hand.</p>
        <input placeholder="Länk eller id till spellistan" value={playlist} onChange={(e) => setPlaylist(e.target.value)} />
        <button type="button" disabled={!playlist.trim()} onClick={() => void exportFromPlaylist()}>
          Exportera till JSON
        </button>
      </div>
      <Link to="/host" className="link">Tillbaka</Link>
    </Screen>
  );
}
