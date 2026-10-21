// Armbandet efter avslöjandet på lagens telefoner: Rätt eller Fel, och med Fortsätt eller lås frågan medan laget väljer.
import type { MascotMood } from './mascots';

export type ResultBand = {
  big: string;
  sub: string;
  mood: MascotMood;
  /** En fråga eller ett lagnamn: mindre text, så att den inte avstavas. */
  long: boolean;
};

type Input = {
  correct: boolean;
  /** Laget i tur får välja att fortsätta eller låsa in. */
  choosing: boolean;
  /** Lagets gällande val, om det har valt. */
  choice: 'continue' | 'lock' | null;
  /** Armbandet visas på lagets egen telefon. */
  mine: boolean;
  teamName: string;
  /** Kort som inte är inlåsta. */
  risk: number;
  /** Alla lagets kort, inlåsta eller inte. */
  total: number;
  /** Kort som laget tappade med felet. */
  lost: number;
};

export function resultBand({ correct, choosing, choice, mine, teamName, risk, total, lost }: Input): ResultBand {
  const who = mine ? 'Ni' : teamName;
  if (choosing) {
    const big = choice
      ? choice === 'continue'
        ? `${who} fortsätter!`
        : mine
          ? 'Inlåst!'
          : `${who} låser in!`
      : mine
        ? 'Fortsätt eller lås?'
        : `${who} väljer…`;
    const sub = choice === 'lock' ? `${total} kort är ${mine ? 'era' : 'deras'}` : `${risk} kort står på spel`;
    return { big, sub, mood: choice === 'lock' ? 'happy' : 'cheeky', long: big.length > 9 };
  }
  return {
    big: correct ? 'Rätt!' : 'Fel!',
    sub: `${who} ${correct ? 'fick kortet' : lost ? `missade och tappade ${lost} kort` : 'missade'}`,
    mood: correct ? 'happy' : 'sad',
    long: false,
  };
}
