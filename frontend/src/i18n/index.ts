import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enGroups from '../locales/en/groups.json';

import esCommon from '../locales/es/common.json';
import esAuth from '../locales/es/auth.json';
import esGroups from '../locales/es/groups.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    groups: enGroups,
  },
  es: {
    common: esCommon,
    auth: esAuth,
    groups: esGroups,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'groups'],

    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator'],
      // Cache user language in localStorage
      caches: ['localStorage'],
      lookupLocalStorage: 'relay_language',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false, // Disable suspense to avoid hydration issues
    },
  });

export default i18n;

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];
