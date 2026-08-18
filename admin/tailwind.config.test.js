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

  it('defines the dashboard accent color group used by the redesigned admin dashboard', () => {
    expect(config.theme.extend.colors.dashboard).toEqual({
      purple: '#5b2cf2',
      purpleDark: '#4315d9',
      purpleLight: '#f0ebff',
      orange: '#ff6b00',
      green: '#36ad3d',
      blue: '#1685ff',
    });
  });
});
