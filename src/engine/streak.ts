// Fortsätt eller lås: efter ett rätt svar får laget fortsätta med ett nytt kort. Korten i sviten
// ligger osäkrade i tidslinjen tills laget låser in, och försvinner alla om laget svarar fel.
import type { TimelineCard } from './game';

/** Lagets pågående svit. Korten ligger redan i lagets tidslinje. */
export type Streak = { teamUid: string; cardIds: string[] };

/** De osäkrade korten för ett lag, tom om laget inte har någon svit. */
export function atRisk(streak: Streak | null | undefined, teamUid: string): string[] {
  return streak?.teamUid === teamUid ? streak.cardIds : [];
}

/** Kort som laget har låst in eller fått utan svit. */
export function bankedCount(timeline: readonly TimelineCard[], streak: Streak | null | undefined, teamUid: string): number {
  const risky = new Set(atRisk(streak, teamUid));
  return timeline.filter((card) => !risky.has(card.cardId)).length;
}

/** Rätt svar: kortet läggs till i lagets svit (en ny svit om det var ett annat lags). */
export function extendStreak(streak: Streak | null | undefined, teamUid: string, cardId: string): Streak {
  return { teamUid, cardIds: [...atRisk(streak, teamUid), cardId] };
}

/** Fel svar: sviten försvinner ur tidslinjen. Returnerar den nya tidslinjen och korten som försvann. */
export function dropStreak(
  timeline: readonly TimelineCard[],
  streak: Streak | null | undefined,
  teamUid: string,
): { timeline: TimelineCard[]; lost: TimelineCard[] } {
  const risky = new Set(atRisk(streak, teamUid));
  return {
    timeline: timeline.filter((card) => !risky.has(card.cardId)),
    lost: timeline.filter((card) => risky.has(card.cardId)),
  };
}

/**
 * Laget får välja att fortsätta efter ett rätt svar, så länge det inte redan har vunnit
 * och det finns kort kvar att dra.
 */
export function canContinue(result: { correct: boolean; reachedTarget: boolean }, cardsLeft: number): boolean {
  return result.correct && !result.reachedTarget && cardsLeft > 0;
}

/** Lagets kort delade i inlåsta och ej inlåsta, för räknarna "4 + 2". */
export function splitScore(
  timeline: readonly TimelineCard[],
  streak: Streak | null | undefined,
  teamUid: string,
): { banked: number; risk: number } {
  const banked = bankedCount(timeline, streak, teamUid);
  return { banked, risk: timeline.length - banked };
}

/**
 * Vad spelledarens telefon gör med lagets val. Fortsätt går bara när laget får fortsätta, annars låser
 * det in. Reglerna kollar inte kortleken, så ett Fortsätt när leken är slut blir ett Lås in här.
 */
export function decisionFor(
  action: 'continue' | 'lock',
  result: { correct: boolean; reachedTarget: boolean },
  cardsLeft: number,
): 'continue' | 'lock' {
  return action === 'continue' && canContinue(result, cardsLeft) ? 'continue' : 'lock';
}
