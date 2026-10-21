import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Screen } from '../../components/Common';
import { DENIED_PARAM, forgetOwnClientId, ownClientId, pendingOwnClientId, redirectUri } from '../../spotify/auth';
import { PhoneLogin } from './Handoff';
import { Setup } from './Setup';

// Kriken-appen hos Spotify rymmer bara fem konton (Development Mode). Den här sidan låter en ny
// spelledare skapa en egen Spotify-app, helst på en dator, och föra över den till telefonen med en QR-kod.
export default function HostGuide() {
  const [params] = useSearchParams();
  const denied = params.get(DENIED_PARAM);
  const fromQr = params.get('app');
  // Ett försök med en egen app som inte kom tillbaka till spelet slutade troligen på Spotifys felsida.
  const stranded = !denied && !fromQr && pendingOwnClientId() !== null;
  const [troubleOpen, setTroubleOpen] = useState(
    () => denied === 'egen' || stranded || window.location.hash === '#felsok',
  );

  // Från /host med #felsok: React Router scrollar inte till ankare själv.
  useEffect(() => {
    if (window.location.hash === '#felsok') document.getElementById('felsok')?.scrollIntoView();
  }, []);

  return (
    <Screen title="Bli spelledare">
      {fromQr !== null ? (
        <PhoneLogin id={fromQr} />
      ) : (
        <p className="lead">
          Musiken spelas från din telefon med ditt Spotify Premium. Första gången kopplar du ihop Spotify med spelet.
          Det tar fem minuter och görs en gång.
        </p>
      )}

      {denied === 'kriken' && (
        <Notice title="Spotify känner inte igen ditt konto än">
          Kriken-appen har bara plats för några få konton. Koppla din egen Spotify-app här nedanför, så kan du spela
          direkt.
        </Notice>
      )}
      {denied === 'egen' && (
        <Notice title="Inloggningen med din app gick inte igenom">
          Logga in med samma Spotify-konto som skapade appen. Fler tips finns under{' '}
          <a href="#felsok" onClick={() => setTroubleOpen(true)}>Om det inte fungerar</a>.
        </Notice>
      )}
      {stranded && (
        <Notice title="Kom du tillbaka från ett fel hos Spotify?">
          Det är vanligt första gången och lätt att rätta. Läs under{' '}
          <a href="#felsok" onClick={() => setTroubleOpen(true)}>Om det inte fungerar</a>.
        </Notice>
      )}

      {fromQr === null && <Setup />}
      <Trouble open={troubleOpen} onToggle={setTroubleOpen} />
      <KrikenApp />
    </Screen>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card-box notice">
      <h2>{title}</h2>
      <p>{children}</p>
    </div>
  );
}

function Trouble({ open, onToggle }: { open: boolean; onToggle: (open: boolean) => void }) {
  return (
    <details className="trouble" id="felsok" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary>Om det inte fungerar</summary>
      <dl>
        <dt>Spotify visar INVALID_CLIENT: Invalid client</dt>
        <dd>Client ID är fel. Kopiera det igen i steg 5, och ta Client ID, inte Client secret.</dd>
        <dt>Spotify visar INVALID_CLIENT: Invalid redirect URI</dt>
        <dd>
          Adressen från steg 3 saknas eller skiljer sig. Öppna appen hos Spotify, tryck <b>Settings</b> och{' '}
          <b>Edit</b>, och klistra in den igen. Den ska vara exakt <code>{redirectUri()}</code>
        </dd>
        <dt>Spotify släpper inte in dig efter inloggningen</dt>
        <dd>
          Logga in med samma Spotify-konto som skapade appen. Vill du använda ett annat konto lägger du till det under{' '}
          <b>User Management</b> i appen.
        </dd>
        <dt>Musiken spelar inte</dt>
        <dd>
          Kontrollera att <b>Web Playback SDK</b> är ikryssad under <b>Settings</b> och <b>Edit</b>, och att kontot
          har Premium.
        </dd>
      </dl>
      <p className="muted">Gick du tillbaka från Spotifys sida? Inget är förstört. Rätta och försök igen.</p>
    </details>
  );
}

/** För de få som är tillagda i Kriken-appen, och för att lämna en egen app. */
function KrikenApp() {
  const [own, setOwn] = useState(ownClientId);
  return (
    <div className="kriken-app">
      {own ? (
        <p className="muted">
          Den här telefonen använder din egen Spotify-app.{' '}
          <button
            type="button"
            className="link"
            onClick={() => {
              forgetOwnClientId();
              setOwn(null);
            }}
          >
            Byt tillbaka till Kriken-appen och logga ut
          </button>
        </p>
      ) : (
        <p className="muted">
          Har Mattias redan lagt till dig i Kriken-appen? Då behövs inget av det här.{' '}
          <Link to="/host" className="link">
            Logga in direkt
          </Link>
        </p>
      )}
    </div>
  );
}
