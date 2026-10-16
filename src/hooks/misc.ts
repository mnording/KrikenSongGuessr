import type { User } from 'firebase/auth';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ensureUser } from '../firebase';
import { heartbeat } from '../game/teamActions';
import { HEARTBEAT_MS } from '../game/types';
import { isLoggedIn, subscribeAuth } from '../spotify/auth';
import { getPlayerSnapshot, subscribePlayer } from '../spotify/player';

export function useUser(): { user: User | null; error: string | null } {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    ensureUser()
      .then(setUser)
      .catch((err) => setError(`Kunde inte logga in: ${String(err)}`));
  }, []);
  return { user, error };
}

/** Tickar så att "offline" uppdateras utan nya snapshots. */
export function useNow(intervalMs = 5000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Laget skriver lastSeen var 10:e sekund och markerar sig offline när sidan göms. */
export function usePresence(code: string | undefined, uid: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!code || !uid || !enabled) return;
    const beat = (connected = true) => heartbeat(code, uid, connected).catch(() => {});
    beat();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') beat();
    }, HEARTBEAT_MS);
    const onVisibility = () => beat(document.visibilityState === 'visible');
    const onHide = () => beat(false);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
    };
  }, [code, uid, enabled]);
}

/** Håller skärmen tänd medan spelledarvyn är öppen. */
export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
      } catch {
        // Nekas till exempel i strömsparläge. Inget att göra.
      }
    };
    void acquire();
    const onVisibility = () => void acquire();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      void lock?.release();
    };
  }, [enabled]);
}

export function useSpotifyLoggedIn(): boolean {
  return useSyncExternalStore(subscribeAuth, isLoggedIn);
}

export function usePlayer() {
  return useSyncExternalStore(subscribePlayer, getPlayerSnapshot);
}
