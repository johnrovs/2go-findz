import { describe, expect, it } from 'vitest';
import config from './tailwind.config.js';

describe('tailwind.config.js', () => {
  it('defines the navy color family used by the dark header/footer', () => {
    expect(config.theme.extend.colors.navy).toEqual({
      950: '#020d18',
      900: '#071426',
      800: '#0b1c33',
    });
  });
});
