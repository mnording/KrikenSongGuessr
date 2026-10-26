import { useEffect, useState, type ReactNode } from 'react';
import '../play.css';
import { Link, Navigate, useParams } from 'react-router';
import { ChoiceCards } from '../components/ChoiceCards';
import { ErrorText, Loading, Screen } from '../components/Common';
import { FamilyRound } from '../components/FamilyRound';
import { TauntDock, TauntToasts } from '../components/Taunts';
import { UndoDock } from '../components/UndoDock';
import { StreakDock } from '../components/StreakDock';
import { MascotPin } from '../components/Mascot';
import { ProfileForm } from '../components/ProfileForm';
import { TicketTimeline } from '../components/TicketTimeline';
import { cardLines, MAX_TEAMS } from '../engine/game';
import { useCollection, useDoc } from '../hooks/firestore';
import { useNow, usePresence, useUser, useWakeLock } from '../hooks/misc';
import { gameRef, moveRef, teamsRef } from '../game/refs';
import { leaveGame, lockChoice, lockMove, selectSlot, setLevel, updateProfile } from '../game/teamActions';
import { getMascot, MASCOTS, type MascotMood } from '../game/mascots';
import { answersByChoice, choiceTexts, isFast, isStreak, showsChoices, streakChoiceFor } from '../game/modes';
import { resultBand } from '../game/resultBand';
import { atRisk, canContinue, splitScore, type Streak } from '../engine/streak';
import { gameMode, isOnline, teamLevel, type GameDoc, type MoveDoc, type Team, type TeamDoc } from '../game/types';
import { useT } from '../i18n/context';
import { LangSwitch } from '../i18n/LangSwitch';
import { Rich } from '../i18n/Rich';
import type { Messages } from '../i18n/sv';
import { reportError } from '../sentry';
import { errorMessage, isDenied, textOn } from '../util';

/** Fasta armbandstexter som blir för långa på något språk får den mindre storleken, precis som en fråga. */
const LONG_BAND = 10;

