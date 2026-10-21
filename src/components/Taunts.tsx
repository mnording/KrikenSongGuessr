// Pikarna: knappen och listan för lagen som väntar, och lappen som visas på allas skärmar.
import { useState } from 'react';
import { getMascot } from '../game/mascots';
import { sendTaunt } from '../game/teamActions';
import { isReaction, REACTIONS, reactionKind, SIGNATURE, TAUNT_COOLDOWN_MS, TAUNTS, tauntMood, tauntShownMs, tauntText } from '../game/taunts';
import type { GameDoc, Team } from '../game/types';
import { useNow } from '../hooks/misc';
import { errorMessage, textOn } from '../util';
import { ErrorText } from './Common';
import { MascotPin } from './Mascot';

type Shown = { key: string; team: Team; text: string; id: string };

/**
 * Nya pikar under turen, som små armband överst på skärmen i fyra sekunder.
 * Pikar som fanns när skärmen öppnades visas inte igen.
 */
export function TauntToasts({ game, teams, inline = false }: { game: GameDoc; teams: Team[]; inline?: boolean }) {
  const now = useNow(500);
  // När varje pik först syntes här, i den här telefonens tid. 0 betyder att den var gammal redan då.
  const [seen, setSeen] = useState<Record<string, number> | null>(null);

  const current: Shown[] = teams.flatMap((team) => {
    const taunt = team.taunt;
    if (!taunt?.at || taunt.turnIndex !== game.turnIndex) return [];
    const text = tauntText(taunt.id, team);
    return text ? [{ key: `${team.uid}-${taunt.at.toMillis()}`, team, text, id: taunt.id }] : [];
  });

  if (seen === null) {
    // Första renderingen: det som redan finns är gammalt.
    setSeen(Object.fromEntries(current.map((t) => [t.key, 0])));
  } else {
    const fresh = current.filter((t) => !(t.key in seen));
    if (fresh.length > 0) setSeen({ ...seen, ...Object.fromEntries(fresh.map((t) => [t.key, now])) });
  }

  const visible = current.filter((t) => seen?.[t.key] && now - seen[t.key] < tauntShownMs(t.text)).slice(-2);
  // En reaktion från ett annat lag säger vem den gäller, så att den inte blandas ihop med svaret på den.
  const resultTeam = teams.find((t) => t.uid === game.lastResult?.teamUid);
  const target = (id: string, from: Team) =>
    isReaction(id) && resultTeam && resultTeam.uid !== from.uid ? ` till ${resultTeam.name}` : '';
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
export function TauntDock({ code, game, me }: { code: string; game: GameDoc; me: Team }) {
  const now = useNow(500);
  const [open, setOpen] = useState(false);
  const [sentAt, setSentAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Spärren räknas från lagets sparade pik, så att den håller även efter omladdning.
  // Tryckningen räknas direkt, innan servern hunnit svara.
  const last = Math.max(sentAt, me.taunt?.at?.toMillis() ?? 0);
  // useNow tickar varannan halvsekund, så klockan kan ligga lite efter tryckningen.
  const wait = Math.min(TAUNT_COOLDOWN_MS / 1000, Math.ceil((last + TAUNT_COOLDOWN_MS - now) / 1000));
  const signature = getMascot(me.mascot)?.signature;
  const result = game.phase === 'revealed' ? game.lastResult : null;
  const reactions = result ? REACTIONS.filter((r) => r.kind === reactionKind(result.teamUid === me.uid, result.correct)) : null;

  /** at är tryckningens tidsstämpel, så att nedräkningen börjar exakt då. */
  const send = (id: string, at: number) => {
    setOpen(false);
    setError(null);
    setSentAt(performance.timeOrigin + at);
    sendTaunt(code, me.uid, game.turnIndex, id).catch((err) => {
      // Nekad betyder oftast att spärren eller turen tog slut. Då står nedräkningen kvar.
      if ((err as { code?: string }).code === 'permission-denied') {
        setError('Det gick inte fram. Rundan kan ha gått vidare, eller så behöver ni vänta lite.');
      } else {
        setSentAt(0);
        setError(`Piken gick inte fram: ${errorMessage(err)}`);
      }
    });
  };

  return (
    <div className="sticky-actions">
      <div className="taunt-dock">
        <ErrorText error={error} />
        {open && (
          <ul className="taunt-options" aria-label={reactions ? 'Välj en reaktion' : 'Välj en pik'}>
            {reactions?.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={(e) => send(r.id, e.timeStamp)}>
                  {r.text}
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
              TAUNTS.map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={(e) => send(t.id, e.timeStamp)}>
                    {t.text}
                  </button>
                </li>
              ))}
          </ul>
        )}
        <button type="button" className="taunt-open" aria-expanded={open} disabled={wait > 0} onClick={() => setOpen((v) => !v)}>
          {wait > 0 ? `${reactions ? 'Reagera' : 'Pika'} igen om ${wait} s` : open ? 'Stäng' : reactions ? '🎉 Reagera' : '😏 Skicka en pik'}
        </button>
      </div>
    </div>
  );
}
