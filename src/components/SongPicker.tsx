// Spelledarens urval i lobbyn: vilka decennier och etiketter spelet drar låtar ur.
import { useState } from 'react';
import type { Song } from '../engine/game';
import { decadesIn, hasEnoughSongs, SONG_TAGS, songsNeeded, type SongFilter, type SongTag } from '../engine/library';
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

/** 60-tal … 90-tal, men 2000-tal och 2010-tal så att de inte blandas ihop med 1900-talet. */
const decadeName = (decade: number) => (decade >= 2000 ? `${decade}-tal` : `${String(decade).slice(2)}-tal`);

type Props = {
  code: string;
  game: GameDoc;
  songs: Song[];
  /** Låtarna som urvalet ger just nu. */
  playable: Song[];
  teamCount: number;
  /** Filmlistan har inga etiketter. */
  showTags?: boolean;
};

export function SongPicker({ code, game, songs, playable, teamCount, showTags = true }: Props) {
  const [error, setError] = useState<string | null>(null);
  // Valet visas direkt och sparas sedan. Spelledaren är ensam om att skriva, så två snabba tryck
  // ska inte vänta på varandras svar från Firestore.
  const [filter, setFilter] = useState<SongFilter>(game.settings.songFilter ?? { decades: [], tags: [] });
  const needed = songsNeeded(teamCount, game.settings.targetLength);

  const save = (choice: SongFilter) => {
    // Utan etiketter (Film) sparas inga gamla etiketter tillbaka.
    const next = showTags ? choice : { ...choice, tags: [] };
    setFilter(next);
    setError(null);
    setSongFilter(code, next).catch((err) => setError(`Kunde inte spara urvalet: ${errorMessage(err)}`));
  };
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <section className="setting songs-picker" aria-labelledby="songs-heading">
      <h2 id="songs-heading">{showTags ? 'Låtar' : 'Filmlåtar'}</h2>
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
      {showTags && (
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
      )}
      <div aria-live="polite">
        <p className="songs-count">
          {playable.length === songs.length ? `Alla ${songs.length} låtar` : `${playable.length} av ${songs.length} låtar`}
        </p>
        {!hasEnoughSongs(playable.length, teamCount) ? (
          <p className="error">
            Bara {playable.length} låtar för {teamCount} lag. Varje lag behöver ett startkort och det behövs fler att spela.
            Välj fler decennier eller etiketter.
          </p>
        ) : (
          playable.length < needed && (
            <p className="muted small">
              Kortleken kan ta slut: {teamCount} lag till {game.settings.targetLength} kort kan behöva runt {needed} låtar. Då
              vinner laget med flest kort.
            </p>
          )
        )}
      </div>
      <ErrorText error={error} />
    </section>
  );
}
