import { describe, expect, it } from 'vitest';
import type { TimelineCard } from './game';
import { atRisk, bankedCount, canContinue, decisionFor, dropStreak, extendStreak, splitScore } from './streak';

const card = (cardId: string, year: number): TimelineCard => ({ cardId, title: cardId, artist: 'x', year });
const timeline = [card('a', 1970), card('b', 1980), card('c', 1990), card('d', 2000)];

describe('svit', () => {
  it('räknar bara ett lags egna osäkrade kort', () => {
    const streak = { teamUid: 'lag1', cardIds: ['b', 'd'] };
    expect(atRisk(streak, 'lag1')).toEqual(['b', 'd']);
    expect(atRisk(streak, 'lag2')).toEqual([]);
    expect(atRisk(null, 'lag1')).toEqual([]);
    expect(bankedCount(timeline, streak, 'lag1')).toBe(2);
    expect(bankedCount(timeline, streak, 'lag2')).toBe(4);
  });

  it('bygger på lagets svit och börjar om för ett nytt lag', () => {
    const first = extendStreak(null, 'lag1', 'b');
    const second = extendStreak(first, 'lag1', 'd');
    expect(second).toEqual({ teamUid: 'lag1', cardIds: ['b', 'd'] });
    expect(extendStreak(second, 'lag2', 'x')).toEqual({ teamUid: 'lag2', cardIds: ['x'] });
  });

  it('tappar hela sviten vid fel svar men behåller det inlåsta', () => {
    const result = dropStreak(timeline, { teamUid: 'lag1', cardIds: ['b', 'd'] }, 'lag1');
    expect(result.timeline.map((c) => c.cardId)).toEqual(['a', 'c']);
    expect(result.lost.map((c) => c.cardId)).toEqual(['b', 'd']);
    expect(dropStreak(timeline, null, 'lag1').lost).toEqual([]);
  });

  it('låter laget fortsätta bara efter rätt svar, utan vinst och med kort kvar', () => {
    expect(canContinue({ correct: true, reachedTarget: false }, 5)).toBe(true);
    expect(canContinue({ correct: false, reachedTarget: false }, 5)).toBe(false);
    expect(canContinue({ correct: true, reachedTarget: true }, 5)).toBe(false);
    expect(canContinue({ correct: true, reachedTarget: false }, 0)).toBe(false);
  });
});

describe('räknare och beslut', () => {
  it('delar kort i inlåsta och ej inlåsta', () => {
    expect(splitScore(timeline, { teamUid: 'lag1', cardIds: ['d'] }, 'lag1')).toEqual({ banked: 3, risk: 1 });
    expect(splitScore(timeline, null, 'lag1')).toEqual({ banked: 4, risk: 0 });
  });

  it('gör Fortsätt till Lås in när laget inte får fortsätta', () => {
    const right = { correct: true, reachedTarget: false };
    expect(decisionFor('continue', right, 3)).toBe('continue');
    expect(decisionFor('continue', right, 0)).toBe('lock');
    expect(decisionFor('lock', right, 3)).toBe('lock');
  });
});
