// Snabbläget: laget har några sekunder på sig att ångra sitt drag innan spelledarens telefon avslöjar.
import { useState } from 'react';
import { FAST_UNDO_MS } from '../game/modes';
import { undoMove } from '../game/teamActions';
import { useNow } from '../hooks/misc';

type Props = {
  code: string;
  turnIndex: number;
  /** När laget låste, i den här telefonens tid. */
  lockedAt: number;
  onUndone: () => void;
};

export function UndoDock({ code, turnIndex, lockedAt, onUndone }: Props) {
  const now = useNow(250);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = Math.ceil((lockedAt + FAST_UNDO_MS - now) / 1000);

  const undo = () => {
    setBusy(true);
    undoMove(code, turnIndex)
      .then(onUndone)
      .catch(() => setError('För sent att ångra. Svaret visas strax.'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="sticky-actions">
      <div className="undo-dock">
        {error || left <= 0 ? (
          <p className="hint" role="status">
            {error ?? 'Ångra-tiden är slut. Svaret visas strax.'}
          </p>
        ) : (
          <button type="button" className="undo" aria-label="Ångra" disabled={busy} onClick={undo}>
            <span aria-hidden="true">↩ Ångra ({Math.min(left, FAST_UNDO_MS / 1000)})</span>
          </button>
        )}
      </div>
    </div>
  );
}
