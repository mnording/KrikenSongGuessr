// Fortsätt eller lås på spelledarens telefon: agera själv när laget i tur har valt och ångerfönstret gått ut.
import { getDoc } from 'firebase/firestore';
import { useEffect, useRef } from 'react';
import { decisionFor } from '../engine/streak';
import { isStreak, STREAK_UNDO_MS } from '../game/modes';
import { teamRef } from '../game/refs';
import type { GameDoc, StreakAction, Team, TeamDoc } from '../game/types';
import { reportError, RETRIES_BEFORE_REPORT } from '../sentry';

type Options = {
  code: string;
  game: GameDoc;
  team: Team | undefined;
  busy: boolean;
  onDecide: (action: StreakAction) => void;
};

/**
 * Laget väljer på sin telefon och har STREAK_UNDO_MS på sig att ångra, en gång. Tiden räknas från när
 * den här telefonen ser valet, plus lite marginal, så att klockor som går olika inte spelar roll. Sedan
 * läser telefonen valet igen och drar nästa kort (fortsätt) eller går till nästa lag (lås in).
 * Ett ångrat val väntar på lagets nya. nextTurn läser turen igen, så ett dubbelt steg går inte igenom.
 */
export function useStreakDecision({ code, game, team, busy, onDecide }: Options) {
  const latest = useRef({ busy, onDecide, game });
  useEffect(() => {
    latest.current = { busy, onDecide, game };
  });

  const choice = team?.streakChoice;
  const turn = game.turnIndex;
  const at = choice?.at?.toMillis() ?? null;
  // Ett nyss skrivet val har ingen tid lokalt förrän servern svarat. Då väntar vi på den.
  const action =
    isStreak(game) &&
    game.status === 'playing' &&
    game.phase === 'revealed' &&
    choice?.turnIndex === turn &&
    choice.action !== 'undone' &&
    at !== null
      ? choice.action
      : null;
  const uid = team?.uid;

  useEffect(() => {
    if (!action || !uid) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const attempt = () => {
      getDoc(teamRef(code, uid))
        .then((snap) => {
          if (cancelled) return;
          const current = (snap.data() as TeamDoc | undefined)?.streakChoice;
          // Ångrat eller bytt: ett nytt val startar en ny väntan via effekten.
          if (!current || current.turnIndex !== turn || current.action !== action || current.at?.toMillis() !== at) return;
          const { busy: working, onDecide: decide, game: now } = latest.current;
          if (working) timer = setTimeout(attempt, 1000);
          else if (now.lastResult) decide(decisionFor(action, now.lastResult, now.cardsLeft));
        })
        .catch((err) => {
          // Ett enstaka nätfel rättar sig vid nästa försök. Tre i rad betyder att turen står still: rapportera en gång.
          if (++failures === RETRIES_BEFORE_REPORT) reportError(err, 'host.streakDecision');
          if (!cancelled) timer = setTimeout(attempt, 2000);
        });
    };
    timer = setTimeout(attempt, STREAK_UNDO_MS + 800);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [action, at, code, uid, turn]);
}
