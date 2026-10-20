import { describe, expect, it } from 'vitest';
import { getMascot, MASCOT_IDS, MASCOTS } from './mascots';

describe('maskotarna', () => {
  it('är tio, en per lag, med egna id:n, namn och färger', () => {
    expect(MASCOTS).toHaveLength(10);
    expect(MASCOTS.map((m) => m.id)).toEqual([...MASCOT_IDS]);
    for (const key of ['id', 'name', 'color'] as const) {
      expect(new Set(MASCOTS.map((m) => m[key])).size, key).toBe(MASCOTS.length);
    }
  });

  it('hittar inte okända maskotar', () => {
    expect(getMascot('ulla')?.name).toBe('Ugglan Ulla');
    expect(getMascot('okänd')).toBeUndefined();
    expect(getMascot(undefined)).toBeUndefined();
  });
});
