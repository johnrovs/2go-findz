import { describe, expect, it } from 'vitest';
import commonEnUS from './locales/en-US/common.json';
import commonEsUS from './locales/es-US/common.json';
import commonFilPH from './locales/fil-PH/common.json';
import commonZhHans from './locales/zh-Hans/common.json';
import commonVi from './locales/vi/common.json';
import guidesEnUS from './locales/en-US/guides.json';
import guidesEsUS from './locales/es-US/guides.json';
import guidesFilPH from './locales/fil-PH/guides.json';
import guidesZhHans from './locales/zh-Hans/guides.json';
import guidesVi from './locales/vi/guides.json';

function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null ? flattenKeys(value, path) : [path];
  });
}

function describeParity(namespace, enUS, translations) {
  describe(`${namespace}.json locale key parity`, () => {
    const englishKeys = flattenKeys(enUS).sort();

    it.each(translations)('%s has exactly the same keys as en-US', (_locale, resource) => {
      expect(flattenKeys(resource).sort()).toEqual(englishKeys);
    });
  });
}

describeParity('common', commonEnUS, [
  ['es-US', commonEsUS],
  ['fil-PH', commonFilPH],
  ['zh-Hans', commonZhHans],
  ['vi', commonVi],
]);

describeParity('guides', guidesEnUS, [
  ['es-US', guidesEsUS],
  ['fil-PH', guidesFilPH],
  ['zh-Hans', guidesZhHans],
  ['vi', guidesVi],
]);
