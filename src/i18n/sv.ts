// Lagens texter på svenska. Svenskan är facit: de andra språken måste ha samma nycklar.
// **fet** i en text blir fetstil, se Rich.
import { MASCOTS, type MascotId } from '../game/mascots';
import { LEVELS, SV_CHOICE_TEXTS, type CardOption } from '../game/modes';
import { SV_BAND } from '../game/resultBand';
import { SV_TAUNT_TEXTS } from '../game/taunts';
import type { TeamLevel } from '../game/types';
import { genitive, SV_SLOTS } from '../util';

export type MascotTexts = Record<MascotId, { name: string; backstory: string }>;

export const sv = {
  langName: 'Svenska',
  language: 'Språk',
  loading: 'Laddar…',
  back: 'Tillbaka',
  join: 'Gå med',
  close: 'Stäng',

  home: {
    lead: 'Lyssna på låten och lägg den rätt i er tidslinje. Först till sju kort vinner.',
    joinTitle: 'Gå med i ett spel',
    codeLabel: 'Spelkod',
    hostTitle: 'Spelledare',
    hostText: 'Du behöver Spotify Premium. Musiken spelas från din telefon.',
    createGame: 'Skapa spel',
  },

  joinPage: {
    title: (code: string) => `Gå med i spel ${code}`,
    notFoundTitle: 'Hittade inget spel',
    notFound: (code: string) => `Det finns inget spel med koden ${code}. Kontrollera koden med spelledaren.`,
    hostTitle: 'Du är spelledare',
    hostText: 'Spelledaren kan inte vara med som lag, eftersom hen ser svaren.',
    toHost: 'Till spelledarvyn',
    startedTitle: 'Spelet har startat',
    started: 'Det går inte att gå med efter att spelet startat. Vänta till nästa omgång.',
    failed: (error: string) => `Kunde inte gå med: ${error}`,
  },

  profile: {
    teamName: 'Lagnamn',
    placeholder: 'Till exempel Discokungarna',
    mascot: 'Maskot',
    taken: '(tagen)',
    level: 'Nivå',
    save: 'Spara',
  },

  mascots: Object.fromEntries(MASCOTS.map((m) => [m.id, { name: m.name, backstory: m.backstory }])) as MascotTexts,
  levels: LEVELS as CardOption<TeamLevel>[],
  choices: SV_CHOICE_TEXTS,
  band: SV_BAND,
  taunts: SV_TAUNT_TEXTS,
  slots: SV_SLOTS,

  play: {
    gameGoneTitle: 'Spelet finns inte längre',
    toStart: 'Till startsidan',
    notInGameTitle: 'Du är inte med i spelet',
    notInGame: 'Spelledaren kan ha tagit bort ditt lag. Du kan gå med igen.',
    gameOver: 'Spelet är slut',
    sharedWin: 'Delad seger!',
    youWon: 'Ni vann! 🎉',
    won: (names: string[]) => `${names.join(' och ')} vann`,
    newRound: 'Spelledaren kan starta en ny omgång.',
    fullTitle: 'Spelet är fullt',
    full: (max: number) => `Högst ${max} lag får vara med.`,
    joined: 'Ni är med!',
    edit: 'Ändra',
    familyLevel: 'Familj-läget: välj nivå',
    filmHint: 'I Film-läget **gissar ni vilken film låten kommer från**. Det finns fyra att välja bland.',
    waitingStart: 'Väntar på att spelledaren startar spelet…',
    teams: (count: number) => `Lag (${count})`,
    teamsLabel: 'Lag',
    showTeam: 'Visa lagets tidslinje',
    offline: 'offline',
    cards: 'kort',
    notLockedIn: 'ej inlåsta',
    yourTurn: 'Er tur!',
    theirTurn: (name: string) => `${genitive(name)} tur`,
    waiting: 'Väntar…',
    theTeam: 'Laget',
    myTimeline: 'Er tidslinje',
    theirTimeline: (name: string) => `${genitive(name)} tidslinje`,
    lostCards: (count: number) => `${count} tappade kort`,
    reachedTarget: (target: number) => `Det är klart – ${target} kort!`,
    decideHint: (risk: number) =>
      `**Lås in** så blir ${risk === 1 ? 'kortet ert' : 'korten era'} och turen går vidare. **Fortsätt** så kommer en låt till.`,
    eggHint: 'Hetsa dem åt något håll!',
    waitingNext: 'Väntar på nästa tur…',
    lockedFast: 'Låst! Svaret visas om några sekunder.',
    lockedHost: 'Låst! Väntar på att spelledaren avslöjar.',
    chooseHint: (how: string) => `Lyssna och ${how}. **Tryck sedan Lås.**`,
    slotHint: 'Lyssna och tryck på luckan där låten passar. **Tryck sedan Lås.**',
    otherLocked: (name: string) => `${name} har låst. Väntar på avslöjandet.`,
    guessAlong: 'Lyssna och gissa med!',
    lockedHere: 'Låst här',
    lockFailed: (error: string) => `Kunde inte låsa: ${error}`,
    showOurs: 'Visa vår tidslinje',
    pickSlot: 'Välj en lucka',
    locking: 'Låser…',
    lock: 'Lås',
    tmdb: 'Filmaffischer från TMDB. Appen använder TMDB:s API men är inte godkänd eller certifierad av TMDB.',
    foot: (target: number, left: number) => `Först till ${target} kort vinner · ${left} kort kvar i leken`,
  },

  timeline: {
    label: 'Tidslinje',
    here: (slot: string) => `Här – ${slot.toLowerCase()}`,
    chosen: (slot: string) => `Vald lucka: ${slot}`,
    thinking: 'De funderar här…',
    notLockedIn: 'Ej inlåst',
  },

  family: {
    right: 'Ni gissade rätt!',
    wrong: 'Ni gissade fel den här gången.',
    failed: (error: string) => `Gissningen gick inte fram: ${error}`,
    guessing: (letter: string) => `Ni gissar på ${letter}. Ni kan ändra tills svaret visas. Det ger inga kort, bara ära.`,
    rightAnswer: 'Rätt svar',
    yourPick: 'Ert val',
    locked: 'Låst',
  },

  undo: {
    undo: 'Ångra',
    tooLate: 'För sent att ångra. Svaret visas strax.',
    timeUp: 'Ångra-tiden är slut. Svaret visas strax.',
  },

  streak: {
    lockIn: 'Lås in',
    keepGoing: 'Fortsätt',
    or: 'eller',
    banked: (risk: number) => (risk === 1 ? 'Kortet blir ert' : `${risk} kort blir era`),
    /** "båda" för två kort låter bättre än "alla 2". */
    loss: (risk: number) =>
      risk === 1 ? 'Fel svar: ni tappar kortet' : risk === 2 ? 'Fel svar: ni tappar båda' : `Fel svar: ni tappar alla ${risk}`,
    continuing: 'Ni fortsätter. Nästa låt kommer…',
    lockedIn: 'Ni låste in. Turen går vidare…',
    chipContinue: 'Fortsätter',
    chipLock: 'Inlåst',
    undoLabel: (action: string) => `Ångra: ${action.toLowerCase()}`,
    lastChoice: 'Sista valet, det går inte att ångra igen.',
    failed: (error: string) => `Det gick inte att välja: ${error}`,
    tooLate: 'För sent att ångra.',
    retry: 'Det gick inte. Försök igen.',
  },

  tauntDock: {
    notThrough: 'Det gick inte fram. Rundan kan ha gått vidare, eller så behöver ni vänta lite.',
    failed: (error: string) => `Piken gick inte fram: ${error}`,
    pickReaction: 'Välj en reaktion',
    pickTaunt: 'Välj en pik',
    reactAgain: (seconds: number) => `Reagera igen om ${seconds} s`,
    tauntAgain: (seconds: number) => `Pika igen om ${seconds} s`,
    egg: '😏 Hetsa dem',
    react: '🎉 Reagera',
    send: '😏 Skicka en pik',
    to: (name: string) => ` till ${name}`,
  },
};

export type Messages = typeof sv;
