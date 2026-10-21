// Familj-läget på lagets skärm: de fyra artisterna, lagets val eller gissning, och hur det gick.
import { useState } from 'react';
import { guessArtist } from '../game/teamActions';
import { choiceTexts, LETTERS, showsChoices } from '../game/modes';
import type { GameDoc, Team } from '../game/types';
import { useT } from '../i18n/context';
import { errorMessage } from '../util';
import { ArtistChoices } from './ArtistChoices';
import { ErrorText } from './Common';
import { MascotPin } from './Mascot';

type Props = {
  code: string;
  game: GameDoc;
  me: Team;
  myTurn: boolean;
  /** Laget i tur är lätt och väljer artist. */
  byArtist: boolean;
  /** Det lätta lagets val: låst, eller valt men inte låst än. */
  pick: number | null;
  /** Finns bara medan det lätta laget kan välja. */
  onPick?: (index: number) => void;
};

export function FamilyRound({ code, game, me, myTurn, byArtist, pick, onPick }: Props) {
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  if (!showsChoices(game, myTurn, byArtist)) return null;

  const choices = game.choices!;
  const texts = choiceTexts(game, t.choices);
  const result = game.phase === 'revealed' ? game.lastResult : null;
  const myGuess = me.guess?.turnIndex === game.turnIndex ? me.guess.choice : null;
  const guessing = !myTurn && game.phase === 'placing';
  const own = myTurn ? (byArtist ? (result?.choice ?? pick) : null) : myGuess;
  const sideResult = result && result.teamUid !== me.uid && myGuess !== null && result.answer != null;
  const guessedRight = Boolean(sideResult && result!.answer === myGuess);

  const guess = (index: number) => {
    setError(null);
    guessArtist(code, me.uid, game.turnIndex, index).catch((err) => setError(t.family.failed(errorMessage(err))));
  };

  return (
    <>
      {sideResult && (
        <p className={`guess-result${guessedRight ? ' right' : ''}`} role="status">
          <MascotPin mascot={me.mascot} mood={guessedRight ? 'happy' : 'sad'} animate />
          {guessedRight ? t.family.right : t.family.wrong}
        </p>
      )}
      <ArtistChoices
        choices={choices}
        label={result ? texts.past : byArtist ? texts.ask : texts.guess}
        selected={own}
        answer={result ? (result.answer ?? null) : null}
        onSelect={onPick ?? (guessing ? guess : undefined)}
        locked={byArtist && !onPick && own !== null}
      />
      {guessing && myGuess !== null && (
        <p className="hint" role="status">
          {t.family.guessing(LETTERS[myGuess])}
        </p>
      )}
      <ErrorText error={error} />
    </>
  );
}