export default function Play() {
  const { code = '' } = useParams();
  const { t } = useT();
  const { user, error: authError } = useUser();
  const game = useDoc<GameDoc>(user ? gameRef(code) : null);
  const teams = useCollection<TeamDoc>(user && game.data ? teamsRef(code) : null);
  const me = teams.data.find((team) => team.uid === user?.uid);
  usePresence(code, user?.uid, Boolean(me));

  if (authError) return <Screen><ErrorText error={authError} /></Screen>;
  if (!user || game.loading || (game.data && teams.loading)) return <Loading />;
  if (!game.data) {
    return (
      <Screen title={t.play.gameGoneTitle}>
        <Link to="/" className="button">{t.play.toStart}</Link>
      </Screen>
    );
  }
  if (teams.error || !me) {
    // Inte med (längre). Antingen borttagen av spelledaren eller aldrig anslutit.
    return game.data.status === 'lobby' ? (
      <Screen title={t.play.notInGameTitle}>
        <p>{t.play.notInGame}</p>
        <Link to={`/join/${code}`} className="button primary">{t.join}</Link>
      </Screen>
    ) : (
      <Navigate to={`/join/${code}`} replace />
    );
  }

  const sortedTeams = [...teams.data].sort((a, b) => (a.joinedAt?.toMillis() ?? 0) - (b.joinedAt?.toMillis() ?? 0));

  if (game.data.status === 'lobby') return <Lobby code={code} game={game.data} me={me} teams={sortedTeams} />;
  if (game.data.status === 'finished') {
    const winners = sortedTeams.filter((team) => game.data!.winnerUids.includes(team.uid));
    const bandTeam = winners.find((team) => team.uid === me.uid) ?? winners[0];
    const byScore = [...sortedTeams].sort((a, b) => (b.timeline?.length ?? 0) - (a.timeline?.length ?? 0));
    const title = winnerTitle(game.data, teams.data, me.uid, t);
    return (
      <FestPage>
        <Wristband
          color={bandTeam?.color}
          mascot={bandTeam?.mascot}
          mood="happy"
          mine={bandTeam?.uid === me.uid}
          big={title}
          sub={t.play.gameOver}
          long={title.length > LONG_BAND}
        />
        <Bands teams={byScore} winnerUids={game.data.winnerUids} />
        <p className="hint">{t.play.newRound}</p>
        <h2>{t.play.myTimeline}</h2>
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
      <main className="screen">
        {children}
        <LangSwitch />
      </main>
    </div>
  );
}

/** long: en fråga eller ett lagnamn i stället för ett kort ord. Mindre text, så att den inte avstavas. */
type WristbandProps = { color?: string; mascot?: string; mood?: MascotMood; big: ReactNode; sub?: ReactNode; mine?: boolean; long?: boolean };

/** Armbandet överst: vems skärm det är just nu. Spelas in på nytt när innehållet byts. Maskoten sitter där knappen satt. */
function Wristband({ color, mascot, mood = 'idle', big, sub, mine = false, long = false }: WristbandProps) {
  const pinned = Boolean(getMascot(mascot));
  return (
    <header
      key={`${color}-${typeof big === 'string' ? big : ''}`}
      className={`wristband${mine ? ' mine' : ''}${pinned ? ' pinned' : ''}`}
      style={color ? { backgroundColor: color, color: textOn(color) } : undefined}
      role="status"
    >
      <h1 className={`wristband-big${long ? ' long' : ''}`}>{big}</h1>
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
  /** Fortsätt eller lås: lagets osäkrade kort räknas för sig, "4+2". */
  streak?: Streak | null;
};

/** Alla lag som armband i ett rutnät, så att ingen behöver skrolla i sidled. */
function Bands({ teams, now, showCount = true, shownUid, onShow, winnerUids = [], streak }: BandsProps) {
  const { t } = useT();
  return (
    <ul className={`bands${teams.length <= 8 ? ' few' : ''}`} aria-label={onShow ? t.play.showTeam : t.play.teamsLabel}>
      {teams.map((team) => {
        const offline = now !== undefined && !isOnline(team, now);
        const className = `band${team.uid === shownUid ? ' shown' : ''}${offline ? ' offline' : ''}${winnerUids.includes(team.uid) ? ' winner' : ''}`;
        const style = { backgroundColor: team.color, color: textOn(team.color) };
        const content = (
          <>
            {/* Under spelet behöver namnet och räknaren hela bredden. */}
            {!showCount && <MascotPin mascot={team.mascot} />}
            <span className="band-name">
              {team.name}
              {offline && <span className="band-off">{t.play.offline}</span>}
            </span>
            {showCount && <BandCount team={team} streak={streak} />}
          </>
        );
        return (
          <li key={team.uid}>
            {onShow ? (
              <button type="button" className={className} style={style} aria-pressed={team.uid === shownUid} onClick={() => onShow(team.uid)}>
                {content}
              </button>
            ) : (
              <div className={className} style={style} title={offline ? t.play.offline : undefined}>
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function BandCount({ team, streak }: { team: Team; streak?: Streak | null }) {
  const { t } = useT();
  const { banked, risk } = splitScore(team.timeline ?? [], streak, team.uid);
  return (
    <span className="band-count">
      {banked}
      <span className="visually-hidden"> {t.play.cards}</span>
      {risk > 0 && (
        <span className="band-risk">
          +{risk}
          <span className="visually-hidden"> {t.play.notLockedIn}</span>
        </span>
      )}
    </span>
  );
}

function winnerTitle(game: GameDoc, teams: Team[], myUid: string, t: Messages): string {
  if (game.winnerUids.includes(myUid)) return game.winnerUids.length > 1 ? t.play.sharedWin : t.play.youWon;
  const names = teams.filter((team) => game.winnerUids.includes(team.uid)).map((team) => team.name);
  return names.length ? t.play.won(names) : t.play.gameOver;
}

function Lobby({ code, game, me, teams }: { code: string; game: GameDoc; me: Team; teams: Team[] }) {
  const { t } = useT();
  const family = gameMode(game) === 'family';
  const now = useNow();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const position = teams.findIndex((team) => team.uid === me.uid);
  const full = position >= MAX_TEAMS;

  // Max 10 lag. Den som kom för sent lämnar själv lobbyn.
  useEffect(() => {
    if (full) void leaveGame(code, me.uid).catch((err) => reportError(err, 'team.leave'));
  }, [full, code, me.uid]);

  if (full) {
    return (
      <Screen title={t.play.fullTitle}>
        <p>{t.play.full(MAX_TEAMS)}</p>
        <Link to="/" className="button">{t.back}</Link>
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
        big={t.play.joined}
        long={t.play.joined.length > LONG_BAND}
        sub={
          <>
            {me.name}
            <button type="button" className="link" onClick={() => setEditing((v) => !v)}>
              {editing ? t.close : t.play.edit}
            </button>
          </>
        }
      />
      {editing && (
        <ProfileForm
          initialName={me.name}
          // Ett lag från före maskotarna får maskoten med samma färg, så att det ser ut som förut.
          initialMascot={getMascot(me.mascot)?.id ?? MASCOTS.find((m) => m.color === me.color)?.id}
          takenMascots={teams.filter((team) => team.uid !== me.uid).flatMap((team) => (team.mascot ? [team.mascot] : []))}
          submitLabel={t.profile.save}
          onSubmit={(name, mascot) => {
            updateProfile(code, me.uid, name, mascot)
              .then(() => setEditing(false))
              .catch((err) => {
                reportError(err, 'team.profile');
                setError(errorMessage(err));
              });
          }}
        />
      )}
      <ErrorText error={error} />
      {/* Även lag som gick med innan spelledaren valde Familj ska se nivåvalet direkt, inte bakom Ändra. */}
      {family && (
        <div className="card-box">
          <ChoiceCards
            legend={t.play.familyLevel}
            name="level"
            options={t.levels}
            value={teamLevel(me)}
            onChange={(level) =>
              void setLevel(code, me.uid, level).catch((err) => {
                // Nekat betyder att spelet just startade, då är nivån låst. Det är väntat.
                if (!isDenied(err)) reportError(err, 'team.level');
                setError(errorMessage(err));
              })
            }
          />
        </div>
      )}
      {gameMode(game) === 'film' && (
        <p className="hint">
          <Rich text={t.play.filmHint} />
        </p>
      )}
      <p className="hint">{t.play.waitingStart}</p>
      <h2>{t.play.teams(teams.length)}</h2>
      <Bands teams={teams} now={now} showCount={false} shownUid={me.uid} />
    </FestPage>
  );
}

function InGame({ code, game, me, teams }: { code: string; game: GameDoc; me: Team; teams: Team[] }) {
  const { t } = useT();
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

  const current = teams.find((team) => team.uid === game.currentTeamUid);
  const myTurn = game.currentTeamUid === me.uid;
  const locked = Boolean(move.data);
  // Familj: ett lätt lag väljer artist i stället för lucka, och alla andra får gissa med.
  const byArtist = myTurn && answersByChoice(game, me);
  const texts = choiceTexts(game, t.choices);
  const canPlace = myTurn && !byArtist && game.phase === 'placing' && !locked && !move.loading;
  const canPick = byArtist && game.phase === 'placing' && !locked && !move.loading;
  const result = game.phase === 'revealed' ? game.lastResult : null;
  const shownUid = viewUid ?? (myTurn ? me.uid : game.currentTeamUid ?? me.uid);
  const shown = teams.find((team) => team.uid === shownUid) ?? me;

  const choose = (index: number) => {
    setSlot(index);
    // Visar bara de andra lagen var laget pekar. Det som räknas är Lås, som rapporterar sina fel. Rapporteras inte.
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
      // Även nekat rapporteras: kan laget i tur inte låsa står spelet still.
      reportError(err, 'team.lock');
      setError(t.play.lockFailed(errorMessage(err)));
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

  const resultTeam = result ? teams.find((team) => team.uid === result.teamUid) : undefined;
  const resultMine = result?.teamUid === me.uid;
  const showChoices = showsChoices(game, myTurn, byArtist);

  // Fortsätt eller lås: efter ett rätt svar väljer laget i tur, och de andra ser att det funderar.
  const choosing = Boolean(result && isStreak(game) && canContinue(result, game.cardsLeft));
  const deciding = choosing && resultMine;
  const choice = choosing ? streakChoiceFor(game, resultTeam) : null;
  const risk = resultTeam ? atRisk(game.streak, resultTeam.uid).length : 0;
  const lost = result?.lost ?? [];
  // Inlåst syns direkt under ångerfönstret: korten blir stämplade biljetter.
  const stamping = choice === 'lock' && resultTeam?.uid === shown.uid;
  const band = result
    ? resultBand(
        {
          correct: result.correct,
          choosing,
          choice,
          mine: resultMine,
          teamName: resultTeam?.name ?? t.play.theTeam,
          risk,
          total: resultTeam?.timeline?.length ?? 0,
          lost: lost.length,
        },
        t.band,
      )
    : null;

  return (
    <FestPage>
      <TauntToasts game={game} teams={teams} />
      {result && band ? (
        <Wristband
          color={resultTeam?.color}
          mascot={resultTeam?.mascot}
          mood={band.mood}
          mine={resultMine}
          big={band.big}
          sub={band.sub}
          long={band.long}
        />
      ) : myTurn ? (
        <Wristband color={me.color} mascot={me.mascot} mine big={t.play.yourTurn} sub={me.name} long={t.play.yourTurn.length > LONG_BAND} />
      ) : (
        <Wristband color={current?.color} mascot={current?.mascot} big={current ? t.play.theirTurn(current.name) : t.play.waiting} />
      )}

      <Bands teams={teams} now={now} shownUid={shown.uid} onShow={setViewUid} streak={game.streak} />

      {result && !(result.correct && result.teamUid === shown.uid) && (
        <div className="reveal">
          <div className={`stub${result.correct ? ' won' : ' missed'}`}>
            <span className="stub-year">{result.card.year}</span>
            <span className="stub-text">
              <span className="stub-title">{cardLines(result.card).main}</span>
              <span className="stub-artist">{cardLines(result.card).sub}</span>
            </span>
            {result.card.imageUrl && <img className={`stub-art${result.card.film ? ' poster' : ''}`} src={result.card.imageUrl} alt="" />}
          </div>
          {/* Fortsätt eller lås: korten som revs bort med felet, kvar som spöken tills nästa tur. */}
          {lost.length > 0 && (
            <ol className="ghosts" aria-label={t.play.lostCards(lost.length)}>
              {lost.map((card) => (
                <li key={card.cardId} className="stub ghost">
                  <span className="stub-year">{card.year}</span>
                  <span className="stub-text">
                    <span className="stub-title">{cardLines(card).main}</span>
                    <span className="stub-artist">{cardLines(card).sub}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {result?.reachedTarget && <p className="verdict">{t.play.reachedTarget(game.settings.targetLength)}</p>}

      <p className="hint">
        {deciding ? (
          choice ? null : (
            <Rich text={t.play.decideHint(risk)} />
          )
        ) : choosing ? (
          choice ? null : t.play.eggHint
        ) : result ? (
          t.play.waitingNext
        ) : myTurn && game.phase === 'placing' ? (
          locked ? (
            isFast(game) ? t.play.lockedFast : t.play.lockedHost
          ) : byArtist ? (
            <Rich text={t.play.chooseHint(texts.how)} />
          ) : (
            <Rich text={t.play.slotHint} />
          )
        ) : game.phase === 'placing' ? (
          locked ? t.play.otherLocked(current?.name ?? t.play.theTeam) : t.play.guessAlong
        ) : null}
      </p>
      {game.phase === 'placing' && game.laterRelease === game.turnIndex && (
        <p className="hint">
          <Rich text={t.play.laterRelease} />
        </p>
      )}

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
        <h2>{shown.uid === me.uid ? t.play.myTimeline : t.play.theirTimeline(shown.name)}</h2>
      )}

      <TicketTimeline
        cards={shown.timeline ?? []}
        selectable={canPlace && shown.uid === me.uid}
        selectedSlot={shownSlot}
        onSelect={choose}
        pendingText={locked ? t.play.lockedHere : t.timeline.thinking}
        highlightCardId={result?.correct && result.teamUid === shown.uid ? result.card.cardId : null}
        riskIds={stamping ? [] : atRisk(game.streak, shown.uid)}
        stampedIds={stamping ? atRisk(game.streak, shown.uid) : []}
      />

      <ErrorText error={error} />
      {/* Lagen som väntar kan pika laget som gissar, och efter avslöjandet kan alla reagera. */}
      {deciding && (
        <StreakDock
          code={code}
          uid={me.uid}
          turnIndex={game.turnIndex}
          risk={risk}
          chosen={choice}
          record={me.streakChoice?.turnIndex === game.turnIndex ? me.streakChoice : null}
        />
      )}
      {/* Laget som väljer behöver dockan till sina knappar. Det kan reagera när turen gått vidare. */}
      {!deciding && ((!myTurn && game.phase === 'placing') || (game.phase === 'revealed' && game.lastResult)) && (
        <TauntDock key={`${game.turnIndex}-${game.phase}`} code={code} game={game} me={me} chooser={resultTeam} />
      )}
      {myTurn && locked && game.phase === 'placing' && isFast(game) && lockedAt !== null && (
        <UndoDock code={code} turnIndex={game.turnIndex} lockedAt={lockedAt} onUndone={() => setLockedAt(null)} />
      )}
      {canPick && (
        <div className="sticky-actions">
          <button type="button" className="lock" disabled={pick === null || busy} onClick={(e) => void lock(e.timeStamp)}>
            {pick === null ? texts.pick : busy ? t.play.locking : t.play.lock}
          </button>
        </div>
      )}
      {canPlace && (
        <div className="sticky-actions">
          {shown.uid !== me.uid ? (
            <button type="button" className="lock" onClick={() => setViewUid(me.uid)}>
              {t.play.showOurs}
            </button>
          ) : (
            <button type="button" className="lock" disabled={slot === null || busy} onClick={(e) => void lock(e.timeStamp)}>
              {slot === null ? t.play.pickSlot : busy ? t.play.locking : t.play.lock}
            </button>
          )}
        </div>
      )}
      {gameMode(game) === 'film' && (
        <p className="fest-foot tmdb-credit">
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
            <img src="/tmdb-logo.svg" alt="TMDB" />
          </a>
          {t.play.tmdb}
        </p>
      )}
      <p className="fest-foot">{t.play.foot(game.settings.targetLength, game.cardsLeft)}</p>
    </FestPage>
  );
}
