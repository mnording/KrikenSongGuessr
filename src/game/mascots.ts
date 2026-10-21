// Lagens maskotar. Varje maskot äger en av lagfärgerna, så att välja maskot också väljer färg.

export const MASCOT_IDS = ['kalle', 'rickard', 'kicki', 'gunnar', 'bluesy', 'wilma', 'elvira', 'frasse', 'bosse', 'ulla'] as const;

export type MascotId = (typeof MASCOT_IDS)[number];

/** Hur maskoten mår just nu. Styr ansiktet och rörelsen. */
export type MascotMood = 'idle' | 'happy' | 'sad' | 'cheeky';

export type Mascot = {
  id: MascotId;
  name: string;
  color: string;
  backstory: string;
  /** Maskotens egen pik. */
  signature: string;
};

export const MASCOTS: Mascot[] = [
  {
    id: 'kalle',
    name: 'Kassett-Kalle',
    color: '#e11d48',
    backstory: 'Har varit intrasslad i samma band sedan 1987 och vägrar spola tillbaka.',
    signature: 'Spola tillbaka och försök igen! 📼',
  },
  {
    id: 'rickard',
    name: 'Räven Rickard',
    color: '#f97316',
    backstory: 'En slug dansbandsräv som påstår att allt är från 1978.',
    signature: 'Den är från 1978. Lita på mig. 🦊',
  },
  {
    id: 'kicki',
    name: 'Kycklingen Kicki',
    color: '#eab308',
    backstory: 'Kläcktes under en discokula och har inte slutat snurra sedan dess.',
    signature: 'Snurra ett varv till, så kommer ni på det! 🪩',
  },
  {
    id: 'gunnar',
    name: 'Grodan Gunnar',
    color: '#22c55e',
    backstory: 'Basist i ett dammband. Kväker med i varje refräng.',
    signature: 'Kvaaack… fel damm! 🐸',
  },
  {
    id: 'bluesy',
    name: 'Bläckfisken Bluesy',
    color: '#14b8a6',
    backstory: 'Åtta armar, åtta trumpinnar och noll taktkänsla.',
    signature: 'Åtta armar, och ni har inte en aning! 🐙',
  },
  {
    id: 'wilma',
    name: 'Valen Wilma',
    color: '#3b82f6',
    backstory: 'Sjunger powerballader som hörs tre hav bort.',
    signature: 'Det där hördes ända till Atlanten! 🐋',
  },
  {
    id: 'elvira',
    name: 'Enhörningen Elvira',
    color: '#8b5cf6',
    backstory: 'Glamrocklegend med mer glitter än tidsuppfattning.',
    signature: 'Mer glitter, mindre tvekan! ✨',
  },
  {
    id: 'frasse',
    name: 'Flamingon Frasse',
    color: '#ec4899',
    backstory: 'Står på ett ben genom hela Melodifestivalfinalen.',
    signature: 'Jag står på ett ben och vet ändå svaret 🦩',
  },
  {
    id: 'bosse',
    name: 'Björnen Bosse',
    color: '#a16207',
    backstory: 'Går i ide hela 90-talet men kan varenda låt från 80-talet.',
    signature: 'Väck mig när ni har bestämt er 🐻',
  },
  {
    id: 'ulla',
    name: 'Ugglan Ulla',
    color: '#64748b',
    backstory: 'Nattugglan som kan alla årtal. Outhärdligt nöjd med sig själv.',
    signature: 'Hoho… jag vet. Ni vet inte. 🦉',
  },
];

export function getMascot(id: string | undefined | null): Mascot | undefined {
  return MASCOTS.find((m) => m.id === id);
}