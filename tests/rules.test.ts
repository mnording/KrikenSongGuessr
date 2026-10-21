// Körs mot Firestore-emulatorn: npm run test:rules
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { MASCOTS } from '../src/game/mascots';
import { TAUNT_IDS } from '../src/game/taunts';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const PROJECT = 'demo-krikensongguessr';
const EMULATOR = 'http://127.0.0.1:8080';
const CODE = '123456';
const apps: FirebaseApp[] = [];
const clients = new Map<string, Firestore>();

// En app per användare, med en låtsas-token som emulatorn godtar.
function db(uid: string | null): Firestore {
  const key = uid ?? '(anon)';
  const existing = clients.get(key);
  if (existing) return existing;
  const app = initializeApp({ projectId: PROJECT }, key);
  apps.push(app);
  const fs = getFirestore(app);
  connectFirestoreEmulator(fs, '127.0.0.1', 8080, uid ? { mockUserToken: { sub: uid, user_id: uid } } : {});
  clients.set(key, fs);
  return fs;
}
const anon = () => db(null);

async function assertSucceeds(p: Promise<unknown>) {
  await p;
}
async function assertFails(p: Promise<unknown>) {
  await expect(p).rejects.toMatchObject({ code: 'permission-denied' });
}

// Skrivningar förbi reglerna via emulatorns REST-API med "owner"-token.
type Value = string | number | boolean | null | Date | Value[] | { [k: string]: Value };
function encode(v: Value): unknown {
  if (v === null) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)])) } };
}
const docsUrl = `${EMULATOR}/v1/projects/${PROJECT}/databases/(default)/documents`;
async function adminSet(path: string, data: Record<string, Value>) {
  const res = await fetch(`${docsUrl}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: (encode(data) as { mapValue: { fields: unknown } }).mapValue.fields }),
  });
  if (!res.ok) throw new Error(`adminSet ${path}: ${res.status} ${await res.text()}`);
}

beforeAll(async () => {
  const res = await fetch(`${EMULATOR}/emulator/v1/projects/${PROJECT}:securityRules`, {
    method: 'PUT',
    body: JSON.stringify({
      rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] },
    }),
  });
  if (!res.ok) throw new Error(`Kunde inte ladda reglerna: ${await res.text()}`);
});

afterAll(async () => {
  await Promise.all(apps.map((app) => deleteApp(app)));
});

beforeEach(async () => {
  await fetch(docsUrl.replace('/v1/', '/emulator/v1/'), { method: 'DELETE' });
});

const team = (name = 'Lag') => ({ name, color: '#e11d48', mascot: 'kalle', connected: true, lastSeen: 1, joinedAt: 1 });

async function seed(game: Record<string, Value>, teams: string[] = []) {
  await adminSet(`games/${CODE}`, {
    hostUid: 'host',
    status: 'lobby',
    phase: 'placing',
    turnIndex: 0,
    currentTeamUid: null,
    ...game,
  });
  await adminSet(`games/${CODE}/private/state`, { deckOrder: ['a'], deckIndex: 0 });
  for (const uid of teams) await adminSet(`games/${CODE}/teams/${uid}`, { ...team(), timeline: [] });
}

describe('games', () => {
  it('låter inloggade läsa ett spel med koden men aldrig lista', async () => {
    await seed({});
    await assertSucceeds(getDoc(doc(db('vem-som-helst'), 'games', CODE)));
    await assertFails(getDocs(collection(db('vem-som-helst'), 'games')));
    await assertFails(getDoc(doc(anon(), 'games', CODE)));
  });

  it('låter bara en inloggad skapa spel i eget namn', async () => {
    const game = { hostUid: 'host', status: 'lobby' };
    await assertSucceeds(setDoc(doc(db('host'), 'games', CODE), game));
    await assertFails(setDoc(doc(db('annan'), 'games', '654321'), game));
    await assertFails(setDoc(doc(db('host'), 'games', 'abc'), game));
  });

  it('låter bara spelledaren ändra spelet', async () => {
    await seed({});
    await assertSucceeds(updateDoc(doc(db('host'), 'games', CODE), { status: 'playing' }));
    await assertFails(updateDoc(doc(db('t1'), 'games', CODE), { status: 'finished' }));
    await assertFails(updateDoc(doc(db('host'), 'games', CODE), { hostUid: 't1' }));
  });

  it('skriver inte över ett befintligt spel', async () => {
    await seed({});
    await assertFails(setDoc(doc(db('annan'), 'games', CODE), { hostUid: 'annan', status: 'lobby' }));
  });
});

describe('private', () => {
  it('är bara läsbart för spelledaren', async () => {
    await seed({}, ['t1']);
    await assertSucceeds(getDoc(doc(db('host'), 'games', CODE, 'private', 'state')));
    await assertFails(getDoc(doc(db('t1'), 'games', CODE, 'private', 'state')));
    await assertFails(setDoc(doc(db('t1'), 'games', CODE, 'private', 'state'), { deckIndex: 9 }));
  });
});

describe('teams', () => {
  it('låter ett lag skapa sitt eget dokument i lobbyn', async () => {
    await seed({});
    await assertSucceeds(setDoc(doc(db('t1'), 'games', CODE, 'teams', 't1'), team()));
  });

  it('stoppar lag med annat uid, med tidslinje eller efter start', async () => {
    await seed({});
    await assertFails(setDoc(doc(db('t1'), 'games', CODE, 'teams', 't2'), team()));
    await assertFails(setDoc(doc(db('t1'), 'games', CODE, 'teams', 't1'), { ...team(), timeline: [] }));
    await assertFails(setDoc(doc(db('t1'), 'games', CODE, 'teams', 't1'), { ...team(''), }));
    await assertFails(setDoc(doc(db('host'), 'games', CODE, 'teams', 'host'), team()));
    await seed({ status: 'playing' });
    await assertFails(setDoc(doc(db('t3'), 'games', CODE, 'teams', 't3'), team()));
  });

  it('låter laget ändra namn och närvaro men inte tidslinjen', async () => {
    await seed({ status: 'playing' }, ['t1']);
    const ref = doc(db('t1'), 'games', CODE, 'teams', 't1');
    await assertSucceeds(updateDoc(ref, { name: 'Nytt namn', lastSeen: 2, connected: false, pendingSlot: 1 }));
    await assertFails(updateDoc(ref, { timeline: [{ year: 1999 }] }));
    await assertFails(updateDoc(doc(db('t2'), 'games', CODE, 'teams', 't1'), { name: 'Kapat' }));
  });

  it('godtar bara kända maskotar, och lag utan maskot', async () => {
    await seed({});
    const ref = doc(db('t1'), 'games', CODE, 'teams', 't1');
    await assertFails(setDoc(ref, { ...team(), mascot: 'okänd' }));
    const old: Record<string, unknown> = team();
    delete old.mascot;
    await assertSucceeds(setDoc(ref, old));
    await assertSucceeds(updateDoc(ref, { mascot: 'ulla', color: '#64748b' }));
    await assertFails(updateDoc(ref, { mascot: 'Ulla' }));
    await assertFails(updateDoc(ref, { mascot: 'kalle', color: '#64748b' }));
  });

  it('har samma maskotlista som appen', () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    const pairs = [...rules.matchAll(/'([a-z]+)': '(#[0-9a-f]{6})'/g)].map(([, id, color]) => ({ id, color }));
    expect(pairs).toEqual(MASCOTS.map(({ id, color }) => ({ id, color })));
  });

  it('låter laget välja nivå i lobbyn men inte efter start', async () => {
    await seed({}, ['t1']);
    const ref = doc(db('t1'), 'games', CODE, 'teams', 't1');
    await assertSucceeds(updateDoc(ref, { level: 'easy' }));
    await assertFails(updateDoc(ref, { level: 'lätt' }));
    await seed({ status: 'playing' }, ['t1']);
    await assertFails(updateDoc(ref, { level: 'hard' }));
    await assertSucceeds(updateDoc(ref, { name: 'Samma nivå' }));
  });

  it('låter laget gissa med, men bara ett av fyra alternativ', async () => {
    await seed({ status: 'playing' }, ['t1']);
    const ref = doc(db('t1'), 'games', CODE, 'teams', 't1');
    await assertSucceeds(updateDoc(ref, { guess: { turnIndex: 4, choice: 3 } }));
    await assertSucceeds(updateDoc(ref, { guess: null }));
    await assertFails(updateDoc(ref, { guess: { turnIndex: 4, choice: 4 } }));
    await assertFails(updateDoc(ref, { guess: { turnIndex: 4, choice: 1, rätt: true } }));
    await seed({ status: 'playing', phase: 'revealed' }, ['t1']);
    await assertFails(updateDoc(ref, { guess: { turnIndex: 4, choice: 1 } }));
  });

  it('låter andra lag pika laget som gissar, högst en gång per åtta sekunder', async () => {
    await seed({ status: 'playing', phase: 'placing', turnIndex: 4, currentTeamUid: 't2' }, ['t1', 't2']);
    const ref = doc(db('t1'), 'games', CODE, 'teams', 't1');
    const taunt = (id = 'ojoj', turnIndex = 4) => ({ taunt: { id, at: serverTimestamp(), turnIndex } });
    await assertFails(updateDoc(ref, taunt('elak')));
    await assertFails(updateDoc(ref, taunt('ojoj', 3)));
    await assertFails(updateDoc(ref, { taunt: { id: 'ojoj', at: 1, turnIndex: 4 } }));
    await assertSucceeds(updateDoc(ref, taunt()));
    await assertFails(updateDoc(ref, taunt('signatur')));
    // Laget i tur kan inte pika, och ingen kan pika efter avslöjandet.
    await assertFails(updateDoc(doc(db('t2'), 'games', CODE, 'teams', 't2'), taunt()));
    await seed({ status: 'playing', phase: 'revealed', turnIndex: 4, currentTeamUid: 't2' }, ['t3']);
    await assertFails(updateDoc(doc(db('t3'), 'games', CODE, 'teams', 't3'), taunt()));
  });

  it('räknar spärren från lagets förra pik', async () => {
    await seed({ status: 'playing', phase: 'placing', turnIndex: 4, currentTeamUid: 't2' }, ['t1', 't2']);
    const ref = doc(db('t1'), 'games', CODE, 'teams', 't1');
    const taunt = { taunt: { id: 'ojoj', at: serverTimestamp(), turnIndex: 4 } };
    const before = (seconds: number) => ({ ...team(), timeline: [], taunt: { id: 'tick', at: new Date(Date.now() - seconds * 1000), turnIndex: 3 } });
    await adminSet(`games/${CODE}/teams/t1`, before(3));
    await assertFails(updateDoc(ref, taunt));
    await adminSet(`games/${CODE}/teams/t1`, before(9));
    await assertSucceeds(updateDoc(ref, taunt));
  });

  it('har samma pikar som appen', () => {
    const list = readFileSync('firestore.rules', 'utf8').match(/taunt\.id in \[([^\]]+)\]/)?.[1] ?? '';
    expect(list.split(',').map((s) => s.trim().replace(/'/g, ''))).toEqual(TAUNT_IDS);
  });

  it('låter spelledaren skriva tidslinje och ta bort lag', async () => {
    await seed({ status: 'playing' }, ['t1']);
    const ref = doc(db('host'), 'games', CODE, 'teams', 't1');
    await assertSucceeds(updateDoc(ref, { timeline: [{ year: 1999 }] }));
    await assertSucceeds(deleteDoc(ref));
  });

  it('visar lagen bara för spelledaren och lagen i spelet', async () => {
    await seed({}, ['t1']);
    await assertSucceeds(getDocs(collection(db('t1'), 'games', CODE, 'teams')));
    await assertSucceeds(getDocs(collection(db('host'), 'games', CODE, 'teams')));
    await assertFails(getDocs(collection(db('utomstående'), 'games', CODE, 'teams')));
  });
});

describe('moves', () => {
  const playing = { status: 'playing', phase: 'placing', turnIndex: 3, currentTeamUid: 't1' };
  const move = (teamUid = 't1', turnIndex = 3) => ({ teamUid, turnIndex, slotIndex: 1 });

  it('låter laget i tur lägga ett drag', async () => {
    await seed(playing, ['t1', 't2']);
    await assertSucceeds(setDoc(doc(db('t1'), 'games', CODE, 'moves', '3'), move()));
  });

  it('stoppar fel lag, fel tur, fel fas och fel id', async () => {
    await seed(playing, ['t1', 't2']);
    await assertFails(setDoc(doc(db('t2'), 'games', CODE, 'moves', '3'), move('t2')));
    await assertFails(setDoc(doc(db('t2'), 'games', CODE, 'moves', '3'), move('t1')));
    await assertFails(setDoc(doc(db('t1'), 'games', CODE, 'moves', '2'), move('t1', 2)));
    await assertFails(setDoc(doc(db('t1'), 'games', CODE, 'moves', '4'), move('t1', 3)));
    await assertFails(setDoc(doc(db('t1'), 'games', CODE, 'moves', '3'), { ...move(), slotIndex: -1 }));
    await seed({ ...playing, phase: 'revealed' }, ['t1']);
    await assertFails(setDoc(doc(db('t1'), 'games', CODE, 'moves', '3'), move()));
  });

  it('godtar ett artistval i stället för en lucka, men aldrig båda', async () => {
    await seed(playing, ['t1']);
    const ref = doc(db('t1'), 'games', CODE, 'moves', '3');
    const base = { teamUid: 't1', turnIndex: 3 };
    await assertFails(setDoc(ref, { ...base, choice: 4 }));
    await assertFails(setDoc(ref, { ...move(), choice: 1 }));
    await assertFails(setDoc(ref, base));
    await assertSucceeds(setDoc(ref, { ...base, choice: 2 }));
  });

  it('låter inte ett drag ändras när det är lagt', async () => {
    await seed(playing, ['t1']);
    await assertSucceeds(setDoc(doc(db('t1'), 'games', CODE, 'moves', '3'), move()));
    await assertFails(setDoc(doc(db('t1'), 'games', CODE, 'moves', '3'), { ...move(), slotIndex: 0 }));
  });
});
