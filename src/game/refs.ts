import { collection, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const gameRef = (code: string) => doc(db, 'games', code);
export const teamsRef = (code: string) => collection(db, 'games', code, 'teams');
export const teamRef = (code: string, uid: string) => doc(db, 'games', code, 'teams', uid);
export const movesRef = (code: string) => collection(db, 'games', code, 'moves');
export const moveRef = (code: string, turnIndex: number) => doc(db, 'games', code, 'moves', String(turnIndex));
export const privateRef = (code: string) => doc(db, 'games', code, 'private', 'state');
