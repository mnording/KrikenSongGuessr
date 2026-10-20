import { useState, type FormEvent } from 'react';
import { getMascot, MASCOTS, type MascotId } from '../game/mascots';
import type { TeamLevel } from '../game/types';
import { LEVELS } from '../game/modes';
import { ChoiceCards } from './ChoiceCards';
import { MascotPin } from './Mascot';

type Props = {
  initialName?: string;
  initialMascot?: MascotId;
  takenMascots?: string[];
  /** Familj-läget: laget väljer nivå när det går med. */
  chooseLevel?: boolean;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (name: string, mascot: MascotId, level: TeamLevel) => void;
};

export function ProfileForm({
  initialName = '',
  initialMascot,
  takenMascots = [],
  chooseLevel = false,
  submitLabel,
  busy,
  onSubmit,
}: Props) {
  const firstFree = MASCOTS.find((m) => !takenMascots.includes(m.id))?.id ?? MASCOTS[0].id;
  const [name, setName] = useState(initialName);
  const [mascot, setMascot] = useState<MascotId>(initialMascot ?? firstFree);
  const [level, setLevel] = useState<TeamLevel>('hard');
  const chosen = getMascot(mascot)!;
  const valid = name.trim().length >= 1;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid && !busy) onSubmit(name, mascot, level);
  };

  return (
    <form className="card-box" onSubmit={submit}>
      <label htmlFor="team-name">Lagnamn</label>
      <input
        id="team-name"
        maxLength={24}
        autoComplete="off"
        placeholder="Till exempel Discokungarna"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <fieldset className="mascots" aria-describedby="mascot-intro">
        <legend>Maskot</legend>
        {MASCOTS.map((m) => {
          const taken = takenMascots.includes(m.id) && m.id !== initialMascot;
          const selected = mascot === m.id;
          return (
            <label key={m.id} className={`mascot-option${selected ? ' selected' : ''}${taken ? ' taken' : ''}`} title={m.name}>
              <input type="radio" name="mascot" value={m.id} checked={selected} disabled={taken} onChange={() => setMascot(m.id)} />
              <MascotPin mascot={m.id} mood={selected ? 'happy' : 'idle'} animate={selected} />
              <span className="visually-hidden">
                {m.name}
                {taken ? ' (tagen)' : ''}
              </span>
            </label>
          );
        })}
      </fieldset>
      <div id="mascot-intro" className="mascot-intro">
        <strong aria-live="polite">{chosen.name}</strong>
        <p>{chosen.backstory}</p>
      </div>
      {chooseLevel && <ChoiceCards legend="Nivå" name="level" options={LEVELS} value={level} onChange={setLevel} />}
      <button type="submit" className="primary" disabled={!valid || busy}>
        {submitLabel}
      </button>
    </form>
  );
}
