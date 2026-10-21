// Språket på lagens skärmar. Utanför LangProvider (spelledarens vyer) är det alltid svenska.
import { createContext, useContext } from 'react';
import { en } from './en';
import { es } from './es';
import { sv, type Messages } from './sv';

export type Lang = 'sv' | 'en' | 'es';

export const MESSAGES: Record<Lang, Messages> = { sv, en, es };

export const LANGS = Object.keys(MESSAGES) as Lang[];

export const isLang = (value: string | null): value is Lang => value !== null && Object.hasOwn(MESSAGES, value);

type LangContext = { lang: Lang; t: Messages; setLang: (lang: Lang) => void };

export const I18n = createContext<LangContext>({ lang: 'sv', t: sv, setLang: () => {} });

export const useT = () => useContext(I18n);
