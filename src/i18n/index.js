// src/i18n/index.js
// Production-grade i18n configuration
// - Auto-detects browser language (en/hi)
// - Persists selection to localStorage
// - Lazy-loads translation JSONs for scalability
// - Falls back gracefully to English

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from '../locales/en/translation.json';
import hiTranslation from '../locales/hi/translation.json';

const SUPPORTED_LANGUAGES = ['en', 'hi'];
const FALLBACK_LANGUAGE = 'en';
const STORAGE_KEY = 'smac_language';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Resources (add more languages here in future)
    resources: {
      en: { translation: enTranslation },
      hi: { translation: hiTranslation },
    },

    // Language detection order: localStorage → browser → fallback
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
      // Only accept supported languages; fall back to 'en' otherwise
      convertDetectedLanguage: (lng) => {
        const base = lng?.split('-')[0]; // e.g. 'en-US' → 'en'
        return SUPPORTED_LANGUAGES.includes(base) ? base : FALLBACK_LANGUAGE;
      },
    },

    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,

    // Interpolation
    interpolation: {
      escapeValue: false, // React already sanitizes
    },

    // Namespace
    defaultNS: 'translation',
    ns: ['translation'],

    // Debugging (disable in production)
    debug: import.meta.env.DEV,

    // React-specific settings
    react: {
      useSuspense: false, // Disable suspense for easier error boundaries
    },
  });

/**
 * Change language and persist to localStorage.
 * @param {'en'|'hi'} lang
 */
export const changeLanguage = (lang) => {
  if (!SUPPORTED_LANGUAGES.includes(lang)) return;
  i18n.changeLanguage(lang);
  localStorage.setItem(STORAGE_KEY, lang);
  // Update html lang attribute for accessibility + SEO
  document.documentElement.lang = lang;
  // Apply Hindi font class for clean rendering
  if (lang === 'hi') {
    document.body.classList.add('lang-hi');
  } else {
    document.body.classList.remove('lang-hi');
  }
};

export { SUPPORTED_LANGUAGES, FALLBACK_LANGUAGE, STORAGE_KEY };
export default i18n;
