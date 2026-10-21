// Pikarna: färdiga och vänliga, så att inget behöver modereras. Varje maskot har också en egen replik.
import { getMascot } from './mascots';
import type { TeamDoc } from './types';

/** Så länge ett lag måste vänta mellan två pikar. Samma gräns står i firestore.rules. */
export const TAUNT_COOLDOWN_MS = 8_000;

/** Så länge en pik syns på skärmen. */
export const TAUNT_SHOWN_MS = 4_000;

export const TAUNTS = [
  { id: 'sakert', text: 'Säker på det? 😏' },
  { id: 'alla', text: 'Den här kan ju alla 🎵' },
  { id: 'ojoj', text: 'Oj oj oj 🫣' },
  { id: 'tick', text: 'Tick tack… ⏰' },
  { id: 'tittar', text: 'Vi tittar inte 🙈' },
  { id: 'snyggt', text: 'Snyggt! 👏' },
] as const;

/** Maskotens egen replik. */
export const SIGNATURE = 'signatur';

export const TAUNT_IDS = [...TAUNTS.map((t) => t.id), SIGNATURE];

/** Texten för en pik från ett visst lag, eller null om den inte finns. */
export function tauntText(id: string, team: Pick<TeamDoc, 'mascot'>): string | null {
  if (id === SIGNATURE) return getMascot(team.mascot)?.signature ?? null;
  return TAUNTS.find((t) => t.id === id)?.text ?? null;
}
