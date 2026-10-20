// Ett helt spel med tre lag mot emulatorn, med de riktiga säkerhetsreglerna.
// Spelledaren och lagen kör samma funktioner som appen, var och en som sin egen användare.
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectFirestoreEmulator, getDoc, getDocs, getFirestore, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { isPlacementCorrect, type Song } from '../src/engine/game';
import type { GameDoc, MoveDoc, PrivateState, Team, TeamDoc } from '../src/game/types';

const actor = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../src/firebase', () => ({
  get db() {
    return actor.db;
  },
}));

const { createGame, nextTurn, reveal, startGame, playAgain } = await import('../src/game/hostActions');
const { joinGame, lockMove } = await import('../src/game/teamActions');
const { gameRef, moveRef, privateRef, teamsRef } = await import('../src/game/refs');

// Testerna når inte Spotify, så korten får inga omslag.
const noArt = async () => null;

const PROJECT = 'demo-krikensongguessr';
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
});
const apps: FirebaseApp[] = [];
const clients = new Map<string, Firestore>();

function as(uid: string): Firestore {
  let fs = clients.get(uid);
  if (!fs) {
    const app = initializeApp({ projectId: PROJECT }, `flow-${uid}`);
    apps.push(app);
    fs = getFirestore(app);
    connectFirestoreEmulator(fs, '127.0.0.1', 8080, { mockUserToken: { sub: uid, user_id: uid } });
    clients.set(uid, fs);
  }
  actor.db = fs;
  return fs;
}

const songs: Song[] = Array.from({ length: 40 }, (_, i) => ({
  id: `song${i}`,
  spotifyUri: `spotify:track:${i}`,
  title: `Låt ${i}`,
  artist: 'Artist',
  year: 1960 + i,
}));

beforeAll(async () => {
  const res = await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}:securityRules`, {
    method: 'PUT',
    body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: readFileSync('firestore.rules', 'utf8') }] } }),
  });
  expect(res.ok).toBe(true);
});

afterAll(async () => {
  await Promise.all(apps.map((a) => deleteApp(a)));
});

async function hostSnapshot(code: string) {
  as('host');
  const game = (await getDoc(gameRef(code))).data() as GameDoc;
  const teams = (await getDocs(teamsRef(code))).docs.map((d) => ({ ...(d.data() as TeamDoc), uid: d.id })) as Team[];
  const state = (await getDoc(privateRef(code))).data() as PrivateState;
  return { game, teams, state };
}

describe('ett helt spel', () => {
  it('spelas från lobby till vinst utan manuell rättning', async () => {
    as('host');
    const code = await createGame('host');

    for (const [uid, name] of [['lagA', 'Lag A'], ['lagB', 'Lag B'], ['lagC', 'Lag C']]) {
      as(uid);
      await joinGame(code, uid, name, 'kalle');
    }

    let { game, teams } = await hostSnapshot(code);
    await startGame(code, game, teams, songs, noArt);
    ({ game, teams } = await hostSnapshot(code));
    expect(game.status).toBe('playing');
    for (const t of teams) expect(t.timeline).toHaveLength(1);

    // Ett lag kan inte gå med efter start.
    as('sen');
    await expect(joinGame(code, 'sen', 'Sena laget', 'ulla')).rejects.toMatchObject({ code: 'permission-denied' });

    let turns = 0;
    for (;;) {
      const snap = await hostSnapshot(code);
      if (snap.game.status === 'finished') break;
      expect(snap.game.phase).toBe('placing');
      const team = snap.teams.find((t) => t.uid === snap.game.currentTeamUid)!;
      const card = snap.state.currentCard!;

      // Lag A svarar alltid rätt, de andra alltid fel.
      const timeline = team.timeline ?? [];
      const slots = Array.from({ length: timeline.length + 1 }, (_, i) => i);
      const right = slots.find((s) => isPlacementCorrect(timeline, s, card.year))!;
      const wrong = slots.find((s) => !isPlacementCorrect(timeline, s, card.year));
      const slot = team.uid === 'lagA' || wrong === undefined ? right : wrong;

      // Fel lag kan inte lägga drag.
      const other = snap.teams.find((t) => t.uid !== team.uid)!;
      as(other.uid);
      await expect(lockMove(code, other.uid, snap.game.turnIndex, 0)).rejects.toMatchObject({ code: 'permission-denied' });

      as(team.uid);
      await lockMove(code, team.uid, snap.game.turnIndex, slot);

      as('host');
      const move = (await getDoc(moveRef(code, snap.game.turnIndex))).data() as MoveDoc;
      await reveal(code, snap.game, team, move, card, noArt);

      const after = await hostSnapshot(code);
      expect(after.game.phase).toBe('revealed');
      expect(after.game.lastResult?.correct).toBe(team.uid === 'lagA' || wrong === undefined);

      await nextTurn(code, after.game, after.teams, after.state, songs);
      turns++;
      expect(turns).toBeLessThan(100);
    }

    ({ game, teams } = await hostSnapshot(code));
    expect(game.endReason).toBe('target');
    expect(game.winnerUids).toEqual(['lagA']);
    const winner = teams.find((t) => t.uid === 'lagA')!;
    expect(winner.timeline).toHaveLength(game.settings.targetLength);
    const years = winner.timeline!.map((c) => c.year);
    expect(years).toEqual([...years].sort((a, b) => a - b));

    // Spela igen: tillbaka till lobbyn med tomma tidslinjer.
    await playAgain(code, teams);
    ({ game, teams } = await hostSnapshot(code));
    expect(game.status).toBe('lobby');
    for (const t of teams) expect(t.timeline).toEqual([]);
  });
});
