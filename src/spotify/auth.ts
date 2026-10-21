// Authorization Code med PKCE, bara för spelledaren. Tokens sparas i localStorage
// och förnyas automatiskt innan de går ut, så att kvällen inte avbryts efter en timme.

import { readLocal } from '../storage';

const KRIKEN_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const SCOPES = ['streaming', 'user-read-email', 'user-read-private', 'user-modify-playback-state'];
const TOKEN_KEY = 'spotify.tokens';
const VERIFIER_KEY = 'spotify.pkce.verifier';
const STATE_KEY = 'spotify.pkce.state';
const ATTEMPT_KEY = 'spotify.pkce.clientId';
const RETURN_KEY = 'spotify.returnTo';
// Inloggningen som fanns före ett nytt försök, så att ett nekat försök inte loggar ut en spelledare som redan spelar.
const PREVIOUS_KEY = 'spotify.previousTokens';
// Kriken-appen rymmer bara fem Spotify-konton (Development Mode). Andra spelledare kan
// använda en egen Spotify-app. Bara dess Client ID sparas, PKCE behöver ingen hemlighet.
const OWN_CLIENT_ID_KEY = 'spotify.clientId';

type Tokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  /** Appen som gav ut tokens. Saknas i tokens från före egna appar, som alla kom från Kriken-appen. */
  clientId?: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

/** Ett Client ID från Spotifys dashboard är 32 tecken hex. Mellanslag runt om tas bort. */
export function parseClientId(raw: string): string | null {
  const id = raw.trim().toLowerCase();
  return /^[0-9a-f]{32}$/.test(id) ? id : null;
}

/** Spelledarens egen Spotify-app, sparad först när en inloggning med den har fungerat. */
export function ownClientId(): string | null {
  return parseClientId(readLocal(OWN_CLIENT_ID_KEY) ?? '');
}

function savedClientId(): string {
  return ownClientId() ?? KRIKEN_CLIENT_ID;
}

/** Tillbaka till Kriken-appen. Loggar ut om inloggningen hörde till den egna appen. */
export function forgetOwnClientId() {
  const own = ownClientId();
  if (!own) return;
  localStorage.removeItem(OWN_CLIENT_ID_KEY);
  if ((readTokens()?.clientId ?? KRIKEN_CLIENT_ID) === own) logout();
  else notify();
}

/** Ett påbörjat försök att logga in med en egen app, som inte har kommit tillbaka till /callback. */
export function pendingOwnClientId(): string | null {
  try {
    const id = sessionStorage.getItem(ATTEMPT_KEY);
    return id && id !== KRIKEN_CLIENT_ID?.toLowerCase() ? id : null;
  } catch {
    return null;
  }
}

export function redirectUri(): string {
  return `${window.location.origin}/callback`;
}

function readTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

function saveTokens(response: TokenResponse, clientId: string, previousRefresh?: string) {
  const tokens: Tokens = {
    accessToken: response.access_token,
    // Spotify skickar inte alltid en ny refresh-token. Behåll då den gamla.
    refreshToken: response.refresh_token ?? previousRefresh ?? '',
    expiresAt: Date.now() + response.expires_in * 1000,
    clientId,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  notify();
}

export function isLoggedIn(): boolean {
  return readTokens() !== null;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  notify();
}

const listeners = new Set<() => void>();
function notify() {
  for (const listener of listeners) listener();
}
export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Skickar spelledaren till Spotify. Med `withClientId` provas en egen app utan att den sparas:
 * den sparas först när inloggningen har kommit tillbaka och fungerar (se `checkAccess`).
 */
export async function login(returnTo: string = window.location.pathname, withClientId?: string) {
  const clientId = withClientId ?? savedClientId();
  if (!clientId) throw new Error('VITE_SPOTIFY_CLIENT_ID saknas i .env.local');
  const verifier = randomString(64);
  const state = randomString(16);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(ATTEMPT_KEY, clientId);
  localStorage.setItem(RETURN_KEY, returnTo);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    scope: SCOPES.join(' '),
    state,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

async function requestToken(clientId: string, body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, ...body }),
  });
  if (!res.ok) throw new Error(`Spotify-inloggningen misslyckades (${res.status})`);
  return (await res.json()) as TokenResponse;
}

