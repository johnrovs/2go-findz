import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import common from './locales/en-US/common.json';
import guides from './locales/en-US/guides.json';

// The admin dashboard is English-only (internal tool, no language switcher). i18next is
// still wired up -- not for translation, but because the live/desktop guide preview
// (buying-guide-form/DesktopGuidePreview.jsx, LivePreview.jsx) reuses the same
// components/buying-guide/* that render the actual public buying guide page, and those
// components call useTranslation(). Bundling only the English resources directly (no
// dynamic per-language backend, no language detector) keeps this a supporting UI
// dependency rather than a re-import of the public site's i18n system.
i18n.use(initReactI18next).init({
  lng: 'en-US',
  fallbackLng: 'en-US',
  ns: ['common', 'guides'],
  defaultNS: 'common',
  resources: {
    'en-US': { common, guides },
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
