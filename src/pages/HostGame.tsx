import { QRCodeSVG } from 'qrcode.react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ChoiceCards } from '../components/ChoiceCards';
import { ErrorText, LevelBadge, Loading, Scoreboard, Screen, TeamName } from '../components/Common';
import { Timeline } from '../components/Timeline';
import { MAX_TARGET, MAX_TEAMS, MIN_TARGET, MIN_TEAMS, type Song } from '../engine/game';
import { useCollection, useDoc } from '../hooks/firestore';
import { useNow, usePlayer, useSpotifyLoggedIn, useUser, useWakeLock } from '../hooks/misc';
import {
  finishGame,
  nextTurn,
  playAgain,
  rememberHostGame,
  removeTeam,
  reveal,
  saveDeviceId,
  setMode,
  setTargetLength,
  startGame,
} from '../game/hostActions';
import { gameRef, moveRef, privateRef, teamsRef } from '../game/refs';
import { MODES } from '../game/modes';
import { gameMode, teamLevel, type GameDoc, type MoveDoc, type PrivateState, type Team, type TeamDoc } from '../game/types';
import { login } from '../spotify/auth';
import { albumArt, loadSongs, resolveUri } from '../spotify/catalog';
import { activateFromGesture, disconnectPlayer, initPlayer, pause, playTrack, resume } from '../spotify/player';
import { errorMessage, genitive, textOn } from '../util';

export default function HostGame() {
  const { code = '' } = useParams();
  const { user, error: authError } = useUser();
  const spotify = useSpotifyLoggedIn();
  const game = useDoc<GameDoc>(user ? gameRef(code) : null);
  const isHost = Boolean(user && game.data && game.data.hostUid === user.uid);
  const teams = useCollection<TeamDoc>(isHost ? teamsRef(code) : null);
  const state = useDoc<PrivateState>(isHost ? privateRef(code) : null);
  const [songs, setSongs] = useState<Song[] | null>(null);
  useWakeLock(isHost);

  useEffect(() => {
    if (isHost) rememberHostGame(code);
  }, [isHost, code]);

  useEffect(() => {
    void loadSongs().then(setSongs);
  }, []);

  if (authError) return <Screen><ErrorText error={authError} /></Screen>;
  if (!user || game.loading) return <Loading />;
  if (!game.data) {
    return (
      <Screen title="Spelet finns inte">
        <Link to="/host" className="button">Skapa ett nytt spel</Link>
      </Screen>
    );
  }
  if (!isHost) {
    return (
      <Screen title="Inte ditt spel">
        <p>Den här telefonen är inte spelledare för spel {code}.</p>
        <Link to={`/join/${code}`} className="button">Gå med som lag</Link>
      </Screen>
    );
  }
  if (!spotify) {
    return (
      <Screen title="Logga in igen">
        <p>Spotify-inloggningen har gått ut. Spelet ligger kvar.</p>
        <button type="button" className="primary big" onClick={() => void login(`/host/${code}`)}>
          Logga in med Spotify
        </button>
      </Screen>
    );
  }
  if (teams.loading || state.loading || !songs) return <Loading />;

  const sortedTeams = [...teams.data].sort((a, b) => (a.joinedAt?.toMillis() ?? 0) - (b.joinedAt?.toMillis() ?? 0));
  return <HostView code={code} game={game.data} teams={sortedTeams} state={state.data} songs={songs} />;
}

type ViewProps = { code: string; game: GameDoc; teams: Team[]; state: PrivateState | null; songs: Song[] };

