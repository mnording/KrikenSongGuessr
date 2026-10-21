import { describe, expect, it } from 'vitest';
import films from '../data/films.json';
import songs from '../data/songs.json';
import {
  answerIndex,
  artistKeys,
  CHOICE_COUNT,
  evaluateArtistChoice,
  evaluateFilmChoice,
  filmAnswerIndex,
  pickChoices,
  pickFilmChoices,
  sameArtist,
  sameFilm,
  sortedSlot,
} from './artist';
import type { Song, TimelineCard } from './game';

const list = songs as Song[];
const filmList = films as Song[];
const card = (year: number, artist = 'X'): TimelineCard => ({ cardId: `c${year}`, title: 'T', artist, year });

/** Förutsägbar slump för testerna. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

describe('artistnamn', () => {
  it('delar upp samarbeten och tar bort "The" och accenter', () => {
    expect(artistKeys('Lady Gaga & Bruno Mars')).toEqual(['lady gaga', 'bruno mars']);
    expect(artistKeys('Mark Ronson ft. Bruno Mars')).toEqual(['mark ronson', 'bruno mars']);
    expect(artistKeys('The Beatles')).toEqual(['beatles']);
    expect(artistKeys('Beyoncé')).toEqual(['beyonce']);
  });

  it('räknar samarbeten med en artist som samma artist', () => {
    expect(sameArtist('Bruno Mars', 'Lady Gaga & Bruno Mars')).toBe(true);
    expect(sameArtist('Beatles', 'The Beatles')).toBe(true);
    expect(sameArtist('ABBA', 'Abba')).toBe(true);
    expect(sameArtist('John Lennon', 'The Beatles')).toBe(false);
  });
});

describe('alternativen', () => {
  it('ger fyra olika artister där låtens artist finns med, för varje låt i listan', () => {
    list.forEach((song, i) => {
      const choices = pickChoices(song, list, seeded(i + 1));
      expect(choices).toHaveLength(CHOICE_COUNT);
      expect(choices.filter((c) => sameArtist(c, song.artist))).toHaveLength(1);
      for (const a of choices) expect(choices.filter((b) => sameArtist(a, b)), song.id).toHaveLength(1);
    });
  });

  it('tar de felaktiga alternativen från ungefär samma era', () => {
    const song = list.find((s) => s.artist === 'Billie Eilish')!;
    const years = (artist: string) => list.filter((s) => s.artist === artist).map((s) => s.year);
    for (const artist of pickChoices(song, list, seeded(7))) {
      expect(Math.min(...years(artist).map((y) => Math.abs(y - song.year))), artist).toBeLessThan(10);
    }
  });

  it('hittar rätt svar bland alternativen', () => {
    expect(answerIndex(['A', 'Bruno Mars', 'C', 'D'], 'Mark Ronson ft. Bruno Mars')).toBe(1);
    expect(answerIndex(['A', 'B', 'C', 'D'], 'E')).toBeNull();
  });
});

describe('utvärderingen', () => {
  const timeline = [card(1970), card(1990), card(1990), card(2010)];

  it('lägger kortet i årsordning, efter kort från samma år', () => {
    expect(sortedSlot(timeline, 1960)).toBe(0);
    expect(sortedSlot(timeline, 1990)).toBe(3);
    expect(sortedSlot(timeline, 2020)).toBe(4);
  });

  it('ger kortet vid rätt artist och lämnar tidslinjen orörd vid fel', () => {
    const won = evaluateArtistChoice(timeline, ['A', 'ABBA', 'C', 'D'], 1, card(1975, 'ABBA'));
    expect(won.correct).toBe(true);
    expect(won.timeline.map((c) => c.year)).toEqual([1970, 1975, 1990, 1990, 2010]);
    const lost = evaluateArtistChoice(timeline, ['A', 'ABBA', 'C', 'D'], 0, card(1975, 'ABBA'));
    expect(lost.correct).toBe(false);
    expect(lost.timeline).toEqual(timeline);
    expect(evaluateArtistChoice(timeline, ['A'], 9, card(1975, 'ABBA')).correct).toBe(false);
  });
});

describe('filmerna', () => {
  it('ger fyra olika filmer där låtens film finns med, för varje filmlåt', () => {
    filmList.forEach((song, i) => {
      const choices = pickFilmChoices(song, filmList, seeded(i + 1));
      expect(choices, song.id).toHaveLength(CHOICE_COUNT);
      expect(choices.filter((c) => sameFilm(c, song.film!))).toHaveLength(1);
      expect(new Set(choices).size).toBe(CHOICE_COUNT);
      expect(filmAnswerIndex(choices, song.film)).not.toBeNull();
    });
  });

  it('ger kortet vid rätt film och lägger det efter premiäråret', () => {
    const card = { cardId: 'f', title: 'Let It Go', artist: 'Idina Menzel', film: 'Frost', year: 2013 };
    const timeline = [{ cardId: 'a', title: 'T', artist: 'A', year: 1994 }, { cardId: 'b', title: 'T', artist: 'A', year: 2016 }];
    const won = evaluateFilmChoice(timeline, ['Lejonkungen', 'frost', 'Shrek', 'Coco'], 1, card);
    expect(won.correct).toBe(true);
    expect(won.timeline.map((c) => c.year)).toEqual([1994, 2013, 2016]);
    expect(evaluateFilmChoice(timeline, ['Lejonkungen', 'Frost', 'Shrek', 'Coco'], 0, card).correct).toBe(false);
  });
});
