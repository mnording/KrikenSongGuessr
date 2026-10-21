import { LANGS, MESSAGES, useT } from './context';

/** Tre knappar med språkets eget namn, så att den som inte kan svenska hittar sitt. */
export function LangSwitch() {
  const { lang, t, setLang } = useT();
  return (
    <div className="lang-switch" role="group" aria-label={t.language}>
      {LANGS.map((l) => (
        <button key={l} type="button" lang={l} aria-pressed={l === lang} onClick={() => setLang(l)}>
          {MESSAGES[l].langName}
        </button>
      ))}
    </div>
  );
}
