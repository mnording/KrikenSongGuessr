// Authorization Code med PKCE, bara för spelledaren. Tokens sparas i localStorage
// och förnyas automatiskt innan de går ut, så att kvällen inte avbryts efter en timme.

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const SCOPES = ['streaming', 'user-read-email', 'user-read-private', 'user-modify-playback-state'];
const TOKEN_KEY = 'spotify.tokens';
const VERIFIER_KEY = 'spotify.pkce.verifier';
const STATE_KEY = 'spotify.pkce.state';
const RETURN_KEY = 'spotify.returnTo';

type Tokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

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

function saveTokens(response: TokenResponse, previousRefresh?: string) {
  const tokens: Tokens = {
    accessToken: response.access_token,
    // Spotify skickar inte alltid en ny refresh-token. Behåll då den gamla.
    refreshToken: response.refresh_token ?? previousRefresh ?? '',
    expiresAt: Date.now() + response.expires_in * 1000,
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

export async function login(returnTo: string = window.location.pathname) {
  if (!CLIENT_ID) throw new Error('VITE_SPOTIFY_CLIENT_ID saknas i .env.local');
  const verifier = randomString(64);
  const state = randomString(16);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  localStorage.setItem(RETURN_KEY, returnTo);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    scope: SCOPES.join(' '),
    state,
  });
  window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
}

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
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
  const response = await requestToken({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
  });
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  saveTokens(response);
  const returnTo = localStorage.getItem(RETURN_KEY) ?? '/host';
  localStorage.removeItem(RETURN_KEY);
  return returnTo;
}

let refreshing: Promise<string> | null = null;

async function refresh(tokens: Tokens): Promise<string> {
  refreshing ??= requestToken({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken })
    .then((response) => {
      saveTokens(response, tokens.refreshToken);
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
