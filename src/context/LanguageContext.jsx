import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '@data/translations';
import { getString, setString } from '@storage/mmkv';

// Ported from e:\sahakar-seva-progress\src\context\LanguageContext.jsx (23 lines total).
//
// Behaviour preserved exactly:
//   - `language` may be null, meaning "not yet chosen" — InitialLanguageModal keys off this
//     to decide whether to prompt on first launch.
//   - `t(key)` is a flat lookup with an English fallback, then the key itself as last resort.
//     No interpolation, no pluralisation, no namespaces. Deliberately NOT swapped for i18next.
//
// ONLY change from web: localStorage -> MMKV.
//
// This is the sync-read site the migration plan flagged. The useState initializer below reads
// storage SYNCHRONOUSLY on first render, exactly as `localStorage.getItem('appLanguage')` did
// on web. With AsyncStorage this initializer would have to return null and fill in later,
// which would flash the language-selection modal open on EVERY launch for a user who already
// picked a language. MMKV's getString is synchronous (JSI), so the shape of the web code is
// preserved verbatim and there is no flash and no bootstrap gate needed.

const STORAGE_KEY = 'appLanguage';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return getString(STORAGE_KEY) || null;
  });

  useEffect(() => {
    if (language) {
      setString(STORAGE_KEY, language);
    }
  }, [language]);

  const t = (key) => {
    const lang = language || 'en';
    return translations[lang]?.[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