function HostView({ code, game, teams, state, songs }: ViewProps) {
  const player = usePlayer();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Vilken tur musiken senast startades för. Efter omladdning är den null.
  const [playedTurn, setPlayedTurn] = useState<number | null>(null);

  const active = game.status !== 'finished';
  useEffect(() => {
    if (active) void initPlayer().catch((err) => setError(errorMessage(err)));
    else disconnectPlayer();
  }, [active]);

  // Varje sidladdning ger ett nytt device_id. Spara det i private/state.
  useEffect(() => {
    if (player.deviceId && player.deviceId !== state?.spotifyDeviceId) {
      void saveDeviceId(code, player.deviceId).catch(() => {});
    }
  }, [player.deviceId, state?.spotifyDeviceId, code]);

  const playCard = useCallback(async (card: Song, turnIndex: number) => {
    setPlayedTurn(turnIndex);
    try {
      const uri = await resolveUri(card);
      await playTrack(uri);
    } catch (err) {
      setError(`Musiken: ${errorMessage(err)}`);
    }
  }, []);

  /** Kör en spelhandling. activateFromGesture måste ske direkt i tryckningen (iOS). */
  const act = (fn: () => Promise<void>) => {
    activateFromGesture();
    setBusy(true);
    setError(null);
    fn()
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setBusy(false));
  };

  const advance = () =>
    act(async () => {
      if (!state) throw new Error('Kortleken saknas');
      const card = await nextTurn(code, game, teams, state, songs);
      if (card) await playCard(card, game.turnIndex + 1);
    });

  const header = (
    <header className="host-header">
      <span>
        Spel <strong>{code}</strong>
      </span>
      <MusicStatus />
    </header>
  );

  if (game.status === 'lobby') {
    return (
      <main className="screen">
        {header}
        <Lobby
          code={code}
          game={game}
          teams={teams}
          busy={busy}
          playerReady={player.status === 'ready'}
          onStart={() =>
            act(async () => {
              const card = await startGame(code, game, teams, songs, albumArt);
              await playCard(card, game.turnIndex + 1);
            })
          }
        />
        <ErrorText error={error ?? player.error} />
      </main>
    );
  }

  if (game.status === 'finished') {
    return (
      <main className="screen">
        {header}
        <h1>{finishTitle(game, teams)}</h1>
        <Scoreboard teams={teams} target={game.settings.targetLength} winnerUids={game.winnerUids} />
        <div className="actions">
          <button type="button" className="primary big" disabled={busy} onClick={() => act(() => playAgain(code, teams))}>
            Spela igen med samma lag
          </button>
          <Link to="/host" className="button">Nytt spel</Link>
        </div>
        <ErrorText error={error} />
      </main>
    );
  }

  return (
    <main className="screen">
      {header}
      <Turn
        code={code}
        game={game}
        teams={teams}
        state={state}
        busy={busy}
        needsPlay={playedTurn !== game.turnIndex && game.phase === 'placing'}
        onPlay={() => {
          activateFromGesture();
          if (state?.currentCard) void playCard(state.currentCard, game.turnIndex);
        }}
        onReveal={(team, move) =>
          act(async () => {
            if (!state?.currentCard) throw new Error('Inget aktuellt kort');
            await reveal(code, game, team, move, state.currentCard, albumArt);
          })
        }
        onNext={advance}
        onEnd={() => {
          if (window.confirm('Avsluta spelet nu? Laget med flest kort vinner.')) {
            act(() => finishGame(code, teams, 'host'));
          }
        }}
      />
      <ErrorText error={error ?? player.error} />
    </main>
  );
}

function finishTitle(game: GameDoc, teams: Team[]): string {
  const names = teams.filter((t) => game.winnerUids.includes(t.uid)).map((t) => t.name);
  const reason = game.endReason === 'deck' ? 'Kortleken tog slut. ' : '';
  if (names.length === 0) return `${reason}Spelet är slut`;
  return `${reason}${names.join(' och ')} vann!`;
}

function MusicStatus() {
  const player = usePlayer();
  const label = {
    idle: 'Spotify startar',
    loading: 'Ansluter till Spotify…',
    ready: player.paused ? 'Musik pausad' : 'Musik spelar',
    offline: 'Spotify tappade anslutningen',
    error: 'Spotify-fel',
  }[player.status];
  return <span className={`music-status ${player.status}`}>{label}</span>;
}

type LobbyProps = {
  code: string;
  game: GameDoc;
  teams: Team[];
  busy: boolean;
  playerReady: boolean;
  onStart: () => void;
};

