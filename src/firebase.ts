import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Long polling klarar mobilnät och strikta brandväggar bättre än WebChannel.
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });

let userPromise: Promise<User> | null = null;

/**
 * Alla loggar in anonymt. Firebase sparar användaren i webbläsaren,
 * så samma telefon blir samma lag efter omladdning.
 */
export function ensureUser(): Promise<User> {
  userPromise ??= new Promise<User>((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    });
    signInAnonymously(auth).catch((err) => {
      unsubscribe();
      userPromise = null;
      reject(err);
    });
  });
  return userPromise;
}
