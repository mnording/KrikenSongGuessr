// Ett helt spel med tre lag mot emulatorn, med de riktiga säkerhetsreglerna.
// Spelledaren och lagen kör samma funktioner som appen, var och en som sin egen användare.
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectFirestoreEmulator, getDoc, getDocs, getFirestore, type Firestore } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { answerIndex, filmAnswerIndex } from '../src/engine/artist';
import { isPlacementCorrect, type Song } from '../src/engine/game';
import type { GameDoc, MoveDoc, PrivateState, Team, TeamDoc } from '../src/game/types';

const actor = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('../src/firebase', () => ({
  get db() {
    return actor.db;
  },
}));

const { createGame, nextTurn, reveal, setMode, startGame, playAgain } = await import('../src/game/hostActions');
const { chooseStreak, guessArtist, joinGame, lockChoice, lockMove } = await import('../src/game/teamActions');
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
  it('spelas i Film-läget där alla gissar filmen', async () => {
    const films = songs.map((song, i) => ({ ...song, artist: `Artist ${i}`, film: `Film ${i % 10}` }));
    as('host');
    const code = await createGame('host');
    await setMode(code, 'film');
    // Ett spel utan urval får ett helt urval, inte bara etiketter (det kraschade lobbyn).
    expect((await hostSnapshot(code)).game.settings.songFilter).toEqual({ decades: [], tags: [] });
    as('a');
    await joinGame(code, 'a', 'Lag A', 'kicki');
    as('b');
    await joinGame(code, 'b', 'Lag B', 'bosse');

    let { game, teams } = await hostSnapshot(code);
    await startGame(code, game, teams, films, noArt);

    let turns = 0;
    for (;;) {
      const snap = await hostSnapshot(code);
      if (snap.game.status === 'finished') break;
      const team = snap.teams.find((t) => t.uid === snap.game.currentTeamUid)!;
      const card = snap.state.currentCard!;
      const answer = filmAnswerIndex(snap.game.choices!, card.film)!;
      expect(answer).not.toBeNull();
      // Lag A väljer alltid rätt film, lag B alltid fel.
      const choice = team.uid === 'a' ? answer : (answer + 1) % 4;
      as(team.uid);
      await lockChoice(code, team.uid, snap.game.turnIndex, choice);
      as('host');
      const move = (await getDoc(moveRef(code, snap.game.turnIndex))).data() as MoveDoc;
      await reveal(code, snap.game, team, move, card, noArt);
      const after = await hostSnapshot(code);
      expect(after.game.lastResult?.correct).toBe(team.uid === 'a');
      await nextTurn(code, after.game, after.teams, after.state, films);
      turns++;
      expect(turns).toBeLessThan(100);
    }

    ({ game, teams } = await hostSnapshot(code));
    expect(game.winnerUids).toEqual(['a']);
    const won = teams.find((t) => t.uid === 'a')!.timeline!;
    expect(won.every((c) => c.film)).toBe(true);
    expect(won.map((c) => c.year)).toEqual([...won.map((c) => c.year)].sort((x, y) => x - y));
  });
});

describe('fortsätt eller lås', () => {
  /** Laget i tur lägger rätt eller fel, och spelledaren avslöjar. */
  async function play(code: string, correct: boolean) {
    const snap = await hostSnapshot(code);
    const team = snap.teams.find((t) => t.uid === snap.game.currentTeamUid)!;
    const card = snap.state.currentCard!;
    const timeline = team.timeline ?? [];
    const slots = Array.from({ length: timeline.length + 1 }, (_, i) => i);
    const slot = slots.find((s) => isPlacementCorrect(timeline, s, card.year) === correct)!;
    expect(slot, 'det finns en lucka som ger rätt svar').toBeDefined();
    as(team.uid);
    await lockMove(code, team.uid, snap.game.turnIndex, slot);
    as('host');
    const move = (await getDoc(moveRef(code, snap.game.turnIndex))).data() as MoveDoc;
    await reveal(code, snap.game, team, move, card, noArt);
    return { team, after: await hostSnapshot(code) };
  }

  it('bygger en svit, tappar den vid fel och behåller det inlåsta', async () => {
    as('host');
    const code = await createGame('host');
    for (const [uid, name] of [['lagA', 'Lag A'], ['lagB', 'Lag B']]) {
      as(uid);
      await joinGame(code, uid, name, 'kalle');
    }
    const lobby = await hostSnapshot(code);
    expect(lobby.game.settings.streak).toBe(true);
    // Sviten blir högst tre kort, under mållängden 7, så ingen vinner av misstag.
    await startGame(code, lobby.game, lobby.teams, songs, noArt);
    const first = (await hostSnapshot(code)).game.currentTeamUid!;

    // Två rätt i rad, med Fortsätt emellan.
    for (let i = 1; i <= 2; i++) {
      const { after } = await play(code, true);
      expect(after.game.streak).toMatchObject({ teamUid: first });
      expect(after.game.streak!.cardIds).toHaveLength(i);
      as(first);
      await chooseStreak(code, first, after.game.turnIndex, 'continue');
      // Valet går inte att ändra.
      await expect(chooseStreak(code, first, after.game.turnIndex, 'lock')).rejects.toMatchObject({ code: 'permission-denied' });
      const chosen = await hostSnapshot(code);
      expect(chosen.teams.find((t) => t.uid === first)!.streakChoice).toMatchObject({ turnIndex: after.game.turnIndex, action: 'continue' });
      await nextTurn(code, chosen.game, chosen.teams, chosen.state, songs, { sameTeam: true });
      const next = await hostSnapshot(code);
      expect(next.game.currentTeamUid).toBe(first);
      expect(next.game.phase).toBe('placing');
    }

    // Fel på tredje: båda osäkrade korten försvinner, startkortet blir kvar.
    const { after: missed } = await play(code, false);
    expect(missed.game.lastResult?.lost).toHaveLength(2);
    expect(missed.game.streak).toBeNull();
    expect(missed.teams.find((t) => t.uid === first)!.timeline).toHaveLength(1);
    // Efter fel går det inte att välja, och spelledaren kan inte fortsätta.
    as(first);
    await expect(chooseStreak(code, first, missed.game.turnIndex, 'continue')).rejects.toMatchObject({ code: 'permission-denied' });
    as('host');
    await expect(nextTurn(code, missed.game, missed.teams, missed.state, songs, { sameTeam: true })).rejects.toThrow();
    await nextTurn(code, missed.game, missed.teams, missed.state, songs);

    // Nästa lag tar ett rätt och låser in.
    const { team: second, after: right } = await play(code, true);
    expect(second.uid).not.toBe(first);
    as(second.uid);
    await chooseStreak(code, second.uid, right.game.turnIndex, 'lock');
    const locked = await hostSnapshot(code);
    await nextTurn(code, locked.game, locked.teams, locked.state, songs);
    const done = await hostSnapshot(code);
    expect(done.game.streak).toBeNull();
    expect(done.game.currentTeamUid).toBe(first);
    expect(done.teams.find((t) => t.uid === second.uid)!.timeline).toHaveLength(2);
  });
});
