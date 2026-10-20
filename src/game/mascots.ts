// Lagens maskotar. Varje maskot äger en av lagfärgerna, så att välja maskot också väljer färg.
import type { TeamDoc } from './types';

export const MASCOT_IDS = ['kalle', 'rickard', 'kicki', 'gunnar', 'bluesy', 'wilma', 'elvira', 'frasse', 'bosse', 'ulla'] as const;

export type MascotId = (typeof MASCOT_IDS)[number];

/** Hur maskoten mår just nu. Styr ansiktet och rörelsen. */
export type MascotMood = 'idle' | 'happy' | 'sad' | 'cheeky';

export type Mascot = {
  id: MascotId;
  name: string;
  color: string;
  backstory: string;
};

export const MASCOTS: Mascot[] = [
  {
    id: 'kalle',
    name: 'Kassett-Kalle',
    color: '#e11d48',
    backstory: 'Har varit intrasslad i samma band sedan 1987 och vägrar spola tillbaka.',
  },
  {
    id: 'rickard',
    name: 'Räven Rickard',
    color: '#f97316',
    backstory: 'En slug dansbandsräv som påstår att allt är från 1978.',
  },
  {
    id: 'kicki',
    name: 'Kycklingen Kicki',
    color: '#eab308',
    backstory: 'Kläcktes under en discokula och har inte slutat snurra sedan dess.',
  },
  {
    id: 'gunnar',
    name: 'Grodan Gunnar',
    color: '#22c55e',
    backstory: 'Basist i ett dammband. Kväker med i varje refräng.',
  },
  {
    id: 'bluesy',
    name: 'Bläckfisken Bluesy',
    color: '#14b8a6',
    backstory: 'Åtta armar, åtta trumpinnar och noll taktkänsla.',
  },
  {
    id: 'wilma',
    name: 'Valen Wilma',
    color: '#3b82f6',
    backstory: 'Sjunger powerballader som hörs tre hav bort.',
  },
  {
    id: 'elvira',
    name: 'Enhörningen Elvira',
    color: '#8b5cf6',
    backstory: 'Glamrocklegend med mer glitter än tidsuppfattning.',
  },
  {
    id: 'frasse',
    name: 'Flamingon Frasse',
    color: '#ec4899',
    backstory: 'Står på ett ben genom hela Melodifestivalfinalen.',
  },
  {
    id: 'bosse',
    name: 'Björnen Bosse',
    color: '#a16207',
    backstory: 'Går i ide hela 90-talet men kan varenda låt från 80-talet.',
  },
  {
    id: 'ulla',
    name: 'Ugglan Ulla',
    color: '#64748b',
    backstory: 'Nattugglan som kan alla årtal. Outhärdligt nöjd med sig själv.',
  },
];

export function getMascot(id: string | undefined | null): Mascot | undefined {
  return MASCOTS.find((m) => m.id === id);
}

/** Lag som gick med före maskotarna har bara en färg. */
export function teamMascot(team: Pick<TeamDoc, 'mascot'>): Mascot | undefined {
  return getMascot(team.mascot);
}
