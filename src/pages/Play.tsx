import { useEffect, useState, type ReactNode } from 'react';
import '../play.css';
import { Link, Navigate, useParams } from 'react-router';
import { ChoiceCards } from '../components/ChoiceCards';
import { ErrorText, Loading, Screen } from '../components/Common';
import { FamilyRound } from '../components/FamilyRound';
import { TauntDock, TauntToasts } from '../components/Taunts';
import { UndoDock } from '../components/UndoDock';
import { MascotPin } from '../components/Mascot';
import { ProfileForm } from '../components/ProfileForm';
import { TicketTimeline } from '../components/TicketTimeline';
import { cardLines, MAX_TEAMS } from '../engine/game';
import { useCollection, useDoc } from '../hooks/firestore';
import { useNow, usePresence, useUser, useWakeLock } from '../hooks/misc';
import { gameRef, moveRef, teamsRef } from '../game/refs';
import { leaveGame, lockChoice, lockMove, selectSlot, setLevel, updateProfile } from '../game/teamActions';
import { getMascot, MASCOTS, type MascotMood } from '../game/mascots';
import { answersByChoice, choiceTexts, isFast, LEVELS, showsChoices } from '../game/modes';
import { gameMode, isOnline, teamLevel, type GameDoc, type MoveDoc, type Team, type TeamDoc } from '../game/types';
import { errorMessage, genitive, textOn } from '../util';

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

  if (game.data.status === 'lobby') return <Lobby code={code} game={game.data} me={me} teams={sortedTeams} />;
  if (game.data.status === 'finished') {
    const winners = sortedTeams.filter((t) => game.data!.winnerUids.includes(t.uid));
    const bandTeam = winners.find((t) => t.uid === me.uid) ?? winners[0];
    const byScore = [...sortedTeams].sort((a, b) => (b.timeline?.length ?? 0) - (a.timeline?.length ?? 0));
    return (
      <FestPage>
        <Wristband
          color={bandTeam?.color}
          mascot={bandTeam?.mascot}
          mood="happy"
          mine={bandTeam?.uid === me.uid}
          big={winnerTitle(game.data, teams.data, me.uid)}
          sub="Spelet är slut"
        />
        <Bands teams={byScore} winnerUids={game.data.winnerUids} />
        <p className="hint">Spelledaren kan starta en ny omgång.</p>
        <h2>Er tidslinje</h2>
        <TicketTimeline cards={me.timeline ?? []} />
      </FestPage>
    );
  }
  return <InGame code={code} game={game.data} me={me} teams={sortedTeams} />;
}

/** Lagens skärm har en egen värld; värdvyn behåller sitt utseende. */
function FestPage({ children }: { children: ReactNode }) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    const before = meta?.getAttribute('content');
    meta?.setAttribute('content', '#17122e');
    return () => {
      if (before) meta?.setAttribute('content', before);
    };
  }, []);
  return (
    <div className="fest">
      <main className="screen">{children}</main>
    </div>
  );
}

type WristbandProps = { color?: string; mascot?: string; mood?: MascotMood; big: ReactNode; sub?: ReactNode; mine?: boolean };

/** Armbandet överst: vems skärm det är just nu. Spelas in på nytt när innehållet byts. Maskoten sitter där knappen satt. */
function Wristband({ color, mascot, mood = 'idle', big, sub, mine = false }: WristbandProps) {
  const pinned = Boolean(getMascot(mascot));
  return (
    <header
      key={`${color}-${typeof big === 'string' ? big : ''}`}
      className={`wristband${mine ? ' mine' : ''}${pinned ? ' pinned' : ''}`}
      style={color ? { backgroundColor: color, color: textOn(color) } : undefined}
      role="status"
    >
      <h1 className="wristband-big">{big}</h1>
      {sub && <div className="wristband-sub">{sub}</div>}
      {pinned && <MascotPin mascot={mascot} mood={mood} animate className="wristband-pin" />}
    </header>
  );
}

