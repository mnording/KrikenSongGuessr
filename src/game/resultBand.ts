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

/** Armbandets texter på ett språk. mine: armbandet visas på lagets egen telefon. */
export type BandTexts = {
  /** Laget i tur, innan det har valt. */
  ask: string;
  choosing: (name: string) => string;
  continues: (mine: boolean, name: string) => string;
  /** Laget i tur, när det har låst in. */
  lockedIn: string;
  locks: (name: string) => string;
  owned: (mine: boolean, total: number) => string;
  atStake: (risk: number) => string;
  right: string;
  wrong: string;
  got: (mine: boolean, name: string) => string;
  /** lost är 0 när laget inte hade några osäkrade kort. */
  missed: (mine: boolean, name: string, lost: number) => string;
};

const who = (mine: boolean, name: string) => (mine ? 'Ni' : name);

export const SV_BAND: BandTexts = {
  ask: 'Fortsätt eller lås?',
  choosing: (name) => `${name} väljer…`,
  continues: (mine, name) => `${who(mine, name)} fortsätter!`,
  lockedIn: 'Inlåst!',
  locks: (name) => `${name} låser in!`,
  owned: (mine, total) => `${total} kort är ${mine ? 'era' : 'deras'}`,
  atStake: (risk) => `${risk} kort står på spel`,
  right: 'Rätt!',
  wrong: 'Fel!',
  got: (mine, name) => `${who(mine, name)} fick kortet`,
  missed: (mine, name, lost) => `${who(mine, name)} ${lost ? `missade och tappade ${lost} kort` : 'missade'}`,
};

export function resultBand({ correct, choosing, choice, mine, teamName, risk, total, lost }: Input, m: BandTexts = SV_BAND): ResultBand {
  if (choosing) {
    const big = choice
      ? choice === 'continue'
        ? m.continues(mine, teamName)
        : mine
          ? m.lockedIn
          : m.locks(teamName)
      : mine
        ? m.ask
        : m.choosing(teamName);
    const sub = choice === 'lock' ? m.owned(mine, total) : m.atStake(risk);
    return { big, sub, mood: choice === 'lock' ? 'happy' : 'cheeky', long: big.length > 9 };
  }
  const big = correct ? m.right : m.wrong;
  return {
    big,
    sub: correct ? m.got(mine, teamName) : m.missed(mine, teamName, lost),
    mood: correct ? 'happy' : 'sad',
    // Rätt och Fel är korta på svenska, men inte på alla språk.
    long: big.length > 9,
  };
}