function Lobby({ code, game, teams, busy, playerReady, onStart }: LobbyProps) {
  const now = useNow();
  const joinUrl = `${window.location.origin}/join/${code}`;
  const target = game.settings.targetLength;
  const tooFew = teams.length < MIN_TEAMS;
  const tooMany = teams.length > MAX_TEAMS;
  const [modeError, setModeError] = useState<string | null>(null);

  return (
    <>
      <section className="invite">
        <div className="qr">
          <QRCodeSVG value={joinUrl} size={200} marginSize={2} title={`QR-kod till ${joinUrl}`} />
        </div>
        <p className="muted">Skanna, eller gå till {window.location.host} och skriv koden</p>
        <p className="big-code" aria-label={`Spelkod ${code.split('').join(' ')}`}>{code}</p>
      </section>

      <h2>Lag ({teams.length})</h2>
      {teams.length === 0 && <p className="muted">Inga lag än. Lagen dyker upp här direkt när de går med.</p>}
      <ul className="team-list">
        {teams.map((t) => (
          <li key={t.uid}>
            <TeamName team={t} now={now} />
            <LevelBadge game={game} team={t} />
            <button
              type="button"
              className="link danger"
              onClick={() => {
                if (window.confirm(`Ta bort ${t.name}?`)) void removeTeam(code, t.uid);
              }}
            >
              Ta bort
            </button>
          </li>
        ))}
      </ul>

      <div className="setting">
        <ChoiceCards
          legend="Spelläge"
          name="mode"
          className="modes"
          options={MODES}
          value={gameMode(game)}
          onChange={(mode) => {
            setModeError(null);
            setMode(code, mode).catch((err) => setModeError(`Kunde inte byta läge: ${errorMessage(err)}`));
          }}
        />
        <ErrorText error={modeError} />
      </div>

      <div className="setting">
        <label htmlFor="target">Kort för att vinna (inklusive startkortet)</label>
        <div className="stepper">
          <button type="button" aria-label="Färre" disabled={target <= MIN_TARGET} onClick={() => void setTargetLength(code, target - 1)}>
            −
          </button>
          <output id="target">{target}</output>
          <button type="button" aria-label="Fler" disabled={target >= MAX_TARGET} onClick={() => void setTargetLength(code, target + 1)}>
            +
          </button>
        </div>
      </div>

      <button type="button" className="primary big" disabled={busy || tooFew || tooMany || !playerReady} onClick={onStart}>
        Starta spelet
      </button>
      {tooFew && <p className="muted small">Minst {MIN_TEAMS} lag behövs.</p>}
      {tooMany && <p className="error">Högst {MAX_TEAMS} lag. Ta bort {teams.length - MAX_TEAMS}.</p>}
      {!playerReady && <p className="muted small">Väntar på att Spotify-spelaren blir redo…</p>}
    </>
  );
}

type TurnProps = {
  code: string;
  game: GameDoc;
  teams: Team[];
  state: PrivateState | null;
  busy: boolean;
  needsPlay: boolean;
  onPlay: () => void;
  onReveal: (team: Team, move: MoveDoc) => void;
  onNext: () => void;
  onEnd: () => void;
};

