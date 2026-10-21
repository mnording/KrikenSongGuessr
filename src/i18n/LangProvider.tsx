import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { readLocal, writeLocal } from '../storage';
import { I18n, isLang, MESSAGES, type Lang } from './context';

const KEY = 'kriken.lang';

/** Lagens sidor får välja språk. Valet sparas på telefonen, och svenska gäller tills någon byter. */
export function LangProvider() {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = readLocal(KEY);
    return isLang(saved) ? saved : 'sv';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = 'sv';
    };
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    writeLocal(KEY, next);
  };

  return (
    <I18n.Provider value={{ lang, t: MESSAGES[lang], setLang }}>
      <Outlet />
    </I18n.Provider>
  );
}
