// Dev-verktyg för spelledaren: koppla låtarna till Spotify, provspela dem och exportera JSON.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ErrorText, Loading, Screen } from '../components/Common';
import type { Song } from '../engine/game';
import { usePlayer, useSpotifyLoggedIn } from '../hooks/misc';
import { login } from '../spotify/auth';
import { cachedUri, exportPlaylist, loadFilms, loadSongs, overrideUri, resolveUri, spotifyYear } from '../spotify/catalog';
import { normalizeName } from '../engine/artist';
import { posterUrl } from '../tmdb/match';
import { findFilm, hasTmdbKey, type TmdbFilm } from '../tmdb/tmdb';
import { activateFromGesture, initPlayer, pause, playTrack } from '../spotify/player';
import { reportError } from '../sentry';
import { errorMessage } from '../util';

/** spotifyYear: albumets år på Spotify, när det är kontrollerat. */
/** tmdb: filmen hos TMDB när verktyget har hämtat den, null om den inte hittades. */
type RowState = {
  uri: string | null;
  status: 'idle' | 'busy' | 'ok' | 'error';
  message?: string;
  spotifyYear?: number | null;
  tmdb?: TmdbFilm | null;
};

/** Mer än ett års skillnad är värt att titta på. Ofta är det en remaster, men ibland fel år hos oss. */
const yearOff = (song: Song, row: RowState | undefined) =>
  row?.spotifyYear != null && Math.abs(row.spotifyYear - song.year) > 1;

/** Samma format som i repot: en låt per rad, så att en ändring blir en rad i diffen. */
function toJsonLines(list: object[]): string {
  const line = (item: object) =>
    JSON.stringify(item)
      .replace(/^\{/, '{ ')
      .replace(/\}$/, ' }')
      .replace(/":/g, '": ')
      .replace(/,"/g, ', "');
  return '[\n' + list.map((item) => '  ' + line(item)).join(',\n') + '\n]\n';
}

function download(filename: string, data: object[]) {
  const blob = new Blob([toJsonLines(data)], { type: 'application/json' });
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
  const [tmdbDone, setTmdbDone] = useState(false);
  const [yearCheck, setYearCheck] = useState<{ done: number; total: number; failed: number; finished: boolean } | null>(null);

  useEffect(() => {
    void (films ? loadFilms() : loadSongs()).then((list) => {
      setSongs(list);
      setRows(Object.fromEntries(list.map((s) => [s.id, { uri: cachedUri(s), status: cachedUri(s) ? 'ok' : 'idle' }])));
    });
  }, [films]);

  useEffect(() => {
    if (spotify) {
      void initPlayer().catch((err) => {
        reportError(err, 'spotify.init');
        setError(errorMessage(err));
      });
    }
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
        // Att en låt inte hittas är verktygets svar, inte ett fel i appen. Det visas på raden. Rapporteras inte.
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
    let uri: string;
    try {
      uri = rows[song.id]?.uri ?? (await resolveUri(song));
    } catch (err) {
      // Låten hittades inte: verktygets svar, inte ett fel i appen. Rapporteras inte.
      setRow(song.id, { uri: null, status: 'error', message: errorMessage(err) });
      return;
    }
    setRow(song.id, { uri, status: 'ok' });
    try {
      await playTrack(uri);
    } catch (err) {
      reportError(err, 'spotify.play');
      setRow(song.id, { uri, status: 'error', message: errorMessage(err) });
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

  // Filmlistan får TMDB:s premiärår och affisch. Titlarna rättas för hand, eftersom TMDB ibland
  // saknar svensk översättning och då ger den engelska.
  const exportSongs = () =>
    download(
      file,
      songs.map((s) => {
        const tmdb = rows[s.id]?.tmdb;
        const base = { ...s, spotifyUri: rows[s.id]?.uri ?? s.spotifyUri };
        if (!tmdb) return base;
        return { ...base, year: tmdb.year ?? s.year, tmdbId: tmdb.id, ...(tmdb.poster ? { poster: tmdb.poster } : {}) };
      }),
    );

  const fetchTmdb = async () => {
    setRunning(true);
    setError(null);
    try {
      for (const song of songs) {
        if (!song.film) continue;
        const film = await findFilm(song.film, song.year);
        setRows((r) => ({ ...r, [song.id]: { ...r[song.id], tmdb: film } }));
      }
      setTmdbDone(true);
    } catch (err) {
      reportError(err, 'tmdb');
      setError(`TMDB: ${errorMessage(err)}`);
    } finally {
      setRunning(false);
    }
  };

  const exportFromPlaylist = async () => {
    setError(null);
    const id = playlist.match(/playlist[/:]([A-Za-z0-9]+)/)?.[1] ?? playlist.trim();
    try {
      download('playlist-songs.json', await exportPlaylist(id));
    } catch (err) {
      reportError(err, 'spotify.export');
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
        {films && (
          <button type="button" disabled={running || !hasTmdbKey()} onClick={() => void fetchTmdb()}>
            Hämta från TMDB
          </button>
        )}
        <button type="button" onClick={exportSongs}>Ladda ner {file}</button>
        <button type="button" onClick={() => void pause()}>Pausa</button>
      </div>
      <ErrorText error={error ?? player.error} />
      {films && !hasTmdbKey() && (
        <p className="muted small">
          För premiärår och affischer: skapa en API-nyckel på themoviedb.org, lägg den i .env.local som
          VITE_TMDB_API_KEY och öppna den här sidan med npm run dev. Nyckeln används bara lokalt.
        </p>
      )}
      {films && tmdbDone && (
        <p className="muted" role="status">
          Klart: {songs.filter((s) => s.film && rows[s.id]?.tmdb === null).length} filmer hittades inte på TMDB. Ladda ner
          {` ${file} `}för att spara premiärår och affischer. Titlarna ändras inte, rätta dem för hand där TMDB skiljer sig.
        </p>
      )}
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
              {(row?.tmdb?.poster ?? song.poster) && (
                <img className="song-poster" src={posterUrl((row?.tmdb?.poster ?? song.poster)!, 'w92')} alt="" loading="lazy" />
              )}
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
                {row?.tmdb === null && <span className="year-off small">Hittades inte på TMDB</span>}
                {row?.tmdb && row.tmdb.year !== null && row.tmdb.year !== song.year && (
                  <span className="year-off small">
                    <span aria-hidden="true">⚠ </span>TMDB har premiär {row.tmdb.year}, vi har {song.year}
                  </span>
                )}
                {row?.tmdb && song.film && normalizeName(row.tmdb.title) !== normalizeName(song.film) && (
                  <span className="muted small">TMDB:s titel: {row.tmdb.title}</span>
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
      {films && (
        <p className="muted small tmdb-credit">
          <a href="https://www.themoviedb.org">
            <img src="/tmdb-logo.svg" alt="TMDB" />
          </a>
          Filmdata och affischer från TMDB. Appen använder TMDB:s API men är inte
          godkänd eller certifierad av TMDB.
        </p>
      )}
      <Link to="/host" className="link">Tillbaka</Link>
    </Screen>
  );
}
