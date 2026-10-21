// Spellägena och Familj-lägets nivåer: texterna som visas, och när artistalternativen syns.
import { gameMode, teamLevel, type GameDoc, type GameMode, type TeamDoc, type TeamLevel } from './types';

export type CardOption<T extends string> = { value: T; name: string; text: string };

export const LEVELS: CardOption<TeamLevel>[] = [
  { value: 'easy', name: 'Lätt', text: 'Välj vem som sjunger bland fyra artister.' },
  { value: 'hard', name: 'Svår', text: 'Lägg låten rätt i tidslinjen efter år.' },
];

export const MODES: CardOption<GameMode>[] = [
  { value: 'timeline', name: 'Tidslinje', text: 'Alla lägger låten rätt i tidslinjen efter år.' },
  {
    value: 'family',
    name: 'Familj',
    text: 'Varje lag väljer nivå: lätt gissar artist bland fyra, svår lägger i tidslinjen. Alla får gissa med.',
  },
  {
    value: 'film',
    name: 'Film',
    text: 'Alla gissar vilken film låten kommer från, bland fyra. Rätt svar läggs i tidslinjen efter filmens premiärår.',
  },
];

/** Laget svarar genom att välja bland fyra (lätt lag i Familj, alla i Film) i stället för att lägga i en lucka. */
export function answersByChoice(game: GameDoc, team: TeamDoc): boolean {
  const mode = gameMode(game);
  return mode === 'film' || (mode === 'family' && teamLevel(team) === 'easy');
}

/** Texterna kring alternativen: artister i Familj, filmer i Film. */
export function choiceTexts(game: GameDoc) {
  return gameMode(game) === 'film'
    ? { ask: 'Vilken film?', guess: 'Gissa med: vilken film?', past: 'Vilken film var det?', pick: 'Välj en film', how: 'tryck på filmen låten kommer från', noun: 'film' }
    : { ask: 'Vem sjunger?', guess: 'Gissa med: vem sjunger?', past: 'Vem sjöng?', pick: 'Välj en artist', how: 'tryck på artisten som sjunger', noun: 'artist' };
}

/** Snabbläget: så länge laget kan ångra sitt drag. Samma gräns står i firestore.rules. */
export const FAST_UNDO_MS = 5_000;

export const isFast = (game: GameDoc) => game.settings.fastMode === true;

/** Bokstäverna framför artisterna, så att det är lätt att ropa ut svaret. */
export const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Alternativen visas för det lätta laget i tur, för alla som gissar med och för alla vid avslöjandet.
 * Ett svårt lag i Familj ser dem inte på sin tur, eftersom artisten avslöjar eran. Gäller Familj och Film.
 */
export function showsChoices(game: GameDoc, myTurn: boolean, byArtist: boolean): boolean {
  return gameMode(game) !== 'timeline' && Boolean(game.choices?.length) && (byArtist || !myTurn || game.phase === 'revealed');
}
