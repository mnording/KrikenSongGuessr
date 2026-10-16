import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ErrorText, Loading, Scoreboard, Screen, TeamDot, TeamName } from '../components/Common';
import { ProfileForm } from '../components/ProfileForm';
import { Timeline } from '../components/Timeline';
import { MAX_TEAMS } from '../engine/game';
import { useCollection, useDoc } from '../hooks/firestore';
import { useNow, usePresence, useUser } from '../hooks/misc';
import { gameRef, moveRef, teamsRef } from '../game/refs';
import { leaveGame, lockMove, selectSlot, updateProfile } from '../game/teamActions';
import type { GameDoc, MoveDoc, Team, TeamDoc } from '../game/types';
import { errorMessage } from '../util';

export default function Play() {
  const { code = '' } = useParams();
  const { user, error: authError } = useUser();
  const game = useDoc<GameDoc>(user ? gameRef(code) : null);
  const teams = useCollection<TeamDoc>(user && game.data ? teamsRef(code) : null);
  const me = teams.data.find((t) => t.uid === user?.uid);
  usePresence(code, user?.uid, Boolean(me));

  if (authError) return <Screen><ErrorText error={authError} /></Screen>;
  if (!user || game.loading || (game.data && teams.loading)) return <Loading />;
  if (!game.data) {
    return (
      <Screen title="Spelet finns inte längre">
        <Link to="/" className="button">Till startsidan</Link>
      </Screen>
    );
  }
  if (teams.error || !me) {
    // Inte med (längre). Antingen borttagen av spelledaren eller aldrig anslutit.
    return game.data.status === 'lobby' ? (
      <Screen title="Du är inte med i spelet">
        <p>Spelledaren kan ha tagit bort ditt lag. Du kan gå med igen.</p>
        <Link to={`/join/${code}`} className="button primary">Gå med</Link>
      </Screen>
    ) : (
      <Navigate to={`/join/${code}`} replace />
    );
  }

  const sortedTeams = [...teams.data].sort((a, b) => (a.joinedAt?.toMillis() ?? 0) - (b.joinedAt?.toMillis() ?? 0));

  if (game.data.status === 'lobby') return <Lobby code={code} me={me} teams={sortedTeams} />;
  if (game.data.status === 'finished') {
    return (
      <Screen title={winnerTitle(game.data, teams.data, me.uid)}>
        <Scoreboard teams={teams.data} target={game.data.settings.targetLength} winnerUids={game.data.winnerUids} />
        <p className="muted">Spelledaren kan starta en ny omgång.</p>
        <h2>Er tidslinje</h2>
        <Timeline cards={me.timeline ?? []} color={me.color} />
      </Screen>
    );
  }
  return <InGame code={code} game={game.data} me={me} teams={teams.data} />;
}

function winnerTitle(game: GameDoc, teams: Team[], myUid: string): string {
  if (game.winnerUids.includes(myUid)) return game.winnerUids.length > 1 ? 'Delad seger!' : 'Ni vann! 🎉';
  const names = teams.filter((t) => game.winnerUids.includes(t.uid)).map((t) => t.name);
  return names.length ? `${names.join(' och ')} vann` : 'Spelet är slut';
}

