// Kort med namn och en rad förklaring, för val av nivå (lagen) och spelläge (spelledaren).
import type { CardOption } from '../game/modes';

type Props<T extends string> = {
  legend: string;
  name: string;
  options: CardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function ChoiceCards<T extends string>({ legend, name, options, value, onChange, className = 'levels' }: Props<T>) {
  return (
    <fieldset className={className}>
      <legend>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={`level-option${value === o.value ? ' selected' : ''}`}>
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <strong>{o.name}</strong>
          <span>{o.text}</span>
        </label>
      ))}
    </fieldset>
  );
}
