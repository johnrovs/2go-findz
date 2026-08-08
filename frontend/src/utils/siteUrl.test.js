import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildGuideUrl, getSiteUrl } from './siteUrl.js';

describe('siteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses VITE_SITE_URL when set, stripping a trailing slash', () => {
    vi.stubEnv('VITE_SITE_URL', 'https://www.2gofindz.com/');
    expect(getSiteUrl()).toBe('https://www.2gofindz.com');
  });

  it('falls back to window.location.origin when unset', () => {
    vi.stubEnv('VITE_SITE_URL', '');
    expect(getSiteUrl()).toBe(window.location.origin);
  });

  it('builds a guide URL from the site URL and slug', () => {
    vi.stubEnv('VITE_SITE_URL', 'https://www.2gofindz.com');
    expect(buildGuideUrl('best-earbuds')).toBe('https://www.2gofindz.com/buying-guides/best-earbuds');
  });
});
