// Web Playback SDK-spelaren lever på modulnivå, utanför React-trädet.
// Den skapas en gång, överlever HMR via import.meta.hot.data och påverkas inte av StrictMode.
import { reportError, spotifyError } from '../sentry';
import { getAccessToken, spotifyFetch } from './auth';

export type PlayerSnapshot = {
  status: 'idle' | 'loading' | 'ready' | 'offline' | 'error';
  deviceId: string | null;
  paused: boolean;
  trackUri: string | null;
  error: string | null;
  /** Webbläsaren blockerade uppspelning (vanligt på iOS). Visa en knapp. */
  needsGesture: boolean;
};

type Store = {
  player: Spotify.Player | null;
  snapshot: PlayerSnapshot;
  listeners: Set<() => void>;
  sdkPromise: Promise<void> | null;
  readyWaiters: Array<(deviceId: string) => void>;
};

const initial: PlayerSnapshot = {
  status: 'idle',
  deviceId: null,
  paused: true,
  trackUri: null,
  error: null,
  needsGesture: false,
};

const store: Store = (import.meta.hot?.data.playerStore as Store | undefined) ?? {
  player: null,
  snapshot: initial,
  listeners: new Set(),
  sdkPromise: null,
  readyWaiters: [],
};
if (import.meta.hot) import.meta.hot.data.playerStore = store;

function update(patch: Partial<PlayerSnapshot>) {
  store.snapshot = { ...store.snapshot, ...patch };
  for (const listener of store.listeners) listener();
}

export function subscribePlayer(listener: () => void): () => void {
  store.listeners.add(listener);
  return () => store.listeners.delete(listener);
}

export function getPlayerSnapshot(): PlayerSnapshot {
  return store.snapshot;
}

function loadSdk(): Promise<void> {
  store.sdkPromise ??= new Promise<void>((resolve) => {
    if (window.Spotify) return resolve();
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    if (!document.querySelector('script[data-spotify-sdk]')) {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.dataset.spotifySdk = 'true';
      document.body.appendChild(script);
    }
  });
  return store.sdkPromise;
}

/** Skapar spelaren första gången. Senare anrop gör ingenting. */
export async function initPlayer(): Promise<void> {
  if (store.player) return;
  update({ status: 'loading', error: null });
  await loadSdk();
  if (store.player) return;

  const player = new window.Spotify!.Player({
    name: 'Kriken Låtgissning',
    volume: 0.8,
    getOAuthToken: (callback) => {
      getAccessToken()
        .then(callback)
        .catch((err) => {
          reportError(err, 'spotify.token');
          update({ status: 'error', error: String(err) });
        });
    },
  });
  store.player = player;

  player.addListener('ready', ({ device_id }) => {
    update({ status: 'ready', deviceId: device_id, error: null });
    const waiters = store.readyWaiters.splice(0);
    for (const resolve of waiters) resolve(device_id);
  });
  player.addListener('not_ready', () => update({ status: 'offline' }));
  player.addListener('player_state_changed', (state) => {
    if (!state) return;
    update({ paused: state.paused, trackUri: state.track_window?.current_track?.uri ?? null });
  });
  player.addListener('autoplay_failed', () => update({ needsGesture: true }));
  // SDK:ns fel är bara text i ett event, inga kastade fel, så Sentry får dem härifrån.
  const onError = (event: string) => ({ message }: { message: string }) => {
    reportError(spotifyError(event, message), `spotify.${event}`);
    update({ status: 'error', error: message });
  };
  player.addListener('initialization_error', onError('initialization_error'));
  player.addListener('authentication_error', onError('authentication_error'));
  player.addListener('account_error', ({ message }) => {
    reportError(spotifyError('account_error', message), 'spotify.account_error');
    update({ status: 'error', error: `Spotify Premium krävs. ${message}` });
  });
  player.addListener('playback_error', ({ message }) => {
    reportError(spotifyError('playback_error', message), 'spotify.playback_error');
    update({ error: message });
  });

  const connected = await player.connect();
  if (!connected) {
    reportError(spotifyError('connect', 'Kunde inte ansluta till Spotify.'), 'spotify.connect');
    update({ status: 'error', error: 'Kunde inte ansluta till Spotify.' });
  }
}

/** Väntar tills SDK:n har gett ett device_id. */
export function waitForDevice(timeoutMs = 15_000): Promise<string> {
  if (store.snapshot.deviceId && store.snapshot.status === 'ready') {
    return Promise.resolve(store.snapshot.deviceId);
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Spotify-spelaren blev aldrig redo')), timeoutMs);
    store.readyWaiters.push((id) => {
      clearTimeout(timer);
      resolve(id);
    });
  });
}

/**
 * Måste anropas direkt i en tryckning (iOS). Låser upp ljudet i webbläsaren.
 */
export function activateFromGesture() {
  void store.player?.activateElement();
  update({ needsGesture: false });
}

async function playerCall(path: string, init: RequestInit) {
  const res = await spotifyFetch(path, init);
  if (!res.ok && res.status !== 204 && res.status !== 202) {
    let detail = '';
    try {
      detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? '';
    } catch {
      // tomt svar
    }
    throw new Error(`Spotify svarade ${res.status}${detail ? `: ${detail}` : ''}`);
  }
}

/** Spelar ett spår från början på den här telefonen. Väntar på svaret. */
export async function playTrack(uri: string): Promise<void> {
  const deviceId = await waitForDevice();
  const body = JSON.stringify({ uris: [uri], position_ms: 0 });
  try {
    await playerCall(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, { method: 'PUT', body });
  } catch (err) {
    // En ny enhet syns ibland inte direkt för Web API. Vänta och försök en gång till.
    if (!String(err).includes('404')) throw err;
    await new Promise((r) => setTimeout(r, 1500));
    await playerCall(`/me/player/play?device_id=${encodeURIComponent(deviceId)}`, { method: 'PUT', body });
  }
  update({ error: null });
}

export async function pause(): Promise<void> {
  await store.player?.pause();
}

export async function resume(): Promise<void> {
  await store.player?.resume();
}

/** Bara när spelet avslutas. */
export function disconnectPlayer() {
  store.player?.disconnect();
  store.player = null;
  update({ ...initial });
}
