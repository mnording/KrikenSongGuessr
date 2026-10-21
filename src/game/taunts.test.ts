import { describe, expect, it } from 'vitest';
import { MASCOTS } from './mascots';
import { SIGNATURE, TAUNT_IDS, TAUNTS, tauntText } from './taunts';

describe('pikarna', () => {
  it('har unika id:n, och varje maskot har en egen replik', () => {
    expect(new Set(TAUNT_IDS).size).toBe(TAUNT_IDS.length);
    for (const m of MASCOTS) expect(m.signature, m.id).toBeTruthy();
  });

  it('ger texten för en färdig pik och för maskotens replik', () => {
    expect(tauntText(TAUNTS[0].id, { mascot: 'kalle' })).toBe(TAUNTS[0].text);
    expect(tauntText(SIGNATURE, { mascot: 'ulla' })).toBe(MASCOTS.find((m) => m.id === 'ulla')!.signature);
  });

  it('ger ingen text för okända pikar eller lag utan maskot', () => {
    expect(tauntText('elak', { mascot: 'kalle' })).toBeNull();
    expect(tauntText(SIGNATURE, {})).toBeNull();
  });
});
