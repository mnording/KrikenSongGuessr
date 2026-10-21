// Fortsätt eller lås: lagets två knappar efter ett rätt svar, och några sekunder att ångra sig, en gång.
import { useEffect, useRef, useState } from 'react';
import { STREAK_TAP_GUARD_MS, STREAK_UNDO_MS } from '../game/modes';
import { chooseStreak, undoStreak } from '../game/teamActions';
import type { StreakAction, TeamDoc } from '../game/types';
import { useNow } from '../hooks/misc';
import { useT } from '../i18n/context';
import { errorMessage } from '../util';
import { ErrorText } from './Common';

type Props = {
  code: string;
  uid: string;
  turnIndex: number;
  /** Kort som inte är inlåsta och står på spel. */
  risk: number;
  /** Lagets gällande val för turen, om det har valt. */
  chosen: StreakAction | null;
  /** Lagets sparade val för turen, även ett ångrat. Säger om laget redan har ångrat sig en gång. */
  record: TeamDoc['streakChoice'];
};

export function StreakDock({ code, uid, turnIndex, risk, chosen, record }: Props) {
  const { t } = useT();
  const now = useNow(250);
  // Dockan dyker upp där Lås nyss satt. Ett reflextryck de första ögonblicken ska inte bli ett val.
  const [armed, setArmed] = useState(false);
  const [pressedAt, setPressedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  const firstChoice = useRef<HTMLButtonElement>(null);
  const swapped = useRef(false);
  const afterUndo = record?.action === 'undone';
  const canUndo = Boolean(chosen && record && !record.undone);
  const status: Record<StreakAction, string> = { continue: t.streak.continuing, lock: t.streak.lockedIn };

  useEffect(() => {
    const timer = setTimeout(() => setArmed(true), STREAK_TAP_GUARD_MS);
    return () => clearTimeout(timer);
  }, []);

  // Knappen som hade fokus försvinner när dockan byter läge. Flytta fokus till det som kom i stället.
  useEffect(() => {
    if (!swapped.current) {
      swapped.current = true;
      return;
    }
    (chosen ? undoButton.current : firstChoice.current)?.focus();
  }, [chosen]);

  const choose = async (action: StreakAction, at: number) => {
    if (!armed || busy) return;
    setBusy(true);
    setError(null);
    setPressedAt(performance.timeOrigin + at);
    try {
      await chooseStreak(code, uid, turnIndex, action, afterUndo);
    } catch (err) {
      setPressedAt(null);
      setError(t.streak.failed(errorMessage(err)));
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    setBusy(true);
    setError(null);
    try {
      await undoStreak(code, uid, turnIndex);
      setPressedAt(null);
    } catch (err) {
      // Nekad betyder att fönstret har stängt. Annat är oftast nätet, och då går det att försöka igen.
      setError((err as { code?: string }).code === 'permission-denied' ? t.streak.tooLate : t.streak.retry);
    } finally {
      setBusy(false);
    }
  };

  const from = pressedAt ?? record?.at?.toMillis() ?? now;
  const left = Math.ceil((from + STREAK_UNDO_MS - now) / 1000);

  return (
    <div className="sticky-actions">
      {/* Finns hela tiden, så att skärmläsaren läser upp när valet ändras. */}
      <p className="visually-hidden" role="status">
        {chosen ? status[chosen] : ''}
      </p>
      {chosen ? (
        <div className="undo-dock">
          {canUndo && left > 0 ? (
            <button
              ref={undoButton}
              type="button"
              className="undo"
              aria-label={t.streak.undoLabel(chosen === 'continue' ? t.streak.keepGoing : t.streak.lockIn)}
              disabled={busy}
              onClick={() => void undo()}
            >
              <span aria-hidden="true">
                {chosen === 'continue' ? t.streak.chipContinue : t.streak.chipLock} · ↩ {t.undo.undo} (
                {Math.min(left, STREAK_UNDO_MS / 1000)})
              </span>
            </button>
          ) : (
            <p className="hint" aria-hidden="true">
              {status[chosen]}
            </p>
          )}
          <ErrorText error={error} />
        </div>
      ) : (
        <div className={`streak-dock${armed ? '' : ' arming'}`}>
          <button
            ref={firstChoice}
            type="button"
            className="bank"
            aria-disabled={!armed}
            disabled={busy}
            onClick={(e) => void choose('lock', e.timeStamp)}
          >
            <span className="choice-word">{t.streak.lockIn}</span>
            <span className="choice-note">{t.streak.banked(risk)}</span>
          </button>
          <span className="choice-or" aria-hidden="true">
            {t.streak.or}
          </span>
          <button
            type="button"
            className="lock"
            aria-disabled={!armed}
            disabled={busy}
            onClick={(e) => void choose('continue', e.timeStamp)}
          >
            <span className="choice-word">{t.streak.keepGoing}</span>
            <span className="choice-note">{t.streak.loss(risk)}</span>
          </button>
          {afterUndo && <p className="choice-last">{t.streak.lastChoice}</p>}
          <ErrorText error={error} />
        </div>
      )}
    </div>
  );
}
