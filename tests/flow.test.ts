// Ett helt spel med tre lag mot emulatorn, med de riktiga säkerhetsreglerna.
// Spelledaren och lagen kör samma funktioner som appen, var och en som sin egen användare.
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectFirestoreEmulator, getDoc, getDocs, getFirestore, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { answerIndex } from '../src/engine/artist';
import { isPlacementCorrect, type Song } from '../src/engine/game';
import type { GameDoc, MoveDoc, PrivateState, Team, TeamDoc } from '../src/game/types';

const actor = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../src/firebase', () => ({
  get db() {
    return actor.db;
  },
}));

const { createGame, nextTurn, reveal, setMode, startGame, playAgain } = await import('../src/game/hostActions');
const { guessArtist, joinGame, lockChoice, lockMove } = await import('../src/game/teamActions');
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

  it('spelas i Familj-läget med ett lätt och ett svårt lag', async () => {
    // Familj-läget behöver olika artister att välja bland.
    const mixed = songs.map((song, i) => ({ ...song, artist: `Artist ${i % 8}` }));
    as('host');
    const code = await createGame('host');
    await setMode(code, 'family');
    as('latt');
    await joinGame(code, 'latt', 'Barnen', 'kicki', 'easy');
    as('svar');
    await joinGame(code, 'svar', 'Föräldrarna', 'bosse', 'hard');

    let { game, teams } = await hostSnapshot(code);
    await startGame(code, game, teams, mixed, noArt);

    // Nivån går inte att byta när spelet har startat.
    as('svar');
    await expect(joinGame(code, 'svar', 'Föräldrarna', 'bosse', 'easy')).rejects.toMatchObject({ code: 'permission-denied' });

    let turns = 0;
    for (;;) {
      const snap = await hostSnapshot(code);
      if (snap.game.status === 'finished') break;
      const team = snap.teams.find((t) => t.uid === snap.game.currentTeamUid)!;
      const other = snap.teams.find((t) => t.uid !== team.uid)!;
      const card = snap.state.currentCard!;
      const choices = snap.game.choices!;
      expect(choices).toHaveLength(4);
      const answer = answerIndex(choices, card.artist)!;
      expect(answer).not.toBeNull();

      // Laget som inte har tur gissar med. Det ger inga kort.
      as(other.uid);
      await guessArtist(code, other.uid, snap.game.turnIndex, answer);

      as(team.uid);
      if (team.uid === 'latt') {
        // Ett lätt lag kan inte lägga i en lucka, bara välja artist. Barnen väljer alltid rätt.
        await lockChoice(code, team.uid, snap.game.turnIndex, answer);
      } else {
        // Föräldrarna lägger alltid fel när det går.
        const timeline = team.timeline ?? [];
        const slots = Array.from({ length: timeline.length + 1 }, (_, i) => i);
        const slot = slots.find((s) => !isPlacementCorrect(timeline, s, card.year)) ?? 0;
        await lockMove(code, team.uid, snap.game.turnIndex, slot);
      }

      as('host');
      const move = (await getDoc(moveRef(code, snap.game.turnIndex))).data() as MoveDoc;
      await reveal(code, snap.game, team, move, card, noArt);
      const after = await hostSnapshot(code);
      expect(after.game.lastResult?.answer).toBe(answer);
      if (team.uid === 'latt') expect(after.game.lastResult?.correct).toBe(true);

      await nextTurn(code, after.game, after.teams, after.state, mixed);
      turns++;
      expect(turns).toBeLessThan(100);
    }

    ({ game, teams } = await hostSnapshot(code));
    expect(game.winnerUids).toEqual(['latt']);
    const years = teams.find((t) => t.uid === 'latt')!.timeline!.map((c) => c.year);
    expect(years).toHaveLength(game.settings.targetLength);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });
});
