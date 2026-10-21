import { describe, expect, it } from 'vitest';
import films from '../data/films.json';
import songs from '../data/songs.json';
import type { Song } from './game';
import { decadeOf, decadesIn, filterSongs, hasEnoughSongs, SONG_TAGS, songsNeeded, toSongFilter } from './library';

const list = songs as Song[];
const song = (year: number, tags?: Song['tags']): Song => ({ id: `s${year}${tags?.join('')}`, spotifyUri: '', title: 'T', artist: 'A', year, tags });

describe('låtbiblioteket', () => {
  it('har bara kända etiketter och unika id:n', () => {
    for (const s of list) for (const t of s.tags ?? []) expect(SONG_TAGS, s.id).toContain(t);
    expect(new Set(list.map((s) => s.id)).size).toBe(list.length);
  });

  it('har en filmlista där varje låt har en film, ett premiärår och ett unikt id', () => {
    const filmList = films as Song[];
    for (const s of filmList) {
      expect(s.film, s.id).toBeTruthy();
      expect(s.year, s.id).toBeGreaterThan(1900);
    }
    expect(new Set(filmList.map((s) => s.id)).size).toBe(filmList.length);
    // Det behövs gott om olika filmer för att alternativen ska räcka.
    expect(new Set(filmList.map((s) => s.film)).size).toBeGreaterThan(40);
  });

  it('räknar decennier', () => {
    expect(decadeOf(1999)).toBe(1990);
    expect(decadeOf(2000)).toBe(2000);
    expect(decadesIn([song(1975), song(1962), song(1979)])).toEqual([1960, 1970]);
  });
});

describe('urvalet', () => {
  const pool = [song(1965, ['rock']), song(1985, ['svenskt', 'rock']), song(1987, ['dans']), song(2015)];

  it('fyller i det som saknas i ett sparat urval', () => {
    expect(toSongFilter(undefined)).toEqual({ decades: [], tags: [] });
    expect(toSongFilter({ tags: [] })).toEqual({ decades: [], tags: [] });
    expect(toSongFilter({ decades: [1980] })).toEqual({ decades: [1980], tags: [] });
    expect(filterSongs(pool, { tags: [] } as never)).toHaveLength(4);
  });

  it('tar alla låtar när inget är valt', () => {
    expect(filterSongs(pool, undefined)).toHaveLength(4);
    expect(filterSongs(pool, { decades: [], tags: [] })).toHaveLength(4);
  });

  it('tar låtar från något av de valda decennierna', () => {
    expect(filterSongs(pool, { decades: [1980, 2010], tags: [] }).map((s) => s.year)).toEqual([1985, 1987, 2015]);
  });

  it('tar låtar med någon av de valda etiketterna, inom de valda decennierna', () => {
    expect(filterSongs(pool, { decades: [], tags: ['rock', 'dans'] }).map((s) => s.year)).toEqual([1965, 1985, 1987]);
    expect(filterSongs(pool, { decades: [1980], tags: ['rock'] }).map((s) => s.year)).toEqual([1985]);
    expect(filterSongs(pool, { decades: [1960], tags: ['svenskt'] })).toEqual([]);
  });

  it('kräver ett startkort per lag och minst ett kort till', () => {
    expect(hasEnoughSongs(5, 4)).toBe(true);
    expect(hasEnoughSongs(4, 4)).toBe(false);
  });

  it('uppskattar hur många låtar ett spel kan behöva', () => {
    expect(songsNeeded(4, 7)).toBe(52);
    expect(songsNeeded(10, 7)).toBe(130);
    expect(songsNeeded(0, 3)).toBe(5);
  });
});
