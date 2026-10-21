import { useState, type FormEvent } from 'react';
import { MASCOTS, type MascotId } from '../game/mascots';
import type { TeamLevel } from '../game/types';
import { useT } from '../i18n/context';
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
  const { t } = useT();
  const firstFree = MASCOTS.find((m) => !takenMascots.includes(m.id))?.id ?? MASCOTS[0].id;
  const [name, setName] = useState(initialName);
  const [mascot, setMascot] = useState<MascotId>(initialMascot ?? firstFree);
  const [level, setLevel] = useState<TeamLevel>('hard');
  const chosen = t.mascots[mascot];
  const valid = name.trim().length >= 1;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid && !busy) onSubmit(name, mascot, level);
  };

  return (
    <form className="card-box" onSubmit={submit}>
      <label htmlFor="team-name">{t.profile.teamName}</label>
      <input
        id="team-name"
        maxLength={24}
        autoComplete="off"
        placeholder={t.profile.placeholder}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <fieldset className="mascots" aria-describedby="mascot-intro">
        <legend>{t.profile.mascot}</legend>
        {MASCOTS.map((m) => {
          const taken = takenMascots.includes(m.id) && m.id !== initialMascot;
          const selected = mascot === m.id;
          return (
            <label key={m.id} className={`mascot-option${selected ? ' selected' : ''}${taken ? ' taken' : ''}`} title={t.mascots[m.id].name}>
              <input type="radio" name="mascot" value={m.id} checked={selected} disabled={taken} onChange={() => setMascot(m.id)} />
              <MascotPin mascot={m.id} mood={selected ? 'happy' : 'idle'} animate={selected} />
              <span className="visually-hidden">
                {t.mascots[m.id].name}
                {taken ? ` ${t.profile.taken}` : ''}
              </span>
            </label>
          );
        })}
      </fieldset>
      <div id="mascot-intro" className="mascot-intro">
        <strong aria-live="polite">{chosen.name}</strong>
        <p>{chosen.backstory}</p>
      </div>
      {chooseLevel && <ChoiceCards legend={t.profile.level} name="level" options={t.levels} value={level} onChange={setLevel} />}
      <button type="submit" className="primary" disabled={!valid || busy}>
        {submitLabel}
      </button>
    </form>
  );
}
