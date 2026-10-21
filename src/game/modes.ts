// Spellägena och Familj-lägets nivåer: texterna som visas, och när artistalternativen syns.
import { gameMode, type GameDoc, type GameMode, type TeamLevel } from './types';

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
];

/** Snabbläget: så länge laget kan ångra sitt drag. Samma gräns står i firestore.rules. */
export const FAST_UNDO_MS = 5_000;

export const isFast = (game: GameDoc) => game.settings.fastMode === true;

/** Bokstäverna framför artisterna, så att det är lätt att ropa ut svaret. */
export const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Alternativen visas för det lätta laget i tur, för alla som gissar med och för alla vid avslöjandet.
 * Ett svårt lag i tur ser dem inte, eftersom artisten avslöjar eran.
 */
export function showsChoices(game: GameDoc, myTurn: boolean, byArtist: boolean): boolean {
  return gameMode(game) === 'family' && Boolean(game.choices?.length) && (byArtist || !myTurn || game.phase === 'revealed');
}