/** Körs på /callback. Returnerar sökvägen spelledaren ska tillbaka till. */
export async function handleCallback(search: string): Promise<string> {
  const params = new URLSearchParams(search);
  const error = params.get('error');
  if (error) throw new Error(`Spotify nekade inloggningen: ${error}`);
  const code = params.get('code');
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!code || !verifier) throw new Error('Inloggningen saknar kod. Försök igen.');
  if (params.get('state') !== sessionStorage.getItem(STATE_KEY)) {
    throw new Error('Inloggningen stämmer inte (state). Försök igen.');
  }
  const clientId = sessionStorage.getItem(ATTEMPT_KEY) ?? savedClientId();
  const response = await requestToken(clientId, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(ATTEMPT_KEY);
  const previous = localStorage.getItem(TOKEN_KEY);
  if (previous) sessionStorage.setItem(PREVIOUS_KEY, previous);
  else sessionStorage.removeItem(PREVIOUS_KEY);
  saveTokens(response, clientId);
  const returnTo = localStorage.getItem(RETURN_KEY) ?? '/host';
  localStorage.removeItem(RETURN_KEY);
  return returnTo;
}

let refreshing: Promise<string> | null = null;

async function refresh(tokens: Tokens): Promise<string> {
  const clientId = tokens.clientId ?? KRIKEN_CLIENT_ID;
  refreshing ??= requestToken(clientId, { grant_type: 'refresh_token', refresh_token: tokens.refreshToken })
    .then((response) => {
      saveTokens(response, clientId, tokens.refreshToken);
      return response.access_token;
    })
    .catch((err) => {
      // En ogiltig refresh-token betyder att spelledaren måste logga in igen.
      if (String(err).includes('(400)')) logout();
      throw err;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** En giltig access-token, förnyad om den går ut inom en minut. */
export async function getAccessToken(): Promise<string> {
  const tokens = readTokens();
  if (!tokens) throw new Error('Inte inloggad på Spotify');
  if (Date.now() < tokens.expiresAt - 60_000) return tokens.accessToken;
  return refresh(tokens);
}

/** Anrop mot Web API med automatisk förnyelse och ett nytt försök vid 401. */
export async function spotifyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = async (token: string) =>
    fetch(`https://api.spotify.com/v1${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  let res = await send(await getAccessToken());
  if (res.status === 401) {
    const tokens = readTokens();
    if (tokens) res = await send(await refresh(tokens));
  }
  return res;
}

export type Access = 'ok' | 'denied' | 'denied-own';

/**
 * Körs direkt efter inloggningen. Spotify släpper in alla, men en app i Development Mode
 * svarar 403 på allt för konton som inte är tillagda i appen. Då loggar vi ut och visar guiden.
 * Fungerar en egen app sparas den här, så att ett felinklistrat ID aldrig ersätter ett som fungerar.
 * Andra fel stoppar inte spelledaren, de syns när musiken ska spela.
 */
export async function checkAccess(): Promise<Access> {
  const clientId = readTokens()?.clientId ?? KRIKEN_CLIENT_ID;
  const own = clientId !== KRIKEN_CLIENT_ID ? clientId : null;
  const previous = sessionStorage.getItem(PREVIOUS_KEY);
  sessionStorage.removeItem(PREVIOUS_KEY);
  const res = await spotifyFetch('/me').catch(() => null);
  if (res?.status === 403) {
    if (previous) {
      localStorage.setItem(TOKEN_KEY, previous);
      notify();
    } else logout();
    return own ? 'denied-own' : 'denied';
  }
  if (own) localStorage.setItem(OWN_CLIENT_ID_KEY, own);
  return 'ok';
}

/** Guiden läser varför Spotify nekade: `kriken` (kontot är inte tillagt) eller `egen` (fel konto för appen). */
export const DENIED_PARAM = 'nekad';

/** Hela vägen tillbaka från Spotify. Returnerar sökvägen spelledaren ska till. */
export async function completeLogin(search: string): Promise<string> {
  const returnTo = await handleCallback(search);
  const access = await checkAccess();
  if (access === 'ok') return returnTo;
  return `/host/guide?${DENIED_PARAM}=${access === 'denied-own' ? 'egen' : 'kriken'}`;
}
