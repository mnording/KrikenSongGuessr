import { getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { ErrorText, Loading, Screen } from '../components/Common';
import { ProfileForm } from '../components/ProfileForm';
import { useDoc } from '../hooks/firestore';
import { useUser } from '../hooks/misc';
import { gameRef, teamRef } from '../game/refs';
import { joinGame } from '../game/teamActions';
import type { MascotId } from '../game/mascots';
import { gameMode, type GameDoc, type TeamLevel } from '../game/types';
import { errorMessage } from '../util';

export default function Join() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { user, error: authError } = useUser();
  const game = useDoc<GameDoc>(user ? gameRef(code) : null);
  const [alreadyMember, setAlreadyMember] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Samma telefon är redan ett lag: gå direkt till spelet.
  useEffect(() => {
    if (!user || !game.data) return;
    getDoc(teamRef(code, user.uid))
      .then((snap) => setAlreadyMember(snap.exists()))
      .catch(() => setAlreadyMember(false));
  }, [user, code, game.data]);

  if (!/^\d{6}$/.test(code)) return <Navigate to="/" replace />;
  if (authError) return <Screen title="Gå med"><ErrorText error={authError} /></Screen>;
  if (!user || game.loading || (game.data && alreadyMember === null)) return <Loading />;

  if (!game.data) {
    return (
      <Screen title="Hittade inget spel">
        <p>Det finns inget spel med koden {code}. Kontrollera koden med spelledaren.</p>
        <Link to="/" className="button">Tillbaka</Link>
      </Screen>
    );
  }
  if (alreadyMember) return <Navigate to={`/play/${code}`} replace />;
  if (game.data.hostUid === user.uid) {
    return (
      <Screen title="Du är spelledare">
        <p>Spelledaren kan inte vara med som lag, eftersom hen ser svaren.</p>
        <Link to={`/host/${code}`} className="button">Till spelledarvyn</Link>
      </Screen>
    );
  }
  if (game.data.status !== 'lobby') {
    return (
      <Screen title="Spelet har startat">
        <p>Det går inte att gå med efter att spelet startat. Vänta till nästa omgång.</p>
        <Link to="/" className="button">Tillbaka</Link>
      </Screen>
    );
  }

  const submit = async (name: string, mascot: MascotId, level: TeamLevel) => {
    setBusy(true);
    setError(null);
    try {
      await joinGame(code, user.uid, name, mascot, level);
      navigate(`/play/${code}`, { replace: true });
    } catch (err) {
      setError(`Kunde inte gå med: ${errorMessage(err)}`);
      setBusy(false);
    }
  };

  return (
    <Screen title={`Gå med i spel ${code}`}>
      <ProfileForm submitLabel="Gå med" chooseLevel={gameMode(game.data) === 'family'} busy={busy} onSubmit={submit} />
      <ErrorText error={error} />
    </Screen>
  );
}
