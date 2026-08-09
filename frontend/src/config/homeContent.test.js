import { describe, expect, it } from 'vitest';
import { HOME_HERO_CONTENT, HOME_HERO_IMAGE } from './homeContent.js';

describe('homeContent', () => {
  it('exports the hero image path as a single named constant', () => {
    expect(HOME_HERO_IMAGE).toBe('/images/home/hero-placeholder.webp');
  });

  it('exports the promotional hero content', () => {
    expect(HOME_HERO_CONTENT.badge).toBe('WELCOME TO 2GO FINDZ');
    expect(HOME_HERO_CONTENT.shopperCountLabel).toMatch(/25,000\+/);
    expect(HOME_HERO_CONTENT.trustCards.topRated.ratingValue).toBe('4.8/5');
    expect(HOME_HERO_CONTENT.trustCards.handpicked.description).toBeTruthy();
  });
});
