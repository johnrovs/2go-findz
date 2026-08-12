import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { SUPPORTED_LANGUAGES } from './supportedLanguages.js';
import { normalizeDetectedLocale } from './localeAliases.js';

const supportedLngs = SUPPORTED_LANGUAGES.map((language) => language.code);

i18n
  .use(resourcesToBackend((language, namespace) => import(`./locales/${language}/${namespace}.json`)))
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en-US',
    supportedLngs,
    ns: ['common'],
    defaultNS: 'common',
    partialBundledLanguages: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      convertDetectedLanguage: (detected) => normalizeDetectedLocale(detected, supportedLngs),
    },
    react: { useSuspense: true },
  });

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language;
});

export default i18n;
