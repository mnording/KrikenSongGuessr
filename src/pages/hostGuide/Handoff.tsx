import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import { ErrorText } from '../../components/Common';
import { login, parseClientId } from '../../spotify/auth';
import { errorMessage } from '../../util';
import { CopyField } from './CopyField';

/** Sista steget: in på telefonen som ska spela, med QR-kod från datorn eller direkt här. */
export function Handoff({ id, onEdit }: { id: string; onEdit: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [touch] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const heading = useRef<HTMLHeadingElement>(null);
  const link = `${window.location.origin}/host/guide?app=${id}`;

  // Formuläret som hade fokus försvann. Flytta fokus hit så att ingen börjar om från toppen.
  useEffect(() => heading.current?.focus(), []);

  const here = (
    <button
      type="button"
      className={touch ? 'primary big' : 'button'}
      onClick={() => login('/host?klar', id).catch((err) => setError(errorMessage(err)))}
    >
      {touch ? 'Logga in med Spotify' : 'Logga in här i stället'}
    </button>
  );
  const qr = (
    <div className="handoff-qr">
      <div className="qr">
        <QRCodeSVG value={link} size={176} marginSize={2} title="QR-kod som öppnar din Spotify-app i spelet" />
      </div>
      <p>{touch ? 'Ska du spela från en annan telefon? Skanna koden med den.' : 'Skanna med telefonen du ska spela från.'}</p>
      <CopyField text={link} label="Länk till telefonen" button="Kopiera länken" hideText />
    </div>
  );

  return (
    <div className="card-box handoff">
      <h2 ref={heading} tabIndex={-1}>
        {touch ? 'Sista steget: logga in' : 'Sista steget: öppna på telefonen'}
      </h2>
      <p>Logga in med samma Spotify-konto som skapade appen.</p>
      {touch ? (
        <>
          {here}
          {qr}
        </>
      ) : (
        <>
          {qr}
          <p className="muted">Spelar du från den här datorn?</p>
          {here}
        </>
      )}
      <ErrorText error={error} />
      <button type="button" className="link" onClick={onEdit}>
        Ändra Client ID
      </button>
    </div>
  );
}

/** Telefonen öppnade QR-koden från datorn. Ett tryck kvar. */
export function PhoneLogin({ id }: { id: string }) {
  const clientId = parseClientId(id);
  const [error, setError] = useState<string | null>(null);
  if (!clientId) {
    return (
      <div className="card-box notice">
        <h2>Länken är trasig</h2>
        <p>Skanna koden på datorn igen, eller gör stegen här nedanför.</p>
      </div>
    );
  }
  return (
    <div className="card-box handoff">
      <h2>Nästan klart: logga in på den här telefonen</h2>
      <p>
        Logga in med samma Spotify-konto som skapade appen. Använd bara en kod du själv har skapat, din app slutar på{' '}
        <b>{clientId.slice(-4)}</b>.
      </p>
      <button
        type="button"
        className="primary big"
        onClick={() => login('/host?klar', clientId).catch((err) => setError(errorMessage(err)))}
      >
        Logga in med Spotify
      </button>
      <ErrorText error={error} />
    </div>
  );
}
