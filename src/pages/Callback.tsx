import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorText, Screen } from '../components/Common';
import { handleCallback } from '../spotify/auth';
import { errorMessage } from '../util';

export default function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  // Koden går bara att byta en gång, även om StrictMode kör effekten två gånger.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    handleCallback(window.location.search)
      .then((returnTo) => navigate(returnTo, { replace: true }))
      .catch((err) => setError(errorMessage(err)));
  }, [navigate]);

  return (
    <Screen title="Spotify">
      {error ? (
        <>
          <ErrorText error={error} />
          <Link to="/host" className="button">
            Försök igen
          </Link>
        </>
      ) : (
        <p className="muted">Loggar in…</p>
      )}
    </Screen>
  );
}
