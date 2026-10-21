// Fortsätt eller lås på spelledarens telefon: vad laget väljer, reservknapparna och ställningen "4 + 2".
import { useState } from 'react';
import { atRisk, splitScore } from '../engine/streak';
import { streakChoiceFor } from '../game/modes';
import type { GameDoc, StreakAction, Team } from '../game/types';
import { useNow } from '../hooks/misc';

/** Reservknapparna dyker upp först när laget har fått tid att välja själv. */
const FALLBACK_AFTER_MS = 20_000;

/** Raderna i resultatrutan: vad laget tappade, och vad det väljer. */
export function HostStreakNote({ game, team, deciding }: { game: GameDoc; team: Team | undefined; deciding: boolean }) {
  const lost = game.lastResult?.lost?.length ?? 0;
  const risk = team ? atRisk(game.streak, team.uid).length : 0;
  const choice = deciding ? streakChoiceFor(game, team) : null;
  const name = team?.name ?? 'Laget';
  return (
    <>
      {lost > 0 && (
        <p>
          {name} tappade {lost === 1 ? 'sitt kort som inte var inlåst' : `sina ${lost} kort som inte var inlåsta`}.
        </p>
      )}
      {deciding &&
        (choice ? (
          <p>
            <strong>
              {name} {choice === 'continue' ? 'fortsätter' : 'låser in'}.
            </strong>{' '}
            {choice === 'continue' ? 'Nästa låt startar' : 'Turen går vidare'} om några sekunder, om de inte ångrar sig.
          </p>
        ) : (
          <p>
            <strong>{name} väljer på sin telefon:</strong> låsa in {risk === 1 ? 'kortet' : `${risk} kort`} eller fortsätta
            med en ny låt.
          </p>
        ))}
    </>
  );
}

type FallbackProps = { game: GameDoc; team: Team | undefined; busy: boolean; onDecide: (action: StreakAction) => void };

/**
 * Reserv om lagets telefon inte svarar. Knapparna visas först efter en stund och aldrig när laget har valt,
 * så att spelledaren inte väljer åt laget av misstag mitt i ett samtal. Fortsätt frågar först.
 */
export function HostStreakFallback({ game, team, busy, onDecide }: FallbackProps) {
  const now = useNow(1000);
  const [shownAt] = useState(() => Date.now());
  if (streakChoiceFor(game, team)) return <p className="muted small">Laget har valt. Det kan ångra sig några sekunder.</p>;
  if (now - shownAt < FALLBACK_AFTER_MS) return <p className="muted small">Laget väljer på sin telefon…</p>;
  return (
    <div className="fallback">
      <p className="muted small">Laget svarar inte? Välj åt det:</p>
      <div className="music-buttons">
        <button type="button" disabled={busy} onClick={() => onDecide('lock')}>
          Lås in åt laget
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Fortsätta åt ${team?.name ?? 'laget'}? Ett fel tar korten som inte är inlåsta.`)) onDecide('continue');
          }}
        >
          Fortsätt åt laget
        </button>
      </div>
    </div>
  );
}

/** Lagets kort mot målet. Med Fortsätt eller lås syns kort som inte är inlåsta för sig: "4 + 2 / 7". */
export function StreakScore({ game, team }: { game: GameDoc; team: Team }) {
  const { banked, risk } = splitScore(team.timeline ?? [], game.streak, team.uid);
  return (
    <span className="score">
      {banked}
      {risk > 0 && (
        <span className="risk-count">
          {' '}
          + {risk}
          <span className="visually-hidden"> ej inlåsta</span>
        </span>
      )}{' '}
      / {game.settings.targetLength}
    </span>
  );
}
