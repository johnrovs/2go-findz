const LOCALE_ALIASES = {
  en: 'en-US',
  es: 'es-US',
  'es-mx': 'es-US',
  'es-es': 'es-US',
  fil: 'fil-PH',
  tl: 'fil-PH',
  zh: 'zh-Hans',
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  vi: 'vi',
  'vi-vn': 'vi',
};

export function normalizeDetectedLocale(detected, supportedLngs) {
  if (!detected) return detected;

  const lower = detected.toLowerCase();
  const exactMatch = supportedLngs.find((code) => code.toLowerCase() === lower);
  if (exactMatch) return exactMatch;

  if (LOCALE_ALIASES[lower]) return LOCALE_ALIASES[lower];

  const primarySubtag = lower.split('-')[0];
  if (LOCALE_ALIASES[primarySubtag]) return LOCALE_ALIASES[primarySubtag];

  return detected;
}