function Lobby({ code, me, teams }: { code: string; me: Team; teams: Team[] }) {
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const position = teams.findIndex((t) => t.uid === me.uid);
  const full = position >= MAX_TEAMS;

  // Max 10 lag. Den som kom för sent lämnar själv lobbyn.
  useEffect(() => {
    if (full) void leaveGame(code, me.uid).catch(() => {});
  }, [full, code, me.uid]);

  if (full) {
    return (
      <Screen title="Spelet är fullt">
        <p>Högst {MAX_TEAMS} lag får vara med.</p>
        <Link to="/" className="button">Tillbaka</Link>
      </Screen>
    );
  }

  return (
    <Screen title="Ni är med!">
      <div className="me-banner" style={{ borderColor: me.color }}>
        <TeamDot color={me.color} />
        <strong>{me.name}</strong>
        <button type="button" className="link" onClick={() => setEditing((v) => !v)}>
          {editing ? 'Stäng' : 'Ändra'}
        </button>
      </div>
      {editing && (
        <ProfileForm
          initialName={me.name}
          initialColor={me.color}
          takenColors={teams.filter((t) => t.uid !== me.uid).map((t) => t.color)}
          submitLabel="Spara"
          onSubmit={(name, color) => {
            updateProfile(code, me.uid, name, color)
              .then(() => setEditing(false))
              .catch((err) => setError(errorMessage(err)));
          }}
        />
      )}
      <ErrorText error={error} />
      <p className="muted">Väntar på att spelledaren startar spelet…</p>
      <h2>Lag ({teams.length})</h2>
      <ul className="team-list">
        {teams.map((t) => (
          <li key={t.uid}>
            <TeamName team={t} now={now} />
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function InGame({ code, game, me, teams }: { code: string; game: GameDoc; me: Team; teams: Team[] }) {
  const now = useNow();
  const move = useDoc<MoveDoc>(moveRef(code, game.turnIndex));
  const [slot, setSlot] = useState<number | null>(null);
  const [slotTurn, setSlotTurn] = useState(game.turnIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewUid, setViewUid] = useState<string | null>(null);

  // Ny tur: glöm den lokala markeringen.
  if (slotTurn !== game.turnIndex) {
    setSlotTurn(game.turnIndex);
    setSlot(null);
    setError(null);
  }

  const current = teams.find((t) => t.uid === game.currentTeamUid);
  const myTurn = game.currentTeamUid === me.uid;
  const locked = Boolean(move.data);
  const canPlace = myTurn && game.phase === 'placing' && !locked && !move.loading;
  const result = game.phase === 'revealed' ? game.lastResult : null;
  const shownUid = viewUid ?? (myTurn ? me.uid : game.currentTeamUid ?? me.uid);
  const shown = teams.find((t) => t.uid === shownUid) ?? me;

  const choose = (index: number) => {
    setSlot(index);
    void selectSlot(code, me.uid, index).catch(() => {});
  };

  const lock = async () => {
    if (slot === null) return;
    setBusy(true);
    setError(null);
    try {
      await lockMove(code, me.uid, game.turnIndex, slot);
    } catch (err) {
      setError(`Kunde inte låsa: ${errorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  };

  // Vald lucka för den som visas: lokal för mig, annars den lagret lagt ut.
  const shownSlot =
    shown.uid === me.uid && myTurn
      ? (move.data?.slotIndex ?? slot)
      : shown.uid === game.currentTeamUid && game.phase === 'placing'
        ? (move.data?.slotIndex ?? shown.pendingSlot ?? null)
        : null;

  return (
    <main className="screen">
      <div className="turn-banner" style={{ background: current?.color ?? '#334155' }}>
        {myTurn ? 'Er tur!' : current ? `${current.name}s tur` : 'Väntar…'}
      </div>

      {result && (
        <div className={`result ${result.correct ? 'correct' : 'wrong'}`} role="status">
          <strong>{result.correct ? 'Rätt!' : 'Fel!'}</strong>{' '}
          {result.teamUid === me.uid ? 'Ni' : teams.find((t) => t.uid === result.teamUid)?.name}{' '}
          {result.correct ? 'fick kortet.' : 'missade.'}
          <div className="reveal-card">
            <span className="card-year">{result.card.year}</span>
            <span>
              <span className="card-title">{result.card.title}</span>
              <span className="card-artist">{result.card.artist}</span>
            </span>
          </div>
          {result.reachedTarget && <p><strong>Det är klart – {game.settings.targetLength} kort!</strong></p>}
        </div>
      )}

      {myTurn && game.phase === 'placing' && (
        <div className="instructions">
          {locked ? (
            <p>Låst! Väntar på att spelledaren avslöjar.</p>
          ) : (
            <p>Lyssna och tryck på luckan där låten passar. Tryck sedan Lås.</p>
          )}
        </div>
      )}
      {!myTurn && game.phase === 'placing' && (
        <p className="muted">{locked ? `${current?.name ?? 'Laget'} har låst. Väntar på avslöjandet.` : 'Lyssna och gissa med!'}</p>
      )}

      <div className="team-tabs" role="tablist" aria-label="Visa lagets tidslinje">
        {teams.map((t) => (
          <button
            key={t.uid}
            type="button"
            role="tab"
            aria-selected={t.uid === shown.uid}
            className={`tab${t.uid === shown.uid ? ' active' : ''}`}
            style={t.uid === shown.uid ? { borderColor: t.color } : undefined}
            onClick={() => setViewUid(t.uid)}
          >
            <TeamName team={t} now={now} /> <span className="score">{t.timeline?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <Timeline
        cards={shown.timeline ?? []}
        color={shown.color}
        selectable={canPlace && shown.uid === me.uid}
        selectedSlot={shownSlot}
        onSelect={choose}
        highlightCardId={result?.correct && result.teamUid === shown.uid ? result.card.cardId : null}
      />

      <ErrorText error={error} />
      {canPlace && (
        <div className="sticky-actions">
          {shown.uid !== me.uid ? (
            <button type="button" className="primary" onClick={() => setViewUid(me.uid)}>
              Visa vår tidslinje
            </button>
          ) : (
            <button type="button" className="primary big" disabled={slot === null || busy} onClick={lock}>
              {slot === null ? 'Välj en lucka' : 'Lås'}
            </button>
          )}
        </div>
      )}
      <p className="muted small">
        Först till {game.settings.targetLength} kort vinner · {game.cardsLeft} kort kvar i leken
      </p>
    </main>
  );
}
