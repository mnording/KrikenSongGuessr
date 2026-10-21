// Spelledarens urval i lobbyn: vilka decennier och etiketter spelet drar låtar ur.
import { useState } from 'react';
import type { Song } from '../engine/game';
import { decadesIn, SONG_TAGS, songsNeeded, type SongFilter, type SongTag } from '../engine/library';
import { setSongFilter } from '../game/hostActions';
import type { GameDoc } from '../game/types';
import { errorMessage } from '../util';
import { ErrorText } from './Common';

const TAG_NAMES: Record<SongTag, string> = {
  svenskt: 'Svenskt',
  melodifestivalen: 'Melodifestivalen',
  dans: 'Dans',
  rock: 'Rock',
  hiphop: 'Hiphop',
};

const decadeName = (decade: number) => `${String(decade).slice(2)}-tal`;

type Props = {
  code: string;
  game: GameDoc;
  songs: Song[];
  /** Låtarna som urvalet ger just nu. */
  playable: Song[];
  teamCount: number;
};

export function SongPicker({ code, game, songs, playable, teamCount }: Props) {
  const [error, setError] = useState<string | null>(null);
  const filter: SongFilter = game.settings.songFilter ?? { decades: [], tags: [] };
  const needed = songsNeeded(teamCount, game.settings.targetLength);

  const save = (next: SongFilter) => {
    setError(null);
    setSongFilter(code, next).catch((err) => setError(`Kunde inte spara urvalet: ${errorMessage(err)}`));
  };
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <section className="setting songs-picker" aria-labelledby="songs-heading">
      <h2 id="songs-heading">Låtar</h2>
      <p className="muted small">Inget valt betyder alla. Väljer du flera räcker det att låten passar en av dem.</p>
      <div className="chips" role="group" aria-label="Decennier">
        {decadesIn(songs).map((d) => (
          <button
            key={d}
            type="button"
            className="chip"
            aria-pressed={filter.decades.includes(d)}
            onClick={() => save({ ...filter, decades: toggle(filter.decades, d) })}
          >
            {decadeName(d)}
          </button>
        ))}
      </div>
      <div className="chips" role="group" aria-label="Etiketter">
        {SONG_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            className="chip"
            aria-pressed={filter.tags.includes(t)}
            onClick={() => save({ ...filter, tags: toggle(filter.tags, t) })}
          >
            {TAG_NAMES[t]}
          </button>
        ))}
      </div>
      <p className="songs-count" role="status">
        {playable.length === songs.length ? `Alla ${songs.length} låtar` : `${playable.length} av ${songs.length} låtar`}
      </p>
      {playable.length <= teamCount ? (
        <p className="error">För få låtar för så många lag. Välj fler decennier eller etiketter.</p>
      ) : (
        playable.length < needed && (
          <p className="muted small">
            Kortleken kan ta slut: {teamCount} lag till {game.settings.targetLength} kort kan behöva runt {needed} låtar. Då
            vinner laget med flest kort.
          </p>
        )
      )}
      <ErrorText error={error} />
    </section>
  );
}
