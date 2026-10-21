import { describe, expect, it } from 'vitest';
import { MASCOTS } from './mascots';
import { DECISION_IDS, DECISION_TAUNTS, REACTION_IDS, REACTIONS, reactionKind, SIGNATURE, TAUNT_IDS, TAUNTS, tauntMood, tauntText } from './taunts';

describe('pikarna', () => {
  it('har unika id:n, och varje maskot har en egen replik', () => {
    expect(new Set(TAUNT_IDS).size).toBe(TAUNT_IDS.length);
    for (const m of MASCOTS) expect(m.signature, m.id).toBeTruthy();
  });

  it('ger texten för en färdig pik och för maskotens replik', () => {
    expect(tauntText(TAUNTS[0].id, { mascot: 'kalle' })).toBe(TAUNTS[0].text);
    expect(tauntText(SIGNATURE, { mascot: 'ulla' })).toBe(MASCOTS.find((m) => m.id === 'ulla')!.signature);
  });

  it('ger rätt sorts reaktioner beroende på vem man är och hur det gick', () => {
    expect(reactionKind(false, true)).toBe('cheer');
    expect(reactionKind(false, false)).toBe('tease');
    expect(reactionKind(true, true)).toBe('thanks');
    expect(reactionKind(true, false)).toBe('comeback');
    for (const kind of ['cheer', 'tease', 'thanks', 'comeback'] as const) {
      expect(REACTIONS.filter((r) => r.kind === kind).length, kind).toBeGreaterThanOrEqual(2);
    }
  });

  it('gör maskoten glad när man gratulerar eller tackar, annars kaxig', () => {
    expect(tauntMood('grattis')).toBe('happy');
    expect(tauntMood('tack')).toBe('happy');
    expect(tauntMood('ojda')).toBe('cheeky');
    expect(tauntMood(TAUNTS[0].id)).toBe('cheeky');
  });

  it('har inga id:n som både är pik och reaktion', () => {
    expect(TAUNT_IDS.filter((id) => REACTION_IDS.includes(id))).toEqual([]);
    expect(new Set(REACTION_IDS).size).toBe(REACTION_IDS.length);
    expect(tauntText('grattis', { mascot: 'kalle' })).toBe('Grattis! 🎉');
  });

  it('har egna id:n för pikarna medan ett lag väljer att fortsätta eller låsa in', () => {
    const all = [...TAUNT_IDS, ...REACTION_IDS, ...DECISION_IDS];
    expect(new Set(all).size).toBe(all.length);
    expect(tauntText(DECISION_TAUNTS[0].id, { mascot: 'kalle' })).toBe(DECISION_TAUNTS[0].text);
    expect(tauntMood(DECISION_TAUNTS[0].id)).toBe('cheeky');
  });

  it('ger ingen text för okända pikar eller lag utan maskot', () => {
    expect(tauntText('elak', { mascot: 'kalle' })).toBeNull();
    expect(tauntText(SIGNATURE, {})).toBeNull();
  });
});
