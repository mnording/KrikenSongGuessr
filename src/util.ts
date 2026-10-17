import type { TimelineCard } from './engine/game';

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Svensk genitiv: "Lags tur", men "Lars tur" och "Max tur". */
export function genitive(name: string): string {
  return /[sxz]$/i.test(name.trim()) ? name : `${name}s`;
}

/** Mörk eller vit text, den som syns bäst mot lagets färg. */
export function textOn(hex: string): string {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // Kontrast mot vitt (1.0) jämfört med mot --bg (#0f172a, luminans ~0.009).
  return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.059 ? '#fff' : '#0f172a';
}

/** Beskrivning av en lucka i tidslinjen, till exempel "Mellan 1966 och 1977". */
export function slotLabel(cards: TimelineCard[], index: number): string {
  const left = cards[index - 1];
  const right = cards[index];
  if (!left && !right) return 'Första kortet';
  if (!left) return `Före ${right.year}`;
  if (!right) return `Efter ${left.year}`;
  return `Mellan ${left.year} och ${right.year}`;
}

