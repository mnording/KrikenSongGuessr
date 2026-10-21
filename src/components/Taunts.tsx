// Pikarna: knappen och listan för lagen som väntar, och lappen som visas på allas skärmar.
import { useState } from 'react';
import { getMascot } from '../game/mascots';
import { sendTaunt } from '../game/teamActions';
import { SIGNATURE, TAUNT_COOLDOWN_MS, TAUNTS, tauntShownMs, tauntText } from '../game/taunts';
import type { GameDoc, Team } from '../game/types';
import { useNow } from '../hooks/misc';
import { errorMessage, textOn } from '../util';
import { ErrorText } from './Common';
import { MascotPin } from './Mascot';

type Shown = { key: string; team: Team; text: string };

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
    return text ? [{ key: `${team.uid}-${taunt.at.toMillis()}`, team, text }] : [];
  });

  if (seen === null) {
    // Första renderingen: det som redan finns är gammalt.
    setSeen(Object.fromEntries(current.map((t) => [t.key, 0])));
  } else {
    const fresh = current.filter((t) => !(t.key in seen));
    if (fresh.length > 0) setSeen({ ...seen, ...Object.fromEntries(fresh.map((t) => [t.key, now])) });
  }

  const visible = current.filter((t) => seen?.[t.key] && now - seen[t.key] < tauntShownMs(t.text)).slice(-2);
  return (
    <div className={`taunts${inline ? ' inline' : ''}`} aria-live="polite">
      {visible.map(({ key, team, text }) => (
        <p key={key} className="taunt" style={{ backgroundColor: team.color, color: textOn(team.color) }}>
          <MascotPin mascot={team.mascot} mood="cheeky" animate />
          <span>
            <strong>{team.name}:</strong> {text}
          </span>
        </p>
      ))}
    </div>
  );
}

/** Knappen längst ner för lagen som väntar på sin tur. Öppnar de färdiga pikarna. */
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

  const send = (id: string) => {
    setOpen(false);
    setError(null);
    setSentAt(Date.now());
    sendTaunt(code, me.uid, game.turnIndex, id).catch((err) => {
      // Nekad betyder oftast att spärren eller turen tog slut. Då står nedräkningen kvar.
      if ((err as { code?: string }).code === 'permission-denied') {
        setError('Piken gick inte fram. Vänta lite och försök igen.');
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
          <ul className="taunt-options" aria-label="Välj en pik">
            {signature && (
              <li className="taunt-signature">
                <button type="button" onClick={() => send(SIGNATURE)}>
                  <MascotPin mascot={me.mascot} mood="cheeky" />
                  {signature}
                </button>
              </li>
            )}
            {TAUNTS.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => send(t.id)}>
                  {t.text}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="taunt-open" aria-expanded={open} disabled={wait > 0} onClick={() => setOpen((v) => !v)}>
          {wait > 0 ? `Pika igen om ${wait} s` : open ? 'Stäng' : '😏 Skicka en pik'}
        </button>
      </div>
    </div>
  );
}
