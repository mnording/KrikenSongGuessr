// Det ett lag får skriva: sin egen lagprofil och sina drag.
import { deleteDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getMascot, type MascotId } from './mascots';
import { moveRef, teamRef } from './refs';
import type { TeamLevel } from './types';

// Laget väljer maskot, färgen följer med den. Nivån gäller bara i Familj-läget.
const profile = (name: string, mascot: MascotId, level: TeamLevel) => ({
  name: name.trim().slice(0, 24),
  mascot,
  color: getMascot(mascot)!.color,
  level,
});

export async function joinGame(code: string, uid: string, name: string, mascot: MascotId, level: TeamLevel = 'hard') {
  await setDoc(teamRef(code, uid), {
    ...profile(name, mascot, level),
    connected: true,
    lastSeen: serverTimestamp(),
    joinedAt: serverTimestamp(),
    pendingSlot: null,
  });
}

export async function updateProfile(code: string, uid: string, name: string, mascot: MascotId, level: TeamLevel) {
  await updateDoc(teamRef(code, uid), profile(name, mascot, level));
}

export async function leaveGame(code: string, uid: string) {
  await deleteDoc(teamRef(code, uid));
}

export async function heartbeat(code: string, uid: string, connected = true) {
  await updateDoc(teamRef(code, uid), { connected, lastSeen: serverTimestamp() });
}

export async function selectSlot(code: string, uid: string, slotIndex: number | null) {
  await updateDoc(teamRef(code, uid), { pendingSlot: slotIndex });
}

export async function lockMove(code: string, uid: string, turnIndex: number, slotIndex: number) {
  await setDoc(moveRef(code, turnIndex), {
    teamUid: uid,
    turnIndex,
    slotIndex,
    createdAt: serverTimestamp(),
  });
}

/** Familj, lätt lag: lagets val av artist är dess drag för turen. */
export async function lockChoice(code: string, uid: string, turnIndex: number, choice: number) {
  await setDoc(moveRef(code, turnIndex), {
    teamUid: uid,
    turnIndex,
    choice,
    createdAt: serverTimestamp(),
  });
}

/** Familj: de andra lagen gissar med. Går att ändra fram till avslöjandet och ger inga kort. */
export async function guessArtist(code: string, uid: string, turnIndex: number, choice: number) {
  await updateDoc(teamRef(code, uid), { guess: { turnIndex, choice } });
}
