import { describe, expect, it } from 'vitest';
import { resultBand } from './resultBand';

const base = { correct: true, choosing: false, choice: null, mine: true, teamName: 'Disco', risk: 0, total: 3, lost: 0 } as const;

describe('armbandet efter avslöjandet', () => {
  it('säger Rätt eller Fel, och hur många kort som tappades', () => {
    expect(resultBand(base)).toMatchObject({ big: 'Rätt!', sub: 'Ni fick kortet', mood: 'happy' });
    expect(resultBand({ ...base, correct: false, mine: false, lost: 2 })).toMatchObject({
      big: 'Fel!',
      sub: 'Disco missade och tappade 2 kort',
      mood: 'sad',
    });
  });

  it('ställer frågan till laget som väljer och visar insatsen för alla', () => {
    const choosing = { ...base, choosing: true, risk: 2 };
    expect(resultBand(choosing)).toMatchObject({ big: 'Fortsätt eller lås?', sub: '2 kort står på spel', long: true });
    expect(resultBand({ ...choosing, mine: false })).toMatchObject({ big: 'Disco väljer…', sub: '2 kort står på spel' });
  });

  it('visar valet under ångerfönstret', () => {
    const choosing = { ...base, choosing: true, risk: 2, total: 4 };
    expect(resultBand({ ...choosing, choice: 'continue' }).big).toBe('Ni fortsätter!');
    expect(resultBand({ ...choosing, choice: 'lock' })).toMatchObject({ big: 'Inlåst!', sub: '4 kort är era', long: false });
    expect(resultBand({ ...choosing, choice: 'lock', mine: false })).toMatchObject({ big: 'Disco låser in!', sub: '4 kort är deras' });
  });
});
