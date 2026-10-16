import { describe, expect, it } from 'vitest';
import {
  cardsLeft,
  clampTarget,
  createDeck,
  drawCard,
  evaluatePlacement,
  generateGameCode,
  hasReachedTarget,
  isPlacementCorrect,
  leaders,
  nextTeamUid,
  setupGame,
  shuffle,
  type TimelineCard,
} from './game';

const card = (year: number, id = `c${year}`): TimelineCard => ({
  cardId: id,
  title: `Låt ${year}`,
  artist: 'Artist',
  year,
});

const timeline = [card(1970), card(1985), card(2001)];

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

describe('isPlacementCorrect', () => {
  it('godtar före första kortet', () => {
    expect(isPlacementCorrect(timeline, 0, 1960)).toBe(true);
    expect(isPlacementCorrect(timeline, 0, 1971)).toBe(false);
  });

  it('godtar efter sista kortet', () => {
    expect(isPlacementCorrect(timeline, 3, 2020)).toBe(true);
    expect(isPlacementCorrect(timeline, 3, 1999)).toBe(false);
  });

  it('godtar mellan grannar', () => {
    expect(isPlacementCorrect(timeline, 1, 1980)).toBe(true);
    expect(isPlacementCorrect(timeline, 2, 1990)).toBe(true);
    expect(isPlacementCorrect(timeline, 1, 1990)).toBe(false);
    expect(isPlacementCorrect(timeline, 2, 1980)).toBe(false);
  });

  it('räknar lika år som rätt på båda sidor', () => {
    expect(isPlacementCorrect(timeline, 1, 1985)).toBe(true);
    expect(isPlacementCorrect(timeline, 2, 1985)).toBe(true);
    expect(isPlacementCorrect(timeline, 0, 1970)).toBe(true);
    expect(isPlacementCorrect(timeline, 3, 2001)).toBe(true);
  });

  it('godtar allt på en tom tidslinje', () => {
    expect(isPlacementCorrect([], 0, 1999)).toBe(true);
  });

  it('avvisar ogiltiga luckor', () => {
    expect(isPlacementCorrect(timeline, -1, 1960)).toBe(false);
    expect(isPlacementCorrect(timeline, 4, 2020)).toBe(false);
    expect(isPlacementCorrect(timeline, 1.5, 1980)).toBe(false);
  });
});

describe('evaluatePlacement', () => {
  it('lägger in kortet vid rätt svar', () => {
    const result = evaluatePlacement(timeline, 1, card(1980));
    expect(result.correct).toBe(true);
    expect(result.timeline.map((c) => c.year)).toEqual([1970, 1980, 1985, 2001]);
  });

  it('lämnar tidslinjen orörd vid fel svar', () => {
    const result = evaluatePlacement(timeline, 0, card(1980));
    expect(result.correct).toBe(false);
    expect(result.timeline).toEqual(timeline);
  });
});

describe('nextTeamUid', () => {
  const order = ['a', 'b', 'c'];

  it('går runt i turordningen', () => {
    expect(nextTeamUid(order, 'a')).toBe('b');
    expect(nextTeamUid(order, 'c')).toBe('a');
  });

  it('hoppar över lag som inte finns kvar', () => {
    expect(nextTeamUid(order, 'a', new Set(['a', 'c']))).toBe('c');
    expect(nextTeamUid(order, 'b', new Set(['a', 'c']))).toBe('c');
  });

  it('börjar från början utan nuvarande lag', () => {
    expect(nextTeamUid(order, null)).toBe('a');
  });

  it('ger null när inga lag finns', () => {
    expect(nextTeamUid(order, 'a', new Set())).toBeNull();
  });

  it('ger samma lag om det är det enda kvar', () => {
    expect(nextTeamUid(order, 'b', new Set(['b']))).toBe('b');
  });
});

describe('kortlek', () => {
  it('drar alla kort exakt en gång', () => {
    let deck = createDeck(['1', '2', '3', '4'], seeded(1));
    const drawn: string[] = [];
    for (;;) {
      const next = drawCard(deck);
      if (!next) break;
      drawn.push(next.cardId);
      deck = next.deck;
    }
    expect(drawn.sort()).toEqual(['1', '2', '3', '4']);
    expect(cardsLeft(deck)).toBe(0);
  });
});

describe('setupGame', () => {
  it('ger varje lag ett unikt startkort och resten i leken', () => {
    const songs = Array.from({ length: 10 }, (_, i) => `s${i}`);
    const setup = setupGame(['a', 'b', 'c'], songs, seeded(42));
    expect([...setup.turnOrder].sort()).toEqual(['a', 'b', 'c']);
    const starts = Object.values(setup.startCards);
    expect(new Set(starts).size).toBe(3);
    expect(cardsLeft(setup.deck)).toBe(7);
    const remaining = setup.deck.deckOrder.slice(setup.deck.deckIndex);
    for (const id of starts) expect(remaining).not.toContain(id);
  });

  it('kräver 2–10 lag', () => {
    const songs = Array.from({ length: 50 }, (_, i) => `s${i}`);
    expect(() => setupGame(['a'], songs)).toThrow();
    expect(() => setupGame(Array.from({ length: 11 }, (_, i) => `t${i}`), songs)).toThrow();
  });
});

describe('vinst', () => {
  it('räknar startkortet i mållängden', () => {
    expect(hasReachedTarget([card(1)], 1)).toBe(true);
    expect(hasReachedTarget(timeline, 3)).toBe(true);
    expect(hasReachedTarget(timeline, 4)).toBe(false);
  });

  it('hittar lagen med flest kort, även delad ledning', () => {
    expect(leaders({ a: [card(1)], b: timeline, c: timeline })).toEqual(['b', 'c']);
  });
});

describe('övrigt', () => {
  it('begränsar mållängden till 3–15', () => {
    expect(clampTarget(1)).toBe(3);
    expect(clampTarget(99)).toBe(15);
    expect(clampTarget(7)).toBe(7);
  });

  it('blandar utan att tappa element', () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(3)).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('ger 6-siffriga koder', () => {
    expect(generateGameCode(() => 0)).toBe('000000');
    expect(generateGameCode(() => 0.999999)).toMatch(/^\d{6}$/);
  });
});
