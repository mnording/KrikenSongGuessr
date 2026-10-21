import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { parseClientId, redirectUri } from '../../spotify/auth';
import { readLocal, writeLocal } from '../../storage';
import { CopyField } from './CopyField';
import { Handoff } from './Handoff';

// Var spelledaren är i guiden och vilket Client ID som har klistrats in. Överlever att
// fliken laddas om medan spelledaren är hos Spotify. ID:t är inte hemligt.
const STEP_KEY = 'guide.step';
const DRAFT_KEY = 'guide.clientId';
const LAST_STEP = 4;

type Step = { title: string; body: ReactNode };

const STATUS = { done: 'klart', current: 'nu', todo: 'kommande' } as const;

/** Stegen i Spotifys dashboard, ett i taget, och sist överföringen till telefonen. */
export function Setup() {
  const [step, setStepState] = useState(() => Math.min(Number(readLocal(STEP_KEY)) || 0, LAST_STEP + 1));
  const [saved, setSaved] = useState(() => (step > LAST_STEP ? parseClientId(readLocal(DRAFT_KEY) ?? '') : null));
  const current = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  // Knappen som hade fokus försvinner när steget byts. Flytta fokus till det nya steget.
  useEffect(() => {
    if (moved.current) current.current?.focus();
  }, [step]);

  const setStep = (next: number) => {
    moved.current = true;
    setStepState(next);
    writeLocal(STEP_KEY, String(next));
  };
  const save = (id: string) => {
    writeLocal(DRAFT_KEY, id);
    setSaved(id);
    setStep(LAST_STEP + 1);
  };

  const steps: Step[] = [
    {
      title: 'Logga in hos Spotify for Developers',
      body: (
        <>
          <p>
            Använd kontot som har Premium. Första gången godkänner du villkoren, och Spotify kan be dig bekräfta din
            e-post. Kom sedan tillbaka till den här fliken.
          </p>
          <a href="https://developer.spotify.com/dashboard/create" target="_blank" rel="noreferrer" className="button">
            Öppna Spotify for Developers
            <span className="visually-hidden"> (öppnas i ny flik)</span>
          </a>
        </>
      ),
    },
    {
      title: 'Skapa en app',
      body: (
        <p>
          Tryck <b>Create app</b>. I <b>App name</b> och <b>App description</b> skriver du vad som helst, till exempel
          Kriken. <b>Website</b> lämnar du tom.
        </p>
      ),
    },
    {
      title: 'Lägg till adressen tillbaka hit',
      body: (
        <>
          <p>
            Klistra in adressen under <b>Redirect URIs</b> och tryck <b>Add</b>. Hit skickar Spotify dig efter
            inloggningen, så den måste stämma exakt.
          </p>
          <CopyField text={redirectUri()} label="Redirect URI" />
        </>
      ),
    },
    {
      title: 'Kryssa i två rutor och spara',
      body: (
        <p>
          Under <b>Which API/SDKs are you planning to use?</b> kryssar du i <b>Web API</b> och{' '}
          <b>Web Playback SDK</b>. Godkänn villkoren längst ner och tryck <b>Save</b>.
        </p>
      ),
    },
    {
      title: 'Kopiera Client ID',
      body: <ClientIdForm initial={readLocal(DRAFT_KEY) ?? ''} onSave={save} />,
    },
  ];

  return (
    <section aria-labelledby="setup-title">
      <h2 id="setup-title">Koppla din egen Spotify-app</h2>
      <p className="muted">
        Enklast på en dator. Spotifys sida är på engelska och ser teknisk ut, men du bygger inget: du fyller i ett
        formulär och kopierar en kod.
      </p>
      <ol className="checklist">
        {steps.map((s, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'todo';
          const status = <span className="visually-hidden"> ({STATUS[state]}, steg {i + 1} av {steps.length})</span>;
          return (
            <li key={s.title} className={state}>
              {state === 'done' ? (
                <button type="button" className="step-head" onClick={() => setStep(i)}>
                  <Check />
                  <span>{s.title}</span>
                  {status}
                </button>
              ) : (
                <h3 className="step-head" ref={state === 'current' ? current : undefined} tabIndex={state === 'current' ? -1 : undefined}>
                  <span className="step-number" aria-hidden="true">{i + 1}</span>
                  <span>{s.title}</span>
                  {status}
                </h3>
              )}
              {state === 'current' && (
                <div className="step-body">
                  {s.body}
                  {i < LAST_STEP && (
                    <button type="button" className="button step-done" onClick={() => setStep(i + 1)}>
                      Klart, nästa steg
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {saved && step > LAST_STEP && <Handoff id={saved} onEdit={() => setStep(LAST_STEP)} />}
    </section>
  );
}

function ClientIdForm({ initial, onSave }: { initial: string; onSave: (id: string) => void }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = parseClientId(value);
    if (id) onSave(id);
    else if (!value.trim()) setError('Klistra in ditt Client ID först.');
    else
      setError(
        'Det där ser inte ut som ett Client ID. Det är 32 tecken med siffror och bokstäverna a till f. Kopiera det igen från Basic Information på appens sida hos Spotify.',
      );
  };

  return (
    <form onSubmit={submit} noValidate>
      <p id={hintId}>
        På appens sida står <b>Client ID</b> under <b>Basic Information</b>. Ta inte <b>Client secret</b>, den ska
        vara hemlig och fungerar inte här.
      </p>
      <label htmlFor={inputId}>Client ID</label>
      <input
        id={inputId}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="32 tecken"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
      />
      {error && (
        <p id={errorId} className="error field-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="primary big">
        Spara
      </button>
    </form>
  );
}

function Check() {
  return (
    <svg className="step-check" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" />
      <path d="M7 12.5l3.2 3.2L17 9" />
    </svg>
  );
}
