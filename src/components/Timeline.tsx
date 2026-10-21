import { Fragment } from 'react';
import { cardLines, type TimelineCard } from '../engine/game';
import { slotLabel } from '../util';

type Props = {
  cards: TimelineCard[];
  color: string;
  /** Laget i tur kan trycka på luckorna. */
  selectable?: boolean;
  selectedSlot?: number | null;
  onSelect?: (slot: number) => void;
  /** Kortet som just lades in markeras. */
  highlightCardId?: string | null;
  /** Fortsätt eller lås: kort i lagets svit som inte är inlåsta än. */
  riskIds?: readonly string[];
};

export function Timeline({ cards, color, selectable = false, selectedSlot = null, onSelect, highlightCardId, riskIds = [] }: Props) {
  const slot = (index: number) => {
    const selected = selectedSlot === index;
    if (selectable) {
      return (
        <button
          type="button"
          className={`slot slot-button${selected ? ' selected' : ''}`}
          style={selected ? { borderColor: color, background: `${color}22` } : undefined}
          aria-pressed={selected}
          aria-label={slotLabel(cards, index)}
          onClick={() => onSelect?.(index)}
        >
          {selected ? '? Här' : '+'}
        </button>
      );
    }
    if (selected) {
      return (
        <div className="slot selected" style={{ borderColor: color }} aria-label={`Vald lucka: ${slotLabel(cards, index)}`}>
          ?
        </div>
      );
    }
    return null;
  };

  return (
    <ol className="timeline" aria-label="Tidslinje">
      {cards.map((card, i) => (
        <Fragment key={card.cardId}>
          <li className="timeline-slot">{slot(i)}</li>
          <li
            className={`card${card.cardId === highlightCardId ? ' highlight' : ''}${riskIds.includes(card.cardId) ? ' at-risk' : ''}`}
            style={{ borderLeftColor: color }}
          >
            <span className="card-year">{card.year}</span>
            <span className="card-text">
              <span className="card-title">{cardLines(card).main}</span>
              <span className="card-artist">{cardLines(card).sub}</span>
              {riskIds.includes(card.cardId) && <span className="badge muted">Ej inlåst</span>}
            </span>
            {card.imageUrl && <img className="card-art" src={card.imageUrl} alt="" loading="lazy" />}
          </li>
        </Fragment>
      ))}
      <li className="timeline-slot">{slot(cards.length)}</li>
    </ol>
  );
}