function Turn({ code, game, teams, state, busy, needsPlay, onPlay, onReveal, onNext, onEnd }: TurnProps) {
  const now = useNow();
  const player = usePlayer();
  const move = useDoc<MoveDoc>(moveRef(code, game.turnIndex));
  const [showAnswer, setShowAnswer] = useState(false);
  const [answerTurn, setAnswerTurn] = useState(game.turnIndex);
  if (answerTurn !== game.turnIndex) {
    setAnswerTurn(game.turnIndex);
    setShowAnswer(false);
  }

  const team = teams.find((t) => t.uid === game.currentTeamUid);
  const card = state?.currentCard;
  const result = game.phase === 'revealed' ? game.lastResult : null;
  const selectedSlot = move.data?.slotIndex ?? (game.phase === 'placing' ? (team?.pendingSlot ?? null) : null);
  const byArtist = Boolean(team && gameMode(game) === 'family' && teamLevel(team) === 'easy');
  const choices = game.choices ?? [];
  const picked = move.data?.choice ?? result?.choice ?? null;
  const pickedName = picked !== null ? choices[picked] : undefined;

  return (
    <>
      <div className="turn-banner" style={team ? { background: team.color, color: textOn(team.color) } : undefined}>
        {team ? `${genitive(team.name)} tur` : 'Laget finns inte längre – hoppa över'}
      </div>

      <section className="music-panel">
        {needsPlay ? (
          <button type="button" className="primary big" onClick={onPlay}>
            ▶ Spela låten
          </button>
        ) : (
          <div className="music-buttons">
            <button type="button" onClick={onPlay}>↺ Spela om</button>
            {player.paused ? (
              <button type="button" onClick={() => { activateFromGesture(); void resume(); }}>▶ Fortsätt</button>
            ) : (
              <button type="button" onClick={() => void pause()}>❚❚ Pausa</button>
            )}
          </div>
        )}
        {player.needsGesture && (
          <button type="button" className="primary" onClick={onPlay}>
            Återuppta musiken
          </button>
        )}
      </section>

      {card && game.phase === 'placing' && (
        <button
          type="button"
          className={`answer ${showAnswer ? 'shown' : ''}`}
          onClick={() => setShowAnswer((v) => !v)}
          aria-expanded={showAnswer}
        >
          {showAnswer ? (
            <>
              <span className="card-year">{card.year}</span>
              <span>
                <span className="card-title">{card.title}</span>
                <span className="card-artist">{card.artist}</span>
              </span>
            </>
          ) : (
            'Tryck för att se svaret'
          )}
        </button>
      )}

      {result && (
        <div className={`result ${result.correct ? 'correct' : 'wrong'}`} role="status">
          <strong>{result.correct ? 'Rätt!' : 'Fel!'}</strong>{' '}
          {result.card.title} – {result.card.artist} ({result.card.year})
          {byArtist && <p>Laget valde {pickedName ?? 'ingen artist'}.</p>}
          {result.reachedTarget && <p><strong>{team?.name} har {game.settings.targetLength} kort och vinner!</strong></p>}
        </div>
      )}

      {game.phase === 'placing' && (
        <p className="move-status">
          {move.data
            ? `${team?.name ?? 'Laget'} har låst ${pickedName ?? 'sitt svar'}.`
            : `Väntar på att ${team?.name ?? 'laget'} ${byArtist ? 'väljer artist' : 'placerar'}…`}
        </p>
      )}

      {team && (
        <Timeline
          cards={team.timeline ?? []}
          color={team.color}
          selectedSlot={selectedSlot}
          highlightCardId={result?.correct ? result.card.cardId : null}
        />
      )}

      <div className="sticky-actions">
        {game.phase === 'placing' ? (
          <button
            type="button"
            className="primary big"
            disabled={busy || !move.data || !team}
            onClick={() => team && move.data && onReveal(team, move.data)}
          >
            Avslöja
          </button>
        ) : (
          <button type="button" className="primary big" disabled={busy} onClick={onNext}>
            {result?.reachedTarget ? 'Visa resultatet' : 'Nästa lag'}
          </button>
        )}
      </div>

      <h2>Ställning</h2>
      <ul className="team-list">
        {teams.map((t) => (
          <li key={t.uid} className={t.uid === game.currentTeamUid ? 'current' : undefined}>
            <TeamName team={t} now={now} />
            <LevelBadge game={game} team={t} />
            <span className="score">{t.timeline?.length ?? 0} / {game.settings.targetLength}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">{game.cardsLeft} kort kvar i leken</p>

      <div className="actions secondary">
        {game.phase === 'placing' && (
          <button type="button" disabled={busy} onClick={onNext}>
            Hoppa över laget
          </button>
        )}
        <button type="button" className="danger" disabled={busy} onClick={onEnd}>
          Avsluta spelet
        </button>
      </div>
    </>
  );
}
