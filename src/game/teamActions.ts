// Det ett lag får skriva: sin egen lagprofil och sina drag.
import { deleteDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getMascot, type MascotId } from './mascots';
import { moveRef, teamRef } from './refs';
import type { StreakAction, TeamLevel } from './types';

// Laget väljer maskot, färgen följer med den.
const profile = (name: string, mascot: MascotId) => ({
  name: name.trim().slice(0, 24),
  mascot,
  color: getMascot(mascot)!.color,
});

export async function joinGame(code: string, uid: string, name: string, mascot: MascotId, level: TeamLevel = 'hard') {
  await setDoc(teamRef(code, uid), {
    ...profile(name, mascot),
    // Nivån gäller bara i Familj-läget, men sparas alltid så att spelledaren kan byta läge i lobbyn.
    level,
    connected: true,
    lastSeen: serverTimestamp(),
    joinedAt: serverTimestamp(),
    pendingSlot: null,
  });
}

export async function updateProfile(code: string, uid: string, name: string, mascot: MascotId) {
  await updateDoc(teamRef(code, uid), profile(name, mascot));
}

/** Bara i lobbyn. */
export async function setLevel(code: string, uid: string, level: TeamLevel) {
  await updateDoc(teamRef(code, uid), { level });
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

/** Snabbläget: laget tar tillbaka sitt drag. Reglerna tillåter det bara några sekunder efter låsningen. */
export async function undoMove(code: string, turnIndex: number) {
  await deleteDoc(moveRef(code, turnIndex));
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

/** En färdig pik till laget som gissar. Reglerna stoppar den om laget pikat de senaste åtta sekunderna. */
export async function sendTaunt(code: string, uid: string, turnIndex: number, id: string) {
  await updateDoc(teamRef(code, uid), { taunt: { id, at: serverTimestamp(), turnIndex } });
}

/**
 * Fortsätt eller lås: lagets val efter ett rätt svar. Spelledarens telefon ser valet och drar nästa kort
 * eller går vidare, när ångerfönstret har gått ut. at är serverns tid, så att fönstret inte går att flytta.
 */
export async function chooseStreak(code: string, uid: string, turnIndex: number, action: StreakAction, afterUndo = false) {
  await updateDoc(teamRef(code, uid), {
    streakChoice: { turnIndex, action, at: serverTimestamp(), ...(afterUndo ? { undone: true } : {}) },
  });
}

/**
 * Fortsätt eller lås: laget ångrar sitt val. Reglerna tillåter det bara inom ångerfönstret och en gång
 * per tur, så att ett lag inte kan hålla spelet stilla genom att välja och ångra om och om igen.
 */
export async function undoStreak(code: string, uid: string, turnIndex: number) {
  await updateDoc(teamRef(code, uid), { streakChoice: { turnIndex, action: 'undone', at: serverTimestamp() } });
}
