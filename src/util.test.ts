import { describe, expect, it } from 'vitest';
import { MASCOTS } from './game/mascots';
import { genitive, isDenied, textOn } from './util';

describe('genitive', () => {
  it('lägger till s bara när namnet inte redan slutar på s, x eller z', () => {
    expect(genitive('Lag A')).toBe('Lag As');
    expect(genitive('Lars')).toBe('Lars');
    expect(genitive('Max')).toBe('Max');
    expect(genitive('Fritz')).toBe('Fritz');
  });
});

describe('textOn', () => {
  const contrast = (a: string, b: string) => {
    const lum = (hex: string) => {
      const [r, g, b2] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
    };
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it('väljer den starkaste texten, och den klarar stor text (3:1) på alla lagfärger', () => {
    for (const { color: value } of MASCOTS) {
      const chosen = textOn(value) === '#fff' ? '#ffffff' : textOn(value);
      const other = chosen === '#ffffff' ? '#0f172a' : '#ffffff';
      expect(contrast(value, chosen), value).toBeGreaterThanOrEqual(contrast(value, other));
      expect(contrast(value, chosen), value).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('isDenied', () => {
  it('känner igen Firestores nekande och inget annat', () => {
    expect(isDenied({ code: 'permission-denied' })).toBe(true);
    expect(isDenied({ code: 'unavailable' })).toBe(false);
    expect(isDenied(new Error('permission-denied'))).toBe(false);
    expect(isDenied(null)).toBe(false);
    expect(isDenied(undefined)).toBe(false);
  });
});
