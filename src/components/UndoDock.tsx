// Snabbläget: laget har några sekunder på sig att ångra sitt drag innan spelledarens telefon avslöjar.
import { useState } from 'react';
import { FAST_UNDO_MS } from '../game/modes';
import { undoMove } from '../game/teamActions';
import { useNow } from '../hooks/misc';
import { useT } from '../i18n/context';
import { reportError } from '../sentry';
import { isDenied } from '../util';

type Props = {
  code: string;
  turnIndex: number;
  /** När laget låste, i den här telefonens tid. */
  lockedAt: number;
  onUndone: () => void;
};

export function UndoDock({ code, turnIndex, lockedAt, onUndone }: Props) {
  const { t } = useT();
  const now = useNow(250);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = Math.ceil((lockedAt + FAST_UNDO_MS - now) / 1000);

  const undo = () => {
    setBusy(true);
    undoMove(code, turnIndex)
      .then(onUndone)
      .catch((err) => {
        // Nekad betyder att ångerfönstret har stängt, det är väntat.
        if (!isDenied(err)) reportError(err, 'team.undo');
        setError(t.undo.tooLate);
      })
      .finally(() => setBusy(false));
  };

  return (
    <div className="sticky-actions">
      <div className="undo-dock">
        {error || left <= 0 ? (
          <p className="hint" role="status">
            {error ?? t.undo.timeUp}
          </p>
        ) : (
          <button type="button" className="undo" aria-label={t.undo.undo} disabled={busy} onClick={undo}>
            <span aria-hidden="true">
              ↩ {t.undo.undo} ({Math.min(left, FAST_UNDO_MS / 1000)})
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
