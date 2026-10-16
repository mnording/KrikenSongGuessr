import { useState, type FormEvent } from 'react';
import { TEAM_COLORS } from '../game/types';

type Props = {
  initialName?: string;
  initialColor?: string;
  takenColors?: string[];
  submitLabel: string;
  busy?: boolean;
  onSubmit: (name: string, color: string) => void;
};

export function ProfileForm({ initialName = '', initialColor, takenColors = [], submitLabel, busy, onSubmit }: Props) {
  const firstFree = TEAM_COLORS.find((c) => !takenColors.includes(c.value))?.value ?? TEAM_COLORS[0].value;
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor ?? firstFree);
  const valid = name.trim().length >= 1;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid && !busy) onSubmit(name, color);
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
      <fieldset className="colors">
        <legend>Färg</legend>
        {TEAM_COLORS.map((c) => {
          const taken = takenColors.includes(c.value) && c.value !== initialColor;
          return (
            <label key={c.value} className={`color-option${color === c.value ? ' selected' : ''}`} title={c.name}>
              <input
                type="radio"
                name="color"
                value={c.value}
                checked={color === c.value}
                onChange={() => setColor(c.value)}
              />
              <span className="swatch" style={{ background: c.value }} aria-hidden="true">
                {taken ? '•' : ''}
              </span>
              <span className="visually-hidden">
                {c.name}
                {taken ? ' (tagen)' : ''}
              </span>
            </label>
          );
        })}
      </fieldset>
      <button type="submit" className="primary" disabled={!valid || busy}>
        {submitLabel}
      </button>
    </form>
  );
}
