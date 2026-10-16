// Allt spelledarens telefon skriver. Den drar kort, utvärderar och skriver resultatet.
import { getDocs, runTransaction, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
  cardsLeft,
  clampTarget,
  DEFAULT_TARGET,
  drawCard,
  evaluatePlacement,
  generateGameCode,
  hasReachedTarget,
  leaders,
  nextTeamUid,
  setupGame,
  toTimelineCard,
  type Song,
} from '../engine/game';
import { db } from '../firebase';
import { gameRef, moveRef, movesRef, privateRef, teamRef } from './refs';
import type { GameDoc, MoveDoc, PrivateState, Team } from './types';

const HOST_GAME_KEY = 'host.gameCode';

export function rememberHostGame(code: string) {
  localStorage.setItem(HOST_GAME_KEY, code);
}
export function rememberedHostGame(): string | null {
  return localStorage.getItem(HOST_GAME_KEY);
}

export async function createGame(hostUid: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateGameCode();
    const created = await runTransaction(db, async (tx) => {
      const existing = await tx.get(gameRef(code));
      if (existing.exists()) return false;
      const game: GameDoc = {
        hostUid,
        status: 'lobby',
        phase: 'placing',
        settings: { targetLength: DEFAULT_TARGET },
        turnOrder: [],
        turnIndex: 0,
        currentTeamUid: null,
        lastResult: null,
        winnerUids: [],
        endReason: null,
        cardsLeft: 0,
      };
      tx.set(gameRef(code), { ...game, createdAt: serverTimestamp() });
      return true;
    });
    if (created) {
      rememberHostGame(code);
      return code;
    }
  }
  throw new Error('Kunde inte skapa en unik spelkod. Försök igen.');
}

export async function setTargetLength(code: string, target: number) {
  const batch = writeBatch(db);
  batch.update(gameRef(code), { 'settings.targetLength': clampTarget(target) });
  await batch.commit();
}

export async function removeTeam(code: string, uid: string) {
  const batch = writeBatch(db);
  batch.delete(teamRef(code, uid));
  await batch.commit();
}

const songById = (songs: Song[]) => new Map(songs.map((s) => [s.id, s]));

export async function startGame(code: string, game: GameDoc, teams: Team[], songs: Song[]) {
  const setup = setupGame(
    teams.map((t) => t.uid),
    songs.map((s) => s.id),
  );
  const byId = songById(songs);
  const first = drawCard(setup.deck);
  if (!first) throw new Error('För få låtar');

  const batch = writeBatch(db);
  for (const team of teams) {
    batch.update(teamRef(code, team.uid), {
      timeline: [toTimelineCard(byId.get(setup.startCards[team.uid])!)],
      pendingSlot: null,
    });
  }
  const state: PrivateState = {
    deckOrder: first.deck.deckOrder,
    deckIndex: first.deck.deckIndex,
    currentCard: byId.get(first.cardId)!,
    spotifyDeviceId: null,
  };
  batch.set(privateRef(code), state, { merge: true });
  batch.update(gameRef(code), {
    status: 'playing',
    phase: 'placing',
    turnOrder: setup.turnOrder,
    turnIndex: game.turnIndex + 1,
    currentTeamUid: setup.turnOrder[0],
    lastResult: null,
    winnerUids: [],
    endReason: null,
    cardsLeft: cardsLeft(first.deck),
  });
  await batch.commit();
  return state.currentCard!;
}

export async function reveal(code: string, game: GameDoc, team: Team, move: MoveDoc, card: Song) {
  const evaluation = evaluatePlacement(team.timeline ?? [], move.slotIndex, toTimelineCard(card));
  const batch = writeBatch(db);
  if (evaluation.correct) {
    batch.update(teamRef(code, team.uid), { timeline: evaluation.timeline });
  }
  batch.update(gameRef(code), {
    phase: 'revealed',
    lastResult: {
      teamUid: team.uid,
      turnIndex: game.turnIndex,
      slotIndex: move.slotIndex,
      correct: evaluation.correct,
      card: toTimelineCard(card),
      reachedTarget: hasReachedTarget(evaluation.timeline, game.settings.targetLength),
    },
  });
  await batch.commit();
}

function timelines(teams: Team[]) {
  return Object.fromEntries(teams.map((t) => [t.uid, t.timeline ?? []]));
}

export async function finishGame(code: string, teams: Team[], endReason: GameDoc['endReason']) {
  const batch = writeBatch(db);
  batch.update(gameRef(code), {
    status: 'finished',
    endReason,
    winnerUids: leaders(timelines(teams)),
  });
  await batch.commit();
}

/**
 * Går till nästa lag. Används både efter avslöjandet och för att hoppa över ett lag
 * (då kasseras kortet). Returnerar nästa kort, eller null om spelet tog slut.
 */
export async function nextTurn(
  code: string,
  game: GameDoc,
  teams: Team[],
  state: PrivateState,
  songs: Song[],
): Promise<Song | null> {
  const winners = teams.filter((t) => hasReachedTarget(t.timeline ?? [], game.settings.targetLength));
  if (winners.length > 0) {
    await finishGame(code, teams, 'target');
    return null;
  }
  const drawn = drawCard({ deckOrder: state.deckOrder, deckIndex: state.deckIndex });
  if (!drawn) {
    await finishGame(code, teams, 'deck');
    return null;
  }
  const card = songById(songs).get(drawn.cardId);
  if (!card) throw new Error(`Låten ${drawn.cardId} finns inte i låtlistan`);
  const nextUid = nextTeamUid(game.turnOrder, game.currentTeamUid, new Set(teams.map((t) => t.uid)));
  if (!nextUid) {
    await finishGame(code, teams, 'host');
    return null;
  }

  const batch = writeBatch(db);
  batch.update(privateRef(code), { deckIndex: drawn.deck.deckIndex, currentCard: card });
  batch.update(teamRef(code, nextUid), { pendingSlot: null });
  batch.update(gameRef(code), {
    phase: 'placing',
    turnIndex: game.turnIndex + 1,
    currentTeamUid: nextUid,
    lastResult: null,
    cardsLeft: cardsLeft(drawn.deck),
  });
  await batch.commit();
  return card;
}

/** Tillbaka till lobbyn med samma lag. Nya lag kan också gå med. */
export async function playAgain(code: string, teams: Team[]) {
  const batch = writeBatch(db);
  for (const team of teams) batch.update(teamRef(code, team.uid), { timeline: [], pendingSlot: null });
  batch.update(gameRef(code), {
    status: 'lobby',
    phase: 'placing',
    turnOrder: [],
    currentTeamUid: null,
    lastResult: null,
    winnerUids: [],
    endReason: null,
  });
  batch.set(privateRef(code), { deckOrder: [], deckIndex: 0, currentCard: null }, { merge: true });
  await batch.commit();
  // Gamla drag behövs inte längre. Turnumret fortsätter räkna, så de krockar aldrig.
  const old = await getDocs(movesRef(code));
  const cleanup = writeBatch(db);
  old.docs.forEach((d) => cleanup.delete(d.ref));
  if (!old.empty) await cleanup.commit();
}

export async function saveDeviceId(code: string, deviceId: string) {
  const batch = writeBatch(db);
  batch.set(privateRef(code), { spotifyDeviceId: deviceId }, { merge: true });
  await batch.commit();
}

export { moveRef };
