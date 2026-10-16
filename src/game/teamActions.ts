// Det ett lag får skriva: sin egen lagprofil och sina drag.
import { deleteDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { moveRef, teamRef } from './refs';

export async function joinGame(code: string, uid: string, name: string, color: string) {
  await setDoc(teamRef(code, uid), {
    name: name.trim().slice(0, 24),
    color,
    connected: true,
    lastSeen: serverTimestamp(),
    joinedAt: serverTimestamp(),
    pendingSlot: null,
  });
}

export async function updateProfile(code: string, uid: string, name: string, color: string) {
  await updateDoc(teamRef(code, uid), { name: name.trim().slice(0, 24), color });
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
