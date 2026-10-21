import { describe, expect, it } from 'vitest';
import songs from '../data/songs.json';
import type { Song } from './game';
import { decadeOf, decadesIn, filterSongs, SONG_TAGS, songsNeeded } from './library';

const list = songs as Song[];
const song = (year: number, tags?: Song['tags']): Song => ({ id: `s${year}${tags?.join('')}`, spotifyUri: '', title: 'T', artist: 'A', year, tags });

describe('låtbiblioteket', () => {
  it('har bara kända etiketter och unika id:n', () => {
    for (const s of list) for (const t of s.tags ?? []) expect(SONG_TAGS, s.id).toContain(t);
    expect(new Set(list.map((s) => s.id)).size).toBe(list.length);
  });

  it('räknar decennier', () => {
    expect(decadeOf(1999)).toBe(1990);
    expect(decadeOf(2000)).toBe(2000);
    expect(decadesIn([song(1975), song(1962), song(1979)])).toEqual([1960, 1970]);
  });
});

describe('urvalet', () => {
  const pool = [song(1965, ['rock']), song(1985, ['svenskt', 'rock']), song(1987, ['dans']), song(2015)];

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

  it('uppskattar hur många låtar ett spel kan behöva', () => {
    expect(songsNeeded(4, 7)).toBe(52);
    expect(songsNeeded(10, 7)).toBe(130);
    expect(songsNeeded(0, 3)).toBe(5);
  });
});
