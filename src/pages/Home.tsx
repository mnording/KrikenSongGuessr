import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Screen } from '../components/Common';
import { useT } from '../i18n/context';
import { LangSwitch } from '../i18n/LangSwitch';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useT();
  const [code, setCode] = useState('');
  const valid = /^\d{6}$/.test(code);

  const join = (e: FormEvent) => {
    e.preventDefault();
    if (valid) navigate(`/join/${code}`);
  };

  return (
    <Screen title="Kriken Låtgissning">
      <p className="lead">{t.home.lead}</p>

      <form className="card-box" onSubmit={join}>
        <h2>{t.home.joinTitle}</h2>
        <label htmlFor="code">{t.home.codeLabel}</label>
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
          {t.join}
        </button>
      </form>

      <div className="card-box">
        <h2>{t.home.hostTitle}</h2>
        <p className="muted">{t.home.hostText}</p>
        <Link to="/host" className="button">
          {t.home.createGame}
        </Link>
      </div>

      <LangSwitch />
    </Screen>
  );
}
