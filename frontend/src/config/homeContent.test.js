import { describe, expect, it } from 'vitest';
import { HOME_HERO_CONTENT, HOME_HERO_IMAGE } from './homeContent.js';

describe('homeContent', () => {
  it('exports the hero image path as a single named constant', () => {
    expect(HOME_HERO_IMAGE).toBe('/images/home/hero_banner.png');
  });

  it('exports the promotional hero badge', () => {
    expect(HOME_HERO_CONTENT.badge).toBe('WELCOME TO 2GO FINDZ');
  });
});
