import { describe, expect, it } from 'vitest';
import { stripUrl } from './sentry';

describe('adresser till Sentry', () => {
  it('skickar bara sökvägen, aldrig Spotifys inloggningskod eller annat i query och hash', () => {
    expect(stripUrl('https://krikensongguessr.web.app/callback?code=hemlig&state=x')).toBe('https://krikensongguessr.web.app/callback');
    expect(stripUrl('/play/424242#token=abc')).toBe('/play/424242');
    expect(stripUrl('/join/424242')).toBe('/join/424242');
  });
});
