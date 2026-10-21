// Pikar och reaktioner: färdiga och vänliga, så att inget behöver modereras.
// Pikar skickas medan ett lag gissar, reaktioner efter avslöjandet. Båda delar samma spärr.
import { getMascot, type MascotMood } from './mascots';
import type { TeamDoc } from './types';

/** Så länge ett lag måste vänta mellan två pikar eller reaktioner. Samma gräns står i firestore.rules. */
export const TAUNT_COOLDOWN_MS = 8_000;

/** Så länge en pik syns: längre för längre text, så att den hinner läsas i ett stökigt rum. */
export function tauntShownMs(text: string): number {
  return Math.min(7_000, 3_000 + text.length * 60);
}

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

/** Pikarna som går att skicka medan ett annat lag gissar. */
export const TAUNT_IDS = [...TAUNTS.map((t) => t.id), SIGNATURE];

/**
 * Vem som reagerar på vad efter avslöjandet:
 * de andra lagen gratulerar vid rätt och retas vid fel, laget självt tackar eller lovar revansch.
 */
export type ReactionKind = 'cheer' | 'tease' | 'thanks' | 'comeback';

export const REACTIONS: { id: string; text: string; kind: ReactionKind }[] = [
  { id: 'grattis', text: 'Grattis! 🎉', kind: 'cheer' },
  { id: 'proffs', text: 'Proffs! 🏆', kind: 'cheer' },
  { id: 'starkt', text: 'Starkt jobbat! 👏', kind: 'cheer' },
  { id: 'ojda', text: 'Oj då! 😅', kind: 'tease' },
  { id: 'klurig', text: 'Den var klurig! 🤔', kind: 'tease' },
  { id: 'nasta', text: 'Bättre lycka nästa gång 💪', kind: 'tease' },
  { id: 'tack', text: 'Tack, tack! 🙇', kind: 'thanks' },
  { id: 'latt', text: 'Lätt som en plätt 😎', kind: 'thanks' },
  { id: 'vanta', text: 'Vänta bara! 😤', kind: 'comeback' },
  { id: 'nastavar', text: 'Nästa är vår! 🔥', kind: 'comeback' },
];

export const REACTION_IDS = REACTIONS.map((r) => r.id);

/** Fortsätt eller lås: de andra lagen hetsar laget som väljer, åt båda hållen. */
export const DECISION_TAUNTS = [
  { id: 'fortsatt', text: 'Fortsätt, fegisar! 🐔' },
  { id: 'lasin', text: 'Lås in nu! 🔒' },
  { id: 'vagar', text: 'Ni vågar inte! 😏' },
  { id: 'girig', text: 'Inte för girig nu… 🤑' },
] as const;

export const DECISION_IDS: string[] = DECISION_TAUNTS.map((t) => t.id);

/** Vilka reaktioner ett lag får välja bland efter avslöjandet. */
export function reactionKind(isResultTeam: boolean, correct: boolean): ReactionKind {
  if (isResultTeam) return correct ? 'thanks' : 'comeback';
  return correct ? 'cheer' : 'tease';
}

/** Maskotens humör på lappen: glad när man gratulerar eller tackar, annars kaxig. */
export function tauntMood(id: string): MascotMood {
  const kind = REACTIONS.find((r) => r.id === id)?.kind;
  return kind === 'cheer' || kind === 'thanks' ? 'happy' : 'cheeky';
}

export const isReaction = (id: string) => REACTION_IDS.includes(id);

/** Texten för en pik eller reaktion från ett visst lag, eller null om den inte finns. */
export function tauntText(id: string, team: Pick<TeamDoc, 'mascot'>): string | null {
  if (id === SIGNATURE) return getMascot(team.mascot)?.signature ?? null;
  return (
    TAUNTS.find((t) => t.id === id)?.text ??
    REACTIONS.find((r) => r.id === id)?.text ??
    DECISION_TAUNTS.find((t) => t.id === id)?.text ??
    null
  );
}
