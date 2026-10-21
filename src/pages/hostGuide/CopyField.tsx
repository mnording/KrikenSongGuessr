import { useId, useState } from 'react';

/** En adress att kopiera exakt, med synlig etikett. Utan text blir det bara knappen. */
export function CopyField({
  text,
  label,
  button = 'Kopiera',
  hideText = false,
}: {
  text: string;
  label: string;
  button?: string;
  hideText?: boolean;
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const labelId = useId();

  const copy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setStatus('copied');
        window.setTimeout(() => setStatus((s) => (s === 'copied' ? 'idle' : s)), 2500);
      })
      .catch(() => setStatus('failed'));
  };

  return (
    <div className="copy-field">
      {!hideText && (
        <span id={labelId} className="copy-label">
          {label}
        </span>
      )}
      <div className="copy-row">
        {!hideText && <code aria-describedby={labelId}>{text}</code>}
        {/* Fast etikett, så att skärmläsaren bara hör meddelandet nedanför en gång. */}
        <button type="button" className="button" onClick={copy} aria-label={button}>
          {status === 'copied' ? 'Kopierad' : button}
        </button>
      </div>
      <p className={status === 'failed' ? 'muted small' : 'visually-hidden'} role="status">
        {status === 'copied' && 'Kopierad'}
        {status === 'failed' &&
          (hideText
            ? 'Kunde inte kopiera. Skanna koden i stället.'
            : 'Kunde inte kopiera. Tryck på adressen, så markeras den, och kopiera för hand.')}
      </p>
    </div>
  );
}
