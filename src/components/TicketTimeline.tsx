import { Fragment } from 'react';
import { cardLines, type TimelineCard } from '../engine/game';
import { slotLabel } from '../util';

type Props = {
  cards: TimelineCard[];
  /** Laget i tur kan trycka på perforeringarna. */
  selectable?: boolean;
  selectedSlot?: number | null;
  onSelect?: (slot: number) => void;
  /** Text i den öppna biljetten när någon annan har valt luckan. */
  pendingText?: string;
  /** Kortet som just lades in lyser. */
  highlightCardId?: string | null;
};

/** Lagens tidslinje som en remsa biljettstubbar. Luckorna är perforeringarna mellan dem. */
export function TicketTimeline({
  cards,
  selectable = false,
  selectedSlot = null,
  onSelect,
  pendingText = 'De funderar här…',
  highlightCardId,
}: Props) {
  const slot = (index: number) => {
    const selected = selectedSlot === index;
    const label = slotLabel(cards, index);
    if (selectable) {
      return selected ? (
        <button type="button" className="stub open" aria-pressed="true" aria-label={label} onClick={() => onSelect?.(index)}>
          <span className="stub-year">?</span>
          <span className="stub-text">Här – {label.toLowerCase()}</span>
        </button>
      ) : (
        <button type="button" className="perf perf-button" aria-pressed="false" aria-label={label} onClick={() => onSelect?.(index)}>
          <span className="perf-plus" aria-hidden="true" />
        </button>
      );
    }
    if (selected) {
      return (
        <div className="stub open theirs" aria-label={`Vald lucka: ${label}`}>
          <span className="stub-year">?</span>
          <span className="stub-text">{pendingText}</span>
        </div>
      );
    }
    // Bara en perforering mellan två stubbar, inget att trycka på.
    return index > 0 && index < cards.length ? <div className="perf" aria-hidden="true" /> : null;
  };

  return (
    <ol className="tickets" aria-label="Tidslinje">
      {cards.map((card, i) => (
        <Fragment key={card.cardId}>
          <li className="tickets-slot">{slot(i)}</li>
          <li className={`stub${card.cardId === highlightCardId ? ' won' : ''}`}>
            <span className="stub-year">{card.year}</span>
            <span className="stub-text">
              <span className="stub-title">{cardLines(card).main}</span>
              <span className="stub-artist">{cardLines(card).sub}</span>
            </span>
            {card.imageUrl && <img className={`stub-art${card.film ? ' poster' : ''}`} src={card.imageUrl} alt="" loading="lazy" />}
          </li>
        </Fragment>
      ))}
      <li className="tickets-slot">{slot(cards.length)}</li>
    </ol>
  );
}
