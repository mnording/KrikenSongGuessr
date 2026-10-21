// Pikarna: knappen och listan för lagen som väntar, och lappen som visas på allas skärmar.
// Bara pikens id sparas, så att varje telefon visar den på sitt eget språk.
import { useState } from 'react';
import { getMascot } from '../game/mascots';
import { sendTaunt } from '../game/teamActions';
import { DECISION_TAUNTS, isReaction, REACTIONS, reactionKind, SIGNATURE, TAUNT_COOLDOWN_MS, TAUNTS, tauntMood, tauntShownMs, tauntText } from '../game/taunts';
import { isStreak, streakChoiceFor } from '../game/modes';
import { canContinue } from '../engine/streak';
import type { GameDoc, Team } from '../game/types';
import { useNow } from '../hooks/misc';
import { useT } from '../i18n/context';
import { reportError } from '../sentry';
import { errorMessage, isDenied, textOn } from '../util';
import { ErrorText } from './Common';
import { MascotPin } from './Mascot';

type Shown = { key: string; team: Team; text: string; id: string };

/**
 * Nya pikar under turen, som små armband överst på skärmen i fyra sekunder.
 * Pikar som fanns när skärmen öppnades visas inte igen.
 */
export function TauntToasts({ game, teams, inline = false }: { game: GameDoc; teams: Team[]; inline?: boolean }) {
  const { t } = useT();
  const now = useNow(500);
  // När varje pik först syntes här, i den här telefonens tid. 0 betyder att den var gammal redan då.
  const [seen, setSeen] = useState<Record<string, number> | null>(null);

  const current: Shown[] = teams.flatMap((team) => {
    const taunt = team.taunt;
    if (!taunt?.at || taunt.turnIndex !== game.turnIndex) return [];
    const text = tauntText(taunt.id, team, t.taunts);
    return text ? [{ key: `${team.uid}-${taunt.at.toMillis()}`, team, text, id: taunt.id }] : [];
  });

  if (seen === null) {
    // Första renderingen: det som redan finns är gammalt.
    setSeen(Object.fromEntries(current.map((s) => [s.key, 0])));
  } else {
    const fresh = current.filter((s) => !(s.key in seen));
    if (fresh.length > 0) setSeen({ ...seen, ...Object.fromEntries(fresh.map((s) => [s.key, now])) });
  }

  const visible = current.filter((s) => seen?.[s.key] && now - seen[s.key] < tauntShownMs(s.text)).slice(-2);
  // En reaktion från ett annat lag säger vem den gäller, så att den inte blandas ihop med svaret på den.
  const resultTeam = teams.find((team) => team.uid === game.lastResult?.teamUid);
  const target = (id: string, from: Team) =>
    isReaction(id) && resultTeam && resultTeam.uid !== from.uid ? t.tauntDock.to(resultTeam.name) : '';
  return (
    <div className={`taunts${inline ? ' inline' : ''}`} aria-live="polite">
      {visible.map(({ key, team, text, id }) => (
        <p key={key} className="taunt" style={{ backgroundColor: team.color, color: textOn(team.color) }}>
          <MascotPin mascot={team.mascot} mood={tauntMood(id)} animate />
          <span>
            <strong>{team.name}</strong>
            {target(id, team)}: {text}
          </span>
        </p>
      ))}
    </div>
  );
}

/**
 * Knappen längst ner. Medan ett lag gissar kan de andra pika det. Efter avslöjandet kan alla reagera:
 * de andra gratulerar eller retas, och laget självt tackar eller lovar revansch.
 */
/** chooser: laget som väljer att fortsätta eller låsa in, så att hetsen slutar när det har valt. */
export function TauntDock({ code, game, me, chooser }: { code: string; game: GameDoc; me: Team; chooser?: Team }) {
  const { t } = useT();
  const now = useNow(500);
  const [open, setOpen] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Spärren räknas från lagets sparade pik, så att den håller även efter omladdning.
  // Tryckningen räknas direkt, innan servern hunnit svara.
  const last = Math.max(sentAt, me.taunt?.at?.toMillis() ?? 0);
  // useNow tickar varannan halvsekund, så klockan kan ligga lite efter tryckningen.
  const wait = Math.min(TAUNT_COOLDOWN_MS / 1000, Math.ceil((last + TAUNT_COOLDOWN_MS - now) / 1000));
  const mascot = getMascot(me.mascot);
  const signature = mascot ? t.taunts.signatures[mascot.id] : undefined;
  const result = game.phase === 'revealed' ? game.lastResult : null;
  const reactions = result ? REACTIONS.filter((r) => r.kind === reactionKind(result.teamUid === me.uid, result.correct)) : null;
  // Fortsätt eller lås: medan ett annat lag väljer kan man hetsa det åt något håll.
  const egging = Boolean(
    result && result.teamUid !== me.uid && isStreak(game) && canContinue(result, game.cardsLeft) && !streakChoiceFor(game, chooser),
  );

  /** at är tryckningens tidsstämpel, så att nedräkningen börjar exakt då. */
  const send = (id: string, at: number) => {
    setOpen(false);
    setError(null);
    setSentAt(performance.timeOrigin + at);
    sendTaunt(code, me.uid, game.turnIndex, id).catch((err) => {
      // Nekad betyder oftast att spärren eller turen tog slut, det är väntat. Då står nedräkningen kvar.
      if (isDenied(err)) {
        setError(t.tauntDock.notThrough);
      } else {
        reportError(err, 'team.taunt');
        setSentAt(0);
        setError(t.tauntDock.failed(errorMessage(err)));
      }
    });
  };

  return (
    <div className="sticky-actions">
      <div className="taunt-dock">
        <ErrorText error={error} />
        {open && (
          <ul className="taunt-options" aria-label={reactions ? t.tauntDock.pickReaction : t.tauntDock.pickTaunt}>
            {egging &&
              DECISION_TAUNTS.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={(e) => send(d.id, e.timeStamp)}>
                    {t.taunts.taunts[d.id]}
                  </button>
                </li>
              ))}
            {reactions?.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={(e) => send(r.id, e.timeStamp)}>
                  {t.taunts.taunts[r.id]}
                </button>
              </li>
            ))}
            {!reactions && signature && (
              <li className="taunt-signature">
                <button type="button" onClick={(e) => send(SIGNATURE, e.timeStamp)}>
                  <MascotPin mascot={me.mascot} mood="cheeky" />
                  {signature}
                </button>
              </li>
            )}
            {!reactions &&
              TAUNTS.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={(e) => send(p.id, e.timeStamp)}>
                    {t.taunts.taunts[p.id]}
                  </button>
                </li>
              ))}
          </ul>
        )}
        <button type="button" className="taunt-open" aria-expanded={open} disabled={wait > 0} onClick={() => setOpen((v) => !v)}>
          {wait > 0
            ? reactions && !egging
              ? t.tauntDock.reactAgain(wait)
              : t.tauntDock.tauntAgain(wait)
            : open
              ? t.close
              : egging
                ? t.tauntDock.egg
                : reactions
                  ? t.tauntDock.react
                  : t.tauntDock.send}
        </button>
      </div>
    </div>
  );
}
