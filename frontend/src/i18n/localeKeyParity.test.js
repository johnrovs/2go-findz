import { describe, expect, it } from 'vitest';
import enUS from './locales/en-US/common.json';
import esUS from './locales/es-US/common.json';
import filPH from './locales/fil-PH/common.json';
import zhHans from './locales/zh-Hans/common.json';
import vi from './locales/vi/common.json';

function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null ? flattenKeys(value, path) : [path];
  });
}

describe('common.json locale key parity', () => {
  const englishKeys = flattenKeys(enUS).sort();

  it.each([
    ['es-US', esUS],
    ['fil-PH', filPH],
    ['zh-Hans', zhHans],
    ['vi', vi],
  ])('%s has exactly the same keys as en-US', (_locale, translations) => {
    expect(flattenKeys(translations).sort()).toEqual(englishKeys);
  });
});
