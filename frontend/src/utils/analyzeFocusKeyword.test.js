import { describe, expect, it } from 'vitest';
import { analyzeFocusKeywordUsage } from './analyzeFocusKeyword.js';

const base = {
  seoTitle: 'Best Wireless Earbuds Under $100',
  metaDescription: 'A guide to budget earbuds.',
  slug: 'best-wireless-earbuds-under-100',
  introduction: '<p>Looking for great sound on a budget?</p>',
  tocEntries: [{ sectionKey: null, title: 'What to Look For', content: '<p>Battery life and wireless range matter.</p>' }],
};

describe('analyzeFocusKeywordUsage', () => {
  it('returns all false when the keyword is blank', () => {
    expect(analyzeFocusKeywordUsage('', base)).toEqual({ inTitle: false, inDescription: false, inSlug: false, inContent: false });
  });

  it('detects the keyword in the title, case-insensitively', () => {
    const result = analyzeFocusKeywordUsage('wireless earbuds', base);
    expect(result.inTitle).toBe(true);
  });

  it('detects the keyword in the slug', () => {
    expect(analyzeFocusKeywordUsage('earbuds', { ...base, slug: 'wireless-earbuds-under-100' }).inSlug).toBe(true);
  });

  it('detects the keyword in custom TOC section content', () => {
    const result = analyzeFocusKeywordUsage('wireless range', base);
    expect(result.inContent).toBe(true);
  });

  it('reports false for a keyword that appears nowhere', () => {
    const result = analyzeFocusKeywordUsage('waterproof rating', base);
    expect(result).toEqual({ inTitle: false, inDescription: false, inSlug: false, inContent: false });
  });
});
