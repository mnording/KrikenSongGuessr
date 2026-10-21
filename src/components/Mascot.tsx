// Maskotarna ritade som platt tryck: lagets färg, bläck och biljettpapper.
// Kropparna är fasta, ansiktet byts efter humöret.
import type { ReactNode } from 'react';
import { getMascot, type MascotId, type MascotMood } from '../game/mascots';

const INK = '#17122e';
const PAPER = '#f4f5f8';

const outline = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
const line = { ...outline, fill: 'none' } as const;

type Eye = { x: number; y: number };
type Mouth = { kind: 'mouth'; x: number; y: number; w: number; h: number } | { kind: 'beak'; x: number; y: number; s: number; fill: string };
/** dark: ögonen sitter på bläck, så slutna ögon och bryn ritas i papper. */
type FaceSpec = { eyes: [Eye, Eye]; r: number; mouth: Mouth; dark?: boolean };

function EyeShape({ x, y, r, mood, side, dark }: Eye & { r: number; mood: MascotMood; side: -1 | 1; dark?: boolean }) {
  const line = { ...outline, fill: 'none', stroke: dark ? PAPER : INK } as const;
  const closed = mood === 'happy' || (mood === 'cheeky' && side === -1);
  if (closed) {
    return <path d={`M${x - r * 0.85} ${y + r * 0.35} Q${x} ${y - r * 0.95} ${x + r * 0.85} ${y + r * 0.35}`} {...line} strokeWidth={3.5} />;
  }
  const look = mood === 'sad' ? { dx: 0, dy: r * 0.32 } : mood === 'cheeky' ? { dx: -r * 0.3, dy: 0 } : { dx: 0, dy: r * 0.12 };
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={PAPER} stroke={INK} strokeWidth={2.5} />
      <circle cx={x + look.dx} cy={y + look.dy} r={r * 0.52} fill={INK} />
      <circle cx={x + look.dx - r * 0.18} cy={y + look.dy - r * 0.2} r={r * 0.16} fill={PAPER} />
      {mood === 'sad' && (
        // Ledsna ögonbryn: den inre änden lyfts.
        <path d={`M${x + side * r} ${y - r * 1.2} L${x - side * r * 0.75} ${y - r * 1.65}`} {...line} />
      )}
      {mood === 'cheeky' && <path d={`M${x - r * 0.9} ${y - r * 1.55} Q${x} ${y - r * 2} ${x + r * 0.9} ${y - r * 1.45}`} {...line} />}
    </g>
  );
}

function MouthShape({ mouth, mood }: { mouth: Mouth; mood: MascotMood }) {
  if (mouth.kind === 'beak') {
    const { x, y, s, fill } = mouth;
    const stroke = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' } as const;
    if (mood === 'happy' || mood === 'cheeky') {
      return (
        <g>
          <path d={`M${x - s} ${y} L${x + s} ${y} L${x} ${y + s * 0.8}Z`} fill={fill} {...stroke} />
          {mood === 'cheeky' && <ellipse cx={x + s * 0.2} cy={y + s * 1.25} rx={s * 0.45} ry={s * 0.4} fill={PAPER} {...stroke} />}
          <path d={`M${x - s * 0.75} ${y + s * 1.05} L${x + s * 0.75} ${y + s * 1.05} L${x} ${y + s * 1.8}Z`} fill={fill} {...stroke} />
        </g>
      );
    }
    const tip = mood === 'sad' ? 1.7 : 1.3;
    return <path d={`M${x - s} ${y} L${x + s} ${y} L${x} ${y + s * tip}Z`} fill={fill} {...stroke} />;
  }
  const { x, y, w, h } = mouth;
  const l = x - w / 2;
  const r = x + w / 2;
  switch (mood) {
    case 'happy':
      return <path d={`M${l} ${y} Q${x} ${y + h * 2} ${r} ${y}Z`} fill={INK} stroke={INK} strokeWidth={2} strokeLinejoin="round" />;
    case 'sad':
      return <path d={`M${l} ${y + h * 0.5} Q${x} ${y - h * 0.3} ${r} ${y + h * 0.5}`} {...line} />;
    case 'cheeky':
      return (
        <g>
          <path d={`M${x} ${y + h * 0.35} q0 ${h * 0.9} ${w * 0.22} ${h * 0.9} q${w * 0.22} 0 ${w * 0.22} -${h * 0.9}`} fill={PAPER} stroke={INK} strokeWidth={2} />
          <path d={`M${l} ${y} Q${x} ${y + h * 0.9} ${r} ${y - h * 0.25}`} {...line} />
        </g>
      );
    default:
      return <path d={`M${l} ${y} Q${x} ${y + h * 0.8} ${r} ${y}`} {...line} />;
  }
}

