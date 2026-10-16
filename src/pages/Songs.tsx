// Dev-verktyg för spelledaren: koppla låtarna till Spotify, provspela dem och exportera JSON.
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ErrorText, Loading, Screen } from '../components/Common';
import type { Song } from '../engine/game';
import { usePlayer, useSpotifyLoggedIn } from '../hooks/misc';
import { login } from '../spotify/auth';
import { cachedUri, exportPlaylist, loadSongs, overrideUri, resolveUri } from '../spotify/catalog';
import { activateFromGesture, initPlayer, pause, playTrack } from '../spotify/player';
import { errorMessage } from '../util';

type RowState = { uri: string | null; status: 'idle' | 'busy' | 'ok' | 'error'; message?: string };

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
  const spotify = useSpotifyLoggedIn();
  const player = usePlayer();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [running, setRunning] = useState(false);
  const [playlist, setPlaylist] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSongs().then((list) => {
      setSongs(list);
      setRows(Object.fromEntries(list.map((s) => [s.id, { uri: cachedUri(s), status: cachedUri(s) ? 'ok' : 'idle' }])));
    });
  }, []);

  useEffect(() => {
    if (spotify) void initPlayer().catch((err) => setError(errorMessage(err)));
  }, [spotify]);

  if (!spotify) {
    return (
      <Screen title="Låtlistan">
        <button type="button" className="primary" onClick={() => void login('/host/songs')}>
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
      'songs.json',
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

  return (
    <Screen title="Låtlistan">
      <p className="muted">
        {songs.length} låtar, {resolved} kopplade till Spotify. Provspela varje låt en gång så att du vet att den går att
        spela. Kopplingarna sparas på den här telefonen.
      </p>
      <div className="actions">
        <button type="button" className="primary" disabled={running} onClick={() => void resolveAll()}>
          {running ? 'Söker…' : 'Hitta alla på Spotify'}
        </button>
        <button type="button" onClick={exportSongs}>Ladda ner songs.json</button>
        <button type="button" onClick={() => void pause()}>Pausa</button>
      </div>
      <ErrorText error={error ?? player.error} />

      <ul className="song-list">
        {songs.map((song) => {
          const row = rows[song.id];
          const playing = row?.uri && player.trackUri === row.uri && !player.paused;
          return (
            <li key={song.id} className={row?.status}>
              <span className="card-year">{song.year}</span>
              <span className="song-text">
                <span className="card-title">{song.title}</span>
                <span className="card-artist">{song.artist}</span>
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
