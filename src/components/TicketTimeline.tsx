import { Fragment } from 'react';
import { cardLines, type TimelineCard } from '../engine/game';
import { useT } from '../i18n/context';
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
  /** Fortsätt eller lås: kort i lagets svit som inte är inlåsta än. */
  riskIds?: readonly string[];
  /** Fortsätt eller lås: kort som just låstes in och stämplas. */
  stampedIds?: readonly string[];
};

/** Lagens tidslinje som en remsa biljettstubbar. Luckorna är perforeringarna mellan dem. */
export function TicketTimeline({
  cards,
  selectable = false,
  selectedSlot = null,
  onSelect,
  pendingText,
  highlightCardId,
  riskIds = [],
  stampedIds = [],
}: Props) {
  const { t } = useT();
  const slot = (index: number) => {
    const selected = selectedSlot === index;
    const label = slotLabel(cards, index, t.slots);
    if (selectable) {
      return selected ? (
        <button type="button" className="stub open" aria-pressed="true" aria-label={label} onClick={() => onSelect?.(index)}>
          <span className="stub-year">?</span>
          <span className="stub-text">{t.timeline.here(label)}</span>
        </button>
      ) : (
        <button type="button" className="perf perf-button" aria-pressed="false" aria-label={label} onClick={() => onSelect?.(index)}>
          <span className="perf-plus" aria-hidden="true" />
        </button>
      );
    }
    if (selected) {
      return (
        <div className="stub open theirs" aria-label={t.timeline.chosen(label)}>
          <span className="stub-year">?</span>
          <span className="stub-text">{pendingText ?? t.timeline.thinking}</span>
        </div>
      );
    }
    // Bara en perforering mellan två stubbar, inget att trycka på.
    return index > 0 && index < cards.length ? <div className="perf" aria-hidden="true" /> : null;
  };

  return (
    <ol className="tickets" aria-label={t.timeline.label}>
      {cards.map((card, i) => (
        <Fragment key={card.cardId}>
          <li className="tickets-slot">{slot(i)}</li>
          <li className={`stub${card.cardId === highlightCardId ? ' won' : ''}${riskIds.includes(card.cardId) ? ' at-risk' : ''}${stampedIds.includes(card.cardId) ? ' stamped' : ''}`}>
            <span className="stub-year">{card.year}</span>
            <span className="stub-text">
              <span className="stub-title">{cardLines(card).main}</span>
              <span className="stub-artist">{cardLines(card).sub}</span>
              {riskIds.includes(card.cardId) && <span className="stub-risk">{t.timeline.notLockedIn}</span>}
            </span>
            {card.imageUrl && <img className={`stub-art${card.film ? ' poster' : ''}`} src={card.imageUrl} alt="" loading="lazy" />}
          </li>
        </Fragment>
      ))}
      <li className="tickets-slot">{slot(cards.length)}</li>
    </ol>
  );
}