function Face({ spec, mood }: { spec: FaceSpec; mood: MascotMood }) {
  const [left, right] = spec.eyes;
  return (
    <g>
      <EyeShape {...left} r={spec.r} mood={mood} side={-1} dark={spec.dark} />
      <EyeShape {...right} r={spec.r} mood={mood} side={1} dark={spec.dark} />
      <MouthShape mouth={spec.mouth} mood={mood} />
      {mood === 'sad' && (
        <path
          d={`M${right.x + spec.r * 0.7} ${right.y + spec.r * 1.15} q-${spec.r * 0.4} ${spec.r * 0.55} 0 ${spec.r * 0.8} q${spec.r * 0.4} -${spec.r * 0.25} 0 -${spec.r * 0.8}Z`}
          fill={PAPER}
          stroke={INK}
          strokeWidth={1.5}
        />
      )}
    </g>
  );
}

/** En fyruddig glimt, Elviras glitter. */
const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s} Q${x} ${y} ${x + s} ${y} Q${x} ${y} ${x} ${y + s} Q${x} ${y} ${x - s} ${y} Q${x} ${y} ${x} ${y - s}Z`;

type Art = { body: (c: string) => ReactNode; face: FaceSpec };

const ART: Record<MascotId, Art> = {
  kalle: {
    body: (c) => (
      <>
        <path d="M44 84 C40 92 30 88 33 95 C36 100 50 99 47 91" {...line} strokeWidth={2.2} />
        <rect x={8} y={18} width={84} height={66} rx={8} fill={c} {...outline} />
        <rect x={16} y={25} width={68} height={13} rx={2} fill={PAPER} stroke={INK} strokeWidth={2} />
        <path d="M22 31.5 H60" {...line} strokeWidth={2} />
        <rect x={22} y={43} width={56} height={22} rx={11} fill={INK} />
        <circle cx={13} cy={79} r={1.8} fill={INK} />
        <circle cx={87} cy={79} r={1.8} fill={INK} />
      </>
    ),
    face: { eyes: [{ x: 37, y: 54 }, { x: 63, y: 54 }], r: 8, mouth: { kind: 'mouth', x: 50, y: 72, w: 13, h: 6 }, dark: true },
  },
  rickard: {
    body: (c) => (
      <>
        <path d="M22 46 L26 8 L48 30Z" fill={c} {...outline} />
        <path d="M78 46 L74 8 L52 30Z" fill={c} {...outline} />
        <path d="M28 34 L29 17 L40 28Z" fill={INK} />
        <path d="M72 34 L71 17 L60 28Z" fill={INK} />
        <path d="M14 48 Q14 24 50 24 Q86 24 86 48 Q86 66 68 80 L50 94 L32 80 Q14 66 14 48Z" fill={c} {...outline} />
        <path d="M22 58 Q38 55 50 64 Q62 55 78 58 Q72 76 50 94 Q28 76 22 58Z" fill={PAPER} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <ellipse cx={50} cy={67} rx={5.5} ry={3.8} fill={INK} />
      </>
    ),
    face: { eyes: [{ x: 36, y: 46 }, { x: 64, y: 46 }], r: 7, mouth: { kind: 'mouth', x: 50, y: 76, w: 12, h: 5 } },
  },
  kicki: {
    body: (c) => (
      <>
        <path d="M77 4 V11" {...line} strokeWidth={1.5} />
        <circle cx={77} cy={17} r={6} fill={PAPER} stroke={INK} strokeWidth={2} />
        <path d="M71 17 H83 M77 11 V23 M72.8 12.8 L81.2 21.2" {...line} strokeWidth={1.2} />
        <path d="M50 26 Q42 10 48 6 Q52 12 50 26 Q56 12 62 12 Q60 20 50 26Z" fill={c} {...outline} strokeWidth={2.5} />
        <path d="M40 90 V97 M36 97 H44 M60 90 V97 M56 97 H64" {...line} strokeWidth={2.5} />
        <circle cx={50} cy={58} r={34} fill={c} {...outline} />
        <path d="M17 60 Q8 70 19 78" {...line} />
        <path d="M83 60 Q92 70 81 78" {...line} />
      </>
    ),
    face: { eyes: [{ x: 38, y: 52 }, { x: 62, y: 52 }], r: 7.5, mouth: { kind: 'beak', x: 50, y: 63, s: 6, fill: INK } },
  },
  gunnar: {
    body: (c) => (
      <>
        <circle cx={31} cy={34} r={15} fill={c} {...outline} />
        <circle cx={69} cy={34} r={15} fill={c} {...outline} />
        <ellipse cx={50} cy={62} rx={43} ry={28} fill={c} {...outline} />
        <circle cx={31} cy={34} r={13.4} fill={c} />
        <circle cx={69} cy={34} r={13.4} fill={c} />
        <circle cx={45} cy={56} r={1.7} fill={INK} />
        <circle cx={55} cy={56} r={1.7} fill={INK} />
        <circle cx={18} cy={64} r={2.4} fill={INK} />
        <circle cx={23} cy={72} r={1.6} fill={INK} />
        <circle cx={82} cy={64} r={2.4} fill={INK} />
        <circle cx={77} cy={72} r={1.6} fill={INK} />
      </>
    ),
    face: { eyes: [{ x: 31, y: 33 }, { x: 69, y: 33 }], r: 9, mouth: { kind: 'mouth', x: 50, y: 67, w: 34, h: 7 } },
  },
  bluesy: {
    body: (c) => {
      const arms = ['M28 64 Q16 76 22 86 Q26 94 16 95', 'M42 70 Q38 84 44 95', 'M58 70 Q62 84 56 95', 'M72 64 Q84 76 78 86 Q74 94 84 95'];
      return (
        <>
          <path d="M17 93 L10 70 M83 93 L90 70" {...line} />
          <circle cx={10} cy={70} r={2.8} fill={PAPER} stroke={INK} strokeWidth={1.8} />
          <circle cx={90} cy={70} r={2.8} fill={PAPER} stroke={INK} strokeWidth={1.8} />
          {arms.map((d) => (
            <path key={d} d={d} fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" />
          ))}
          {arms.map((d) => (
            <path key={d} d={d} fill="none" stroke={c} strokeWidth={6.5} strokeLinecap="round" />
          ))}
          <path d="M18 64 Q12 12 50 12 Q88 12 82 64 Q66 74 50 72 Q34 74 18 64Z" fill={c} {...outline} />
          <circle cx={27} cy={33} r={3} fill={PAPER} />
          <circle cx={72} cy={28} r={2.6} fill={PAPER} />
          <circle cx={64} cy={21} r={1.8} fill={PAPER} />
        </>
      );
    },
    face: { eyes: [{ x: 39, y: 43 }, { x: 61, y: 43 }], r: 8, mouth: { kind: 'mouth', x: 50, y: 58, w: 12, h: 5 } },
  },
  wilma: {
    body: (c) => (
      <>
        <ellipse cx={36} cy={21} rx={4.6} ry={3.6} transform="rotate(-20 36 21)" fill={INK} />
        <path d="M40 20 V5 Q48 6 50 13" {...line} strokeWidth={2.5} />
        <circle cx={26} cy={18} r={2.2} fill={PAPER} stroke={INK} strokeWidth={1.5} />
        <circle cx={56} cy={22} r={1.8} fill={PAPER} stroke={INK} strokeWidth={1.5} />
        <path
          d="M8 62 Q8 30 46 30 Q76 30 80 52 L87 38 Q96 33 96 44 Q96 54 86 60 Q95 64 94 74 Q90 82 82 76 L79 70 Q70 86 44 86 Q8 86 8 62Z"
          fill={c}
          {...outline}
        />
        <path d="M11 69 Q42 75 76 68 Q66 86 44 86 Q20 86 11 69Z" fill={PAPER} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M24 78 Q42 81 62 77" {...line} strokeWidth={1.5} />
      </>
    ),
    face: { eyes: [{ x: 30, y: 50 }, { x: 52, y: 50 }], r: 7, mouth: { kind: 'mouth', x: 41, y: 62, w: 14, h: 4 } },
  },
  elvira: {
    body: (c) => (
      <>
        <path d="M32 24 Q12 30 18 48 Q6 58 16 70 Q8 82 22 88 L30 56Z" fill={INK} />
        <path d="M30 32 L27 12 L43 25Z" fill={c} {...outline} />
        <path d="M70 32 L73 12 L57 25Z" fill={c} {...outline} />
        <path d="M26 42 Q26 22 50 22 Q74 22 74 42 L76 72 Q76 93 50 93 Q24 93 24 72Z" fill={c} {...outline} />
        <path d="M44 25 L50 1 L56 25Z" fill={PAPER} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M46 18 L54 15.5 M47.6 11 L52.4 9.4" {...line} strokeWidth={1.5} />
        <ellipse cx={50} cy={78} rx={20} ry={13} fill={PAPER} stroke={INK} strokeWidth={2.5} />
        <circle cx={43} cy={74} r={1.8} fill={INK} />
        <circle cx={57} cy={74} r={1.8} fill={INK} />
        <path d={sparkle(86, 24, 7)} fill={PAPER} stroke={INK} strokeWidth={1.5} />
        <path d={sparkle(89, 46, 4)} fill={PAPER} stroke={INK} strokeWidth={1.2} />
        <path d={sparkle(21, 13, 4)} fill={PAPER} stroke={INK} strokeWidth={1.2} />
      </>
    ),
    face: { eyes: [{ x: 39, y: 50 }, { x: 61, y: 50 }], r: 7.5, mouth: { kind: 'mouth', x: 50, y: 81, w: 12, h: 4 } },
  },
  frasse: {
    body: (c) => (
      <>
        <path d="M40 62 Q30 80 46 99" fill="none" stroke={INK} strokeWidth={17} strokeLinecap="round" />
        <path d="M40 62 Q30 80 46 99" fill="none" stroke={c} strokeWidth={11} strokeLinecap="round" />
        <path d="M46 16 Q38 4 47 3 Q46 9 52 14Z" fill={c} {...outline} strokeWidth={2.5} />
        <path d="M54 16 Q58 5 66 9 Q60 11 58 17Z" fill={c} {...outline} strokeWidth={2.5} />
        <circle cx={48} cy={42} r={28} fill={c} {...outline} />
        <circle cx={30} cy={52} r={3.5} fill={PAPER} opacity={0.55} />
        <circle cx={66} cy={52} r={3.5} fill={PAPER} opacity={0.55} />
      </>
    ),
    face: { eyes: [{ x: 38, y: 36 }, { x: 58, y: 36 }], r: 7.5, mouth: { kind: 'beak', x: 48, y: 47, s: 7, fill: PAPER } },
  },
  bosse: {
    body: (c) => (
      <>
        <circle cx={24} cy={27} r={12} fill={c} {...outline} />
        <circle cx={76} cy={27} r={12} fill={c} {...outline} />
        <circle cx={24} cy={27} r={5.5} fill={PAPER} />
        <circle cx={76} cy={27} r={5.5} fill={PAPER} />
        <circle cx={50} cy={57} r={36} fill={c} {...outline} />
        <path d="M17 43 Q50 27 83 43 L84 51 Q50 35 16 51Z" fill={PAPER} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
        <path d="M17 47 Q50 31 83.5 47" fill="none" stroke={c} strokeWidth={2.5} />
        <ellipse cx={50} cy={76} rx={15} ry={11} fill={PAPER} stroke={INK} strokeWidth={2.5} />
        <ellipse cx={50} cy={70} rx={5.5} ry={3.6} fill={INK} />
      </>
    ),
    face: { eyes: [{ x: 37, y: 60 }, { x: 63, y: 60 }], r: 7, mouth: { kind: 'mouth', x: 50, y: 78, w: 10, h: 3.5 } },
  },
  ulla: {
    body: (c) => (
      <>
        <path d="M18 32 L22 8 L38 22 Q50 18 62 22 L78 8 L82 32 Q91 60 77 82 Q65 96 50 96 Q35 96 23 82 Q9 60 18 32Z" fill={c} {...outline} />
        <ellipse cx={50} cy={76} rx={20} ry={17} fill={PAPER} stroke={INK} strokeWidth={2} />
        <path d="M38 72 q4 4 8 0 q4 4 8 0 q4 4 8 0 M42 81 q4 4 8 0 q4 4 8 0" {...line} strokeWidth={1.6} />
        <circle cx={36} cy={42} r={14} fill={PAPER} stroke={INK} strokeWidth={2.5} />
        <circle cx={64} cy={42} r={14} fill={PAPER} stroke={INK} strokeWidth={2.5} />
      </>
    ),
    face: { eyes: [{ x: 36, y: 42 }, { x: 64, y: 42 }], r: 8.5, mouth: { kind: 'beak', x: 50, y: 51, s: 5, fill: INK } },
  },
};

type Props = {
  mascot: string | undefined | null;
  mood?: MascotMood;
  /** Spelar humörets rörelse. Utan den står maskoten still. */
  animate?: boolean;
  className?: string;
};

/** Maskoten på sin pappersknapp. Dekorativ: lagets namn står alltid bredvid. */
export function MascotPin({ mascot: id, mood = 'idle', animate = false, className = '' }: Props) {
  const mascot = getMascot(id);
  if (!mascot) return null;
  const art = ART[mascot.id];
  return (
    <span className={`mascot-pin${animate ? ' animate' : ''} ${className}`} data-mood={mood} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="mascot-art">
        {art.body(mascot.color)}
        <Face spec={art.face} mood={mood} />
      </svg>
    </span>
  );
}