type BandsProps = {
  teams: Team[];
  now?: number;
  showCount?: boolean;
  shownUid?: string;
  onShow?: (uid: string) => void;
  winnerUids?: string[];
};

/** Alla lag som armband i ett rutnät, så att ingen behöver skrolla i sidled. */
function Bands({ teams, now, showCount = true, shownUid, onShow, winnerUids = [] }: BandsProps) {
  return (
    <ul className={`bands${teams.length <= 8 ? ' few' : ''}`} aria-label={onShow ? 'Visa lagets tidslinje' : 'Lag'}>
      {teams.map((t) => {
        const offline = now !== undefined && !isOnline(t, now);
        const className = `band${t.uid === shownUid ? ' shown' : ''}${offline ? ' offline' : ''}${winnerUids.includes(t.uid) ? ' winner' : ''}`;
        const style = { backgroundColor: t.color, color: textOn(t.color) };
        const content = (
          <>
            {/* Under spelet behöver namnet och räknaren hela bredden. */}
            {!showCount && <MascotPin mascot={t.mascot} />}
            <span className="band-name">
              {t.name}
              {offline && <span className="band-off">offline</span>}
            </span>
            {showCount && (
              <span className="band-count" aria-label={`${t.timeline?.length ?? 0} kort`}>
                {t.timeline?.length ?? 0}
              </span>
            )}
          </>
        );
        return (
          <li key={t.uid}>
            {onShow ? (
              <button type="button" className={className} style={style} aria-pressed={t.uid === shownUid} onClick={() => onShow(t.uid)}>
                {content}
              </button>
            ) : (
              <div className={className} style={style} title={offline ? 'offline' : undefined}>
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function winnerTitle(game: GameDoc, teams: Team[], myUid: string): string {
  if (game.winnerUids.includes(myUid)) return game.winnerUids.length > 1 ? 'Delad seger!' : 'Ni vann! 🎉';
  const names = teams.filter((t) => game.winnerUids.includes(t.uid)).map((t) => t.name);
  return names.length ? `${names.join(' och ')} vann` : 'Spelet är slut';
}

function Lobby({ code, game, me, teams }: { code: string; game: GameDoc; me: Team; teams: Team[] }) {
  const family = gameMode(game) === 'family';
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
    <FestPage>
      <Wristband
        color={me.color}
        mascot={me.mascot}
        mood="happy"
        mine
        big="Ni är med!"
        sub={
          <>
            {me.name}
            <button type="button" className="link" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Stäng' : 'Ändra'}
            </button>
          </>
        }
      />
      {editing && (
        <ProfileForm
          initialName={me.name}
          // Ett lag från före maskotarna får maskoten med samma färg, så att det ser ut som förut.
          initialMascot={getMascot(me.mascot)?.id ?? MASCOTS.find((m) => m.color === me.color)?.id}
          takenMascots={teams.filter((t) => t.uid !== me.uid).flatMap((t) => (t.mascot ? [t.mascot] : []))}
          submitLabel="Spara"
          onSubmit={(name, mascot) => {
            updateProfile(code, me.uid, name, mascot)
              .then(() => setEditing(false))
              .catch((err) => setError(errorMessage(err)));
          }}
        />
      )}
      <ErrorText error={error} />
      {/* Även lag som gick med innan spelledaren valde Familj ska se nivåvalet direkt, inte bakom Ändra. */}
      {family && (
        <div className="card-box">
          <ChoiceCards
            legend="Familj-läget: välj nivå"
            name="level"
            options={LEVELS}
            value={teamLevel(me)}
            onChange={(level) => void setLevel(code, me.uid, level).catch((err) => setError(errorMessage(err)))}
          />
        </div>
      )}
      {gameMode(game) === 'film' && (
        <p className="hint">
          Film-läget. Lyssna och <strong>gissa vilken film låten kommer från</strong>, bland fyra.
        </p>
      )}
      <p className="hint">Väntar på att spelledaren startar spelet…</p>
      <h2>Lag ({teams.length})</h2>
      <Bands teams={teams} now={now} showCount={false} shownUid={me.uid} />
    </FestPage>
  );
}

function InGame({ code, game, me, teams }: { code: string; game: GameDoc; me: Team; teams: Team[] }) {
  const now = useNow();
  const move = useDoc<MoveDoc>(moveRef(code, game.turnIndex));
  const [slot, setSlot] = useState<number | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  // Snabbläget: när laget låste, för att räkna ner ångerfönstret.
  const [lockedAt, setLockedAt] = useState<number | null>(null);
  const [slotTurn, setSlotTurn] = useState(game.turnIndex);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewUid, setViewUid] = useState<string | null>(null);
  // Skärmen får inte slockna mitt i en tur, då tappar laget anslutningen.
  useWakeLock(true);

  // Ny tur: glöm den lokala markeringen och följ laget i tur igen.
  if (slotTurn !== game.turnIndex) {
    setSlotTurn(game.turnIndex);
    setSlot(null);
    setPick(null);
    setLockedAt(null);
    setError(null);
    setViewUid(null);
  }

  const current = teams.find((t) => t.uid === game.currentTeamUid);
  const myTurn = game.currentTeamUid === me.uid;
  const locked = Boolean(move.data);
  // Familj: ett lätt lag väljer artist i stället för lucka, och alla andra får gissa med.
  const byArtist = myTurn && answersByChoice(game, me);
  const texts = choiceTexts(game);
  const canPlace = myTurn && !byArtist && game.phase === 'placing' && !locked && !move.loading;
  const canPick = byArtist && game.phase === 'placing' && !locked && !move.loading;
  const result = game.phase === 'revealed' ? game.lastResult : null;
  const shownUid = viewUid ?? (myTurn ? me.uid : game.currentTeamUid ?? me.uid);
  const shown = teams.find((t) => t.uid === shownUid) ?? me;

  const choose = (index: number) => {
    setSlot(index);
    void selectSlot(code, me.uid, index).catch(() => {});
  };

  /** at är tryckningens tidsstämpel, så att ångerfönstret räknas från just då. */
  const lock = async (at: number) => {
    if (byArtist ? pick === null : slot === null) return;
    setBusy(true);
    setError(null);
    setLockedAt(performance.timeOrigin + at);
    try {
      if (byArtist) await lockChoice(code, me.uid, game.turnIndex, pick!);
      else await lockMove(code, me.uid, game.turnIndex, slot!);
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

  const resultTeam = result ? teams.find((t) => t.uid === result.teamUid) : undefined;
  const resultMine = result?.teamUid === me.uid;
  const lockedText = 'Låst här';
  const showChoices = showsChoices(game, myTurn, byArtist);

  return (
    <FestPage>
      <TauntToasts game={game} teams={teams} />
      {result ? (
        <Wristband
          color={resultTeam?.color}
          mascot={resultTeam?.mascot}
          mood={result.correct ? 'happy' : 'sad'}
          mine={resultMine}
          big={result.correct ? 'Rätt!' : 'Fel!'}
          sub={`${resultMine ? 'Ni' : (resultTeam?.name ?? 'Laget')} ${result.correct ? 'fick kortet' : 'missade'}`}
        />
      ) : myTurn ? (
        <Wristband color={me.color} mascot={me.mascot} mine big="Er tur!" sub={me.name} />
      ) : (
        <Wristband color={current?.color} mascot={current?.mascot} big={current ? `${genitive(current.name)} tur` : 'Väntar…'} />
      )}

      <Bands teams={teams} now={now} shownUid={shown.uid} onShow={setViewUid} />

      {result && !(result.correct && result.teamUid === shown.uid) && (
        <div className="reveal">
          <div className={`stub${result.correct ? ' won' : ' missed'}`}>
            <span className="stub-year">{result.card.year}</span>
            <span className="stub-text">
              <span className="stub-title">{cardLines(result.card).main}</span>
              <span className="stub-artist">{cardLines(result.card).sub}</span>
            </span>
            {result.card.imageUrl && <img className="stub-art" src={result.card.imageUrl} alt="" />}
          </div>
        </div>
      )}

      {result?.reachedTarget && <p className="verdict">Det är klart – {game.settings.targetLength} kort!</p>}

      <p className="hint">
        {result ? (
          'Väntar på nästa tur…'
        ) : myTurn && game.phase === 'placing' ? (
          locked ? (
            isFast(game) ? 'Låst! Svaret visas om några sekunder.' : 'Låst! Väntar på att spelledaren avslöjar.'
          ) : byArtist ? (
            <>
              Lyssna och {texts.how}. <strong>Tryck sedan Lås.</strong>
            </>
          ) : (
            <>
              Lyssna och tryck på luckan där låten passar. <strong>Tryck sedan Lås.</strong>
            </>
          )
        ) : game.phase === 'placing' ? (
          locked ? `${current?.name ?? 'Laget'} har låst. Väntar på avslöjandet.` : 'Lyssna och gissa med!'
        ) : null}
      </p>

      <FamilyRound
        code={code}
        game={game}
        me={me}
        myTurn={myTurn}
        byArtist={byArtist}
        pick={move.data?.choice ?? pick}
        onPick={canPick ? setPick : undefined}
      />

      {/* Med alternativen ovanför behöver tidslinjen alltid en rubrik, annars ser första kortet ut som ett alternativ. */}
      {(showChoices || (shown.uid !== me.uid && shown.uid !== game.currentTeamUid)) && (
        <h2>{shown.uid === me.uid ? 'Er tidslinje' : `${genitive(shown.name)} tidslinje`}</h2>
      )}

      <TicketTimeline
        cards={shown.timeline ?? []}
        selectable={canPlace && shown.uid === me.uid}
        selectedSlot={shownSlot}
        onSelect={choose}
        pendingText={locked ? lockedText : 'De funderar här…'}
        highlightCardId={result?.correct && result.teamUid === shown.uid ? result.card.cardId : null}
      />

      <ErrorText error={error} />
      {/* Lagen som väntar kan pika laget som gissar, och efter avslöjandet kan alla reagera. */}
      {((!myTurn && game.phase === 'placing') || (game.phase === 'revealed' && game.lastResult)) && (
        <TauntDock key={`${game.turnIndex}-${game.phase}`} code={code} game={game} me={me} />
      )}
      {myTurn && locked && game.phase === 'placing' && isFast(game) && lockedAt !== null && (
        <UndoDock code={code} turnIndex={game.turnIndex} lockedAt={lockedAt} onUndone={() => setLockedAt(null)} />
      )}
      {canPick && (
        <div className="sticky-actions">
          <button type="button" className="lock" disabled={pick === null || busy} onClick={(e) => void lock(e.timeStamp)}>
            {pick === null ? texts.pick : busy ? 'Låser…' : 'Lås'}
          </button>
        </div>
      )}
      {canPlace && (
        <div className="sticky-actions">
          {shown.uid !== me.uid ? (
            <button type="button" className="lock" onClick={() => setViewUid(me.uid)}>
              Visa vår tidslinje
            </button>
          ) : (
            <button type="button" className="lock" disabled={slot === null || busy} onClick={(e) => void lock(e.timeStamp)}>
              {slot === null ? 'Välj en lucka' : busy ? 'Låser…' : 'Lås'}
            </button>
          )}
        </div>
      )}
      <p className="fest-foot">
        Först till {game.settings.targetLength} kort vinner · {game.cardsLeft} kort kvar i leken
      </p>
    </FestPage>
  );
}
