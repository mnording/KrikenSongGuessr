import { afterEach, describe, expect, it, vi } from 'vitest';
import { stripUrl } from './sentry';

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn(), reactErrorHandler: vi.fn() }));
vi.mock('@sentry/react', () => sentry);

describe('adresser till Sentry', () => {
  it('skickar bara sökvägen, aldrig Spotifys inloggningskod eller annat i query och hash', () => {
    expect(stripUrl('https://krikensongguessr.web.app/callback?code=hemlig&state=x')).toBe('https://krikensongguessr.web.app/callback');
    expect(stripUrl('/play/424242#token=abc')).toBe('/play/424242');
    expect(stripUrl('/join/424242')).toBe('/join/424242');
  });
});

describe('fel som appen själv fångar', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    sentry.captureException.mockClear();
  });

  it('skickar Spotifys playback_error till Sentry, med namn och tagg', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@example.ingest.sentry.io/1');
    const { reportError, spotifyError } = await import('./sentry');
    reportError(spotifyError('playback_error', 'Cannot perform operation; no list was loaded.'), 'spotify.playback_error');
    const [error, hint] = sentry.captureException.mock.calls[0];
    expect(error).toMatchObject({ name: 'Spotify playback_error', message: 'Cannot perform operation; no list was loaded.' });
    expect(hint).toEqual({ tags: { area: 'spotify.playback_error' } });
  });

  it('gör om text till ett fel, så att Sentry får ett stackspår', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://key@example.ingest.sentry.io/1');
    const { reportError } = await import('./sentry');
    reportError('Spotify svarade 502', 'spotify.play');
    expect(sentry.captureException.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('skickar ingenting utan DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    const { reportError } = await import('./sentry');
    reportError(new Error('x'), 'spotify.play');
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.init).not.toHaveBeenCalled();
  });
});
