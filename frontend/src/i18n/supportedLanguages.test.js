import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES } from './supportedLanguages.js';

describe('SUPPORTED_LANGUAGES', () => {
  it('lists exactly the 5 launch locales with their native names', () => {
    expect(SUPPORTED_LANGUAGES).toEqual([
      { code: 'en-US', nativeName: 'English' },
      { code: 'es-US', nativeName: 'Español' },
      { code: 'fil-PH', nativeName: 'Filipino' },
      { code: 'zh-Hans', nativeName: '简体中文' },
      { code: 'vi', nativeName: 'Tiếng Việt' },
    ]);
  });
});
