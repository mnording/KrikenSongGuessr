import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Screen } from '../components/Common';

export default function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const valid = /^\d{6}$/.test(code);

  const join = (e: FormEvent) => {
    e.preventDefault();
    if (valid) navigate(`/join/${code}`);
  };

  return (
    <Screen title="Kriken Låtgissning">
      <p className="lead">Lyssna på låten och lägg den rätt i er tidslinje. Först till sju kort vinner.</p>

      <form className="card-box" onSubmit={join}>
        <h2>Gå med i ett spel</h2>
        <label htmlFor="code">Spelkod</label>
        <input
          id="code"
          className="code-input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <button type="submit" className="primary" disabled={!valid}>
          Gå med
        </button>
      </form>

      <div className="card-box">
        <h2>Spelledare</h2>
        <p className="muted">Du behöver Spotify Premium. Musiken spelas från din telefon.</p>
        <Link to="/host" className="button">
          Skapa spel
        </Link>
      </div>
    </Screen>
  );
}
