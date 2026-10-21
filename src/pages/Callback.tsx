import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorText, Screen } from '../components/Common';
import { reportError } from '../sentry';
import { completeLogin } from '../spotify/auth';
import { errorMessage } from '../util';

export default function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // Koden går bara att byta en gång, även om StrictMode kör effekten två gånger.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    completeLogin(window.location.search)
      .then((path) => navigate(path, { replace: true }))
      .catch((err) => {
        reportError(err, 'spotify.login');
        setError(errorMessage(err));
      });
  }, [navigate]);

  return (
    <Screen title="Spotify">
      {error ? (
        <>
          <ErrorText error={error} />
          <Link to="/host" className="button">
            Försök igen
          </Link>
          <Link to="/host/guide" className="link">
            Hjälp med Spotify
          </Link>
        </>
      ) : (
        <p className="muted">Loggar in…</p>
      )}
    </Screen>
  );
}
