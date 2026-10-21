import { describe, expect, it } from 'vitest';
import { pickFilm, posterUrl, type TmdbResult } from './match';

const result = (id: number, title: string, date: string, extra: Partial<TmdbResult> = {}): TmdbResult => ({
  id,
  title,
  original_title: title,
  release_date: date,
  poster_path: `/p${id}.jpg`,
  popularity: 10,
  ...extra,
});

describe('TMDB-matchningen', () => {
  it('väljer filmen med rätt titel och år framför en remake', () => {
    const results = [
      result(1, 'Lejonkungen', '2019-07-12', { original_title: 'The Lion King', popularity: 90 }),
      result(2, 'Lejonkungen', '1994-06-15', { original_title: 'The Lion King', popularity: 50 }),
    ];
    expect(pickFilm(results, 'Lejonkungen', 1994)).toEqual({ id: 2, title: 'Lejonkungen', year: 1994, poster: '/p2.jpg' });
  });

  it('godtar originaltiteln när den svenska saknas', () => {
    const results = [result(3, 'Breakfast at Tiffany’s', '1961-10-05'), result(4, 'Något annat', '1961-01-01')];
    expect(pickFilm(results, "Breakfast at Tiffany's", 1961)?.id).toBe(3);
  });

  it('tar den populäraste när inget skiljer träffarna åt, och ger null utan träffar', () => {
    expect(pickFilm([result(5, 'A', '2000-01-01'), result(6, 'B', '2001-01-01', { popularity: 99 })], 'C')?.id).toBe(6);
    expect(pickFilm([], 'Frost', 2013)).toBeNull();
  });

  it('klarar träffar utan datum eller affisch', () => {
    expect(pickFilm([result(7, 'Frost', '', { poster_path: null })], 'Frost', 2013)).toEqual({ id: 7, title: 'Frost', year: null, poster: null });
  });

  it('bygger affischens adress', () => {
    expect(posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w185/abc.jpg');
  });
});
