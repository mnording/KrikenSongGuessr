import { describe, expect, it } from 'vitest';
import { MASCOT_IDS } from '../game/mascots';
import { resultBand } from '../game/resultBand';
import { SIGNATURE, tauntText } from '../game/taunts';
import { slotLabel } from '../util';
import { isLang, LANGS, MESSAGES } from './context';

/** Alla textnycklar i ett översättningsobjekt, så att inget språk saknar eller har en extra. */
function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('översättningarna', () => {
  it('har samma nycklar på alla språk', () => {
    const sv = keys(MESSAGES.sv).sort();
    for (const lang of LANGS) expect(keys(MESSAGES[lang]).sort(), lang).toEqual(sv);
  });

  it('har inga tomma texter, och alla nivåer finns på alla språk', () => {
    for (const lang of LANGS) {
      const m = MESSAGES[lang];
      for (const id of MASCOT_IDS) {
        expect(m.mascots[id].name, `${lang} ${id}`).toBeTruthy();
        expect(m.mascots[id].backstory, `${lang} ${id}`).toBeTruthy();
        expect(m.taunts.signatures[id], `${lang} ${id}`).toBeTruthy();
      }
      for (const text of Object.values(m.taunts.taunts)) expect(text, lang).toBeTruthy();
      expect(m.levels.map((l) => l.value), lang).toEqual(['easy', 'hard']);
    }
  });

  it('visar pikar på mottagarens språk utifrån det sparade id:t', () => {
    expect(tauntText('grattis', { mascot: 'kalle' }, MESSAGES.en.taunts)).toBe('Congrats! 🎉');
    expect(tauntText(SIGNATURE, { mascot: 'ulla' }, MESSAGES.es.taunts)).toBe('Uh uh… yo lo sé. Ustedes no. 🦉');
    expect(tauntText('elak', { mascot: 'kalle' }, MESSAGES.en.taunts)).toBeNull();
  });

  it('böjer armbandet och luckorna efter antal', () => {
    const base = { correct: false, choosing: false, choice: null, mine: false, teamName: 'Disco', risk: 0, total: 3, lost: 1 } as const;
    expect(resultBand(base, MESSAGES.en.band).sub).toBe('Disco missed and lost 1 card');
    expect(resultBand({ ...base, lost: 2, mine: true }, MESSAGES.es.band).sub).toBe('Fallaron y perdieron 2 cartas');
    expect(resultBand({ ...base, correct: true }, MESSAGES.es.band)).toMatchObject({ big: '¡Correcto!', long: true });
    const cards = [{ year: 1977 }, { year: 1984 }] as Parameters<typeof slotLabel>[0];
    expect(slotLabel(cards, 1, MESSAGES.en.slots)).toBe('Between 1977 and 1984');
    expect(slotLabel(cards, 0, MESSAGES.es.slots)).toBe('Antes de 1977');
  });

  it('känner bara igen språken som finns', () => {
    expect(isLang('en')).toBe(true);
    expect(isLang('de')).toBe(false);
    expect(isLang('toString')).toBe(false);
    expect(isLang(null)).toBe(false);
  });
});
