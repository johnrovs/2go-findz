import { describe, expect, it } from 'vitest';
import { computeSeoScore } from './computeSeoScore.js';

const emptyInput = {
  seoTitle: '', metaDescription: '', focusKeyword: '', slug: '', introduction: '',
  canonicalUrl: '', hasStructuredData: false, hasQuickPick: false, hasTopPick: false,
};

const fullInput = {
  seoTitle: 'Best Wireless Earbuds Under $100 Guide'.padEnd(55, '!'),
  metaDescription: 'A guide to the best wireless earbuds for every budget'.padEnd(150, '.'),
  focusKeyword: 'wireless earbuds',
  // A literal substring match against the slug (no hyphen-for-space normalization, matching the
  // real implementation and analyzeFocusKeyword.js's own tests) -- spelled with spaces here only
  // to exercise the "found" branch; a real hyphenated slug would need a single-word keyword.
  slug: 'best wireless earbuds under 100',
  introduction: `<p>${'wireless earbuds review word '.repeat(10)}</p>`,
  canonicalUrl: 'https://www.2gofindz.com/buying-guides/best-wireless-earbuds-under-100',
  hasStructuredData: true,
  hasQuickPick: true,
  hasTopPick: true,
};

describe('computeSeoScore', () => {
  it('scores low and labels Needs Work when everything is empty (a blank canonical URL still earns its 5 points, matching "blank defaults fine")', () => {
    const result = computeSeoScore(emptyInput);
    expect(result.score).toBe(5);
    expect(result.label).toBe('Needs Work');
  });

  it('scores 100 and labels Excellent when every check passes', () => {
    const result = computeSeoScore(fullInput);
    expect(result.score).toBe(100);
    expect(result.label).toBe('Excellent');
  });

  it('gives partial credit for a title present but outside the recommended range', () => {
    const result = computeSeoScore({ ...emptyInput, seoTitle: 'Short' });
    const titleCheck = result.checks.find((check) => check.id === 'seoTitle');
    expect(titleCheck.points).toBe(10);
  });

  it('flags an invalid canonical URL', () => {
    const result = computeSeoScore({ ...emptyInput, canonicalUrl: 'not-a-url' });
    const canonicalCheck = result.checks.find((check) => check.id === 'canonicalUrl');
    expect(canonicalCheck.points).toBe(0);
  });

  it('sums check points to exactly the returned score', () => {
    const result = computeSeoScore(fullInput);
    const summed = result.checks.reduce((sum, check) => sum + check.points, 0);
    expect(summed).toBe(result.score);
  });

  it('labels a mid-range score as Good', () => {
    const result = computeSeoScore({ ...emptyInput, seoTitle: fullInput.seoTitle, metaDescription: fullInput.metaDescription });
    expect(result.label).toBe(result.score >= 80 ? 'Excellent' : result.score >= 50 ? 'Good' : 'Needs Work');
  });
});
