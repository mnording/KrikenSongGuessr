import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkAccess, forgetOwnClientId, isLoggedIn, ownClientId, parseClientId, pendingOwnClientId } from './auth';

const ID = '0123456789abcdef0123456789abcdef';
const OTHER = 'fedcba9876543210fedcba9876543210';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
  vi.stubGlobal('sessionStorage', memoryStorage());
});

function logIn(clientId?: string) {
  localStorage.setItem(
    'spotify.tokens',
    JSON.stringify({ accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 3_600_000, clientId }),
  );
}

function spotifyAnswers(status: number) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status })));
}

describe('parseClientId', () => {
  it('godtar 32 tecken hex och tar bort mellanslag och versaler', () => {
    expect(parseClientId(ID)).toBe(ID);
    expect(parseClientId(`  ${ID.toUpperCase()}\n`)).toBe(ID);
  });

  it('nekar annat, till exempel rubriken eller ett för kort ID', () => {
    expect(parseClientId('')).toBeNull();
    expect(parseClientId(ID.slice(1))).toBeNull();
    expect(parseClientId(`${ID}0`)).toBeNull();
    expect(parseClientId('Client ID')).toBeNull();
    expect(parseClientId(ID.replace('a', 'g'))).toBeNull();
  });
});

describe('checkAccess', () => {
  it('sparar en egen app först när Spotify släpper in kontot', async () => {
    logIn(ID);
    spotifyAnswers(200);
    expect(await checkAccess()).toBe('ok');
    expect(ownClientId()).toBe(ID);
  });

  it('loggar ut och behåller den app som fungerade när Spotify svarar 403', async () => {
    localStorage.setItem('spotify.clientId', OTHER);
    logIn(ID);
    spotifyAnswers(403);
    expect(await checkAccess()).toBe('denied-own');
    expect(isLoggedIn()).toBe(false);
    expect(ownClientId()).toBe(OTHER);
  });

  it('återställer inloggningen som fanns före ett nekat försök', async () => {
    logIn();
    sessionStorage.setItem('spotify.previousTokens', localStorage.getItem('spotify.tokens')!);
    logIn(ID);
    spotifyAnswers(403);
    expect(await checkAccess()).toBe('denied-own');
    expect(isLoggedIn()).toBe(true);
    expect(JSON.parse(localStorage.getItem('spotify.tokens')!).clientId).toBeUndefined();
  });

  it('skiljer på nekad i Kriken-appen och i en egen app', async () => {
    logIn();
    spotifyAnswers(403);
    expect(await checkAccess()).toBe('denied');
  });

  it('släpper igenom andra fel, de syns när musiken ska spela', async () => {
    logIn(ID);
    spotifyAnswers(500);
    expect(await checkAccess()).toBe('ok');
  });
});

describe('forgetOwnClientId', () => {
  it('loggar ut när inloggningen hörde till den egna appen', () => {
    localStorage.setItem('spotify.clientId', ID);
    logIn(ID);
    forgetOwnClientId();
    expect(ownClientId()).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  it('behåller en inloggning från en annan app', () => {
    localStorage.setItem('spotify.clientId', ID);
    logIn(OTHER);
    forgetOwnClientId();
    expect(isLoggedIn()).toBe(true);
  });
});

describe('pendingOwnClientId', () => {
  it('visar ett påbörjat försök med en egen app', () => {
    expect(pendingOwnClientId()).toBeNull();
    sessionStorage.setItem('spotify.pkce.clientId', ID);
    expect(pendingOwnClientId()).toBe(ID);
  });
});
