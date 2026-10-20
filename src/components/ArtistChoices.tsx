// De fyra artisterna i Familj-läget, som biljettremsor. Bokstäverna gör det lätt att ropa ut svaret.
import { useId } from 'react';
import { LETTERS } from '../game/modes';

type Props = {
  choices: string[];
  label: string;
  /** Lagets eget val, om det har valt. */
  selected: number | null;
  /** Rätt svar, när turen är avslöjad. */
  answer?: number | null;
  /** Saknas när valet är låst eller turen avslöjad. */
  onSelect?: (index: number) => void;
};

export function ArtistChoices({ choices, label, selected, answer = null, onSelect }: Props) {
  const headingId = useId();
  const revealed = answer !== null;
  return (
    <section className="choices" aria-labelledby={headingId}>
      <h2 id={headingId}>{label}</h2>
      <ul>
        {choices.map((artist, i) => {
          const picked = selected === i;
          const right = revealed && answer === i;
          const wrong = revealed && picked && !right;
          const className = `choice${picked ? ' selected' : ''}${right ? ' answer' : ''}${wrong ? ' missed' : ''}`;
          return (
            <li key={artist}>
              <button
                type="button"
                className={className}
                aria-pressed={onSelect ? picked : undefined}
                disabled={!onSelect}
                onClick={() => onSelect?.(i)}
              >
                <span className="choice-letter" aria-hidden="true">
                  {LETTERS[i]}
                </span>
                <span className="choice-name">{artist}</span>
                {right && <span className="choice-tag">Rätt svar</span>}
                {wrong && <span className="choice-tag">Ert val</span>}
                {picked && right && <span className="visually-hidden"> (ert val)</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
