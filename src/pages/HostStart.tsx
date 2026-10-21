import { getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ErrorText, Loading, Screen } from '../components/Common';
import { useSpotifyLoggedIn, useUser } from '../hooks/misc';
import { createGame, rememberedHostGame } from '../game/hostActions';
import { gameRef } from '../game/refs';
import type { GameDoc } from '../game/types';
import { login, logout, pendingOwnClientId } from '../spotify/auth';
import { errorMessage } from '../util';

export default function HostStart() {
  const navigate = useNavigate();
  // Spelledaren kom hit direkt efter att ha kopplat sin Spotify-app i guiden.
  const welcome = useSearchParams()[0].has('klar');
  const { user, error: authError } = useUser();
  const spotify = useSpotifyLoggedIn();
  const [previous, setPrevious] = useState<{ code: string; game: GameDoc } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(authError);

  // Erbjud att fortsätta det senaste spelet, om det finns kvar och är vårt.
  useEffect(() => {
    const code = rememberedHostGame();
    if (!user || !code) return;
    getDoc(gameRef(code))
      .then((snap) => {
        const game = snap.data() as GameDoc | undefined;
        if (game && game.hostUid === user.uid && game.status !== 'finished') setPrevious({ code, game });
      })
      .catch(() => {});
  }, [user]);

  if (!user) return authError ? <Screen><ErrorText error={authError} /></Screen> : <Loading />;

  if (!spotify) {
    return (
      <Screen title="Spelledare">
        {pendingOwnClientId() && (
          <div className="card-box notice">
            <h2>Inloggningen med din Spotify-app blev inte klar</h2>
            <p>
              <Link to="/host/guide#felsok" className="link">Se vad som brukar vara fel</Link>
            </p>
          </div>
        )}
        <p>Logga in med Spotify Premium. Musiken spelas från den här telefonen, så koppla gärna in en högtalare.</p>
        <button type="button" className="primary big" onClick={() => login('/host').catch((e) => setError(errorMessage(e)))}>
          Logga in med Spotify
        </button>
        <ErrorText error={error} />
        <p>
          <Link to="/host/guide" className="link">Första gången? Så blir du spelledare</Link>
        </p>
        <Link to="/" className="link">Tillbaka</Link>
      </Screen>
    );
  }

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const code = await createGame(user.uid);
      navigate(`/host/${code}`);
    } catch (err) {
      setError(`Kunde inte skapa spelet: ${errorMessage(err)}`);
      setBusy(false);
    }
  };

  return (
    <Screen title="Spelledare">
      {welcome && (
        <div className="card-box handoff">
          <h2>Klart, du är spelledare</h2>
          <p>Musiken spelas härifrån. Koppla in en högtalare, skapa ett spel och låt lagen skanna koden.</p>
        </div>
      )}
      {previous && (
        <div className="card-box">
          <h2>Pågående spel</h2>
          <p>
            Spel <strong>{previous.code}</strong> ({previous.game.status === 'lobby' ? 'i lobbyn' : 'pågår'})
          </p>
          <Link to={`/host/${previous.code}`} className="button primary">
            Fortsätt spelet
          </Link>
        </div>
      )}
      <button type="button" className={previous ? '' : 'primary big'} disabled={busy} onClick={create}>
        Skapa nytt spel
      </button>
      <ErrorText error={error} />
      <div className="footer-links">
        <Link to="/host/songs" className="link">Låtlistan</Link>
        <Link to="/host/songs?lista=film" className="link">Filmlåtarna</Link>
        <button type="button" className="link" onClick={logout}>Logga ut från Spotify</button>
      </div>
    </Screen>
  );
}
