import { Fragment } from 'react';
import type { TimelineCard } from '../engine/game';

type Props = {
  cards: TimelineCard[];
  color: string;
  /** Laget i tur kan trycka på luckorna. */
  selectable?: boolean;
  selectedSlot?: number | null;
  onSelect?: (slot: number) => void;
  /** Kortet som just lades in markeras. */
  highlightCardId?: string | null;
};

export function Timeline({ cards, color, selectable = false, selectedSlot = null, onSelect, highlightCardId }: Props) {
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
            className={`card${card.cardId === highlightCardId ? ' highlight' : ''}`}
            style={{ borderLeftColor: color }}
          >
            <span className="card-year">{card.year}</span>
            <span className="card-text">
              <span className="card-title">{card.title}</span>
              <span className="card-artist">{card.artist}</span>
            </span>
          </li>
        </Fragment>
      ))}
      <li className="timeline-slot">{slot(cards.length)}</li>
    </ol>
  );
}

function slotLabel(cards: TimelineCard[], index: number): string {
  const left = cards[index - 1];
  const right = cards[index];
  if (!left && !right) return 'Första kortet';
  if (!left) return `Före ${right.year}`;
  if (!right) return `Efter ${left.year}`;
  return `Mellan ${left.year} och ${right.year}`;
}

