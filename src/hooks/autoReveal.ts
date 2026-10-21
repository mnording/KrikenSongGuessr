// Snabbläget på spelledarens telefon: avslöja själv när lagets ångerfönster har gått ut.
import { getDoc } from 'firebase/firestore';
import { useEffect, useRef } from 'react';
import { FAST_REVEAL_CAP_MS, FAST_UNDO_MS, isFast } from '../game/modes';
import { moveRef } from '../game/refs';
import type { GameDoc, MoveDoc, Team } from '../game/types';
import { reportError, RETRIES_BEFORE_REPORT } from '../sentry';

type Options = {
  code: string;
  game: GameDoc;
  move: MoveDoc | null;
  team: Team | undefined;
  busy: boolean;
  onReveal: (team: Team, move: MoveDoc) => void;
};

/**
 * Tiden räknas från när den här telefonen ser draget, plus lite marginal, så att klockor som går olika
 * inte spelar roll. Ett lag som ångrar och låser om och om igen kan inte skjuta upp avslöjandet längre
 * än FAST_REVEAL_CAP_MS från turens första drag. Är telefonen upptagen, eller går läsningen inte fram,
 * försöker den igen strax. Knappen Avslöja finns alltid kvar.
 */
export function useAutoReveal({ code, game, move, team, busy, onReveal }: Options) {
  const latest = useRef({ team, busy, onReveal });
  useEffect(() => {
    latest.current = { team, busy, onReveal };
  });
  // När telefonen såg turens första drag.
  const firstSeen = useRef<{ turn: number; at: number } | null>(null);

  const lockedAt = move?.createdAt?.toMillis() ?? null;
  const active = isFast(game) && game.phase === 'placing' && lockedAt !== null;
  const turn = game.turnIndex;

  useEffect(() => {
    if (!active) return;
    const now = Date.now();
    if (firstSeen.current?.turn !== turn) firstSeen.current = { turn, at: now };
    const delay = Math.max(0, Math.min(FAST_UNDO_MS + 800, firstSeen.current.at + FAST_REVEAL_CAP_MS - now));

    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const attempt = () => {
      getDoc(moveRef(code, turn))
        .then((snap) => {
          const { team: current, busy: working, onReveal: reveal } = latest.current;
          if (!snap.exists() || !current) return;
          if (working) timer = setTimeout(attempt, 1000);
          else reveal(current, snap.data() as MoveDoc);
        })
        .catch((err) => {
          // Ett enstaka nätfel rättar sig vid nästa försök. Tre i rad betyder att turen står still: rapportera en gång.
          if (++failures === RETRIES_BEFORE_REPORT) reportError(err, 'host.autoReveal');
          timer = setTimeout(attempt, 2000);
        });
    };
    timer = setTimeout(attempt, delay);
    return () => clearTimeout(timer);
  }, [active, lockedAt, code, turn]);
}
