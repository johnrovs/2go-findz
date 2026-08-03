import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slugify.js';

describe('slugify', () => {
  it('lowercases and hyphenates a title', () => {
    expect(slugify('How We Tested')).toBe('how-we-tested');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugify("What's the Best Budget Pick?")).toBe('what-s-the-best-budget-pick');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Extra Spaces--  ')).toBe('extra-spaces');
  });

  it('returns an empty string for input with no alphanumeric characters', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('uniqueSlug', () => {
  it('returns the plain slug the first time it is used', () => {
    const used = new Set();
    expect(uniqueSlug('How We Tested', used)).toBe('how-we-tested');
  });

  it('appends a numeric suffix on collision', () => {
    const used = new Set(['how-we-tested']);
    expect(uniqueSlug('How We Tested', used)).toBe('how-we-tested-2');
  });

  it('keeps incrementing the suffix past the first collision', () => {
    const used = new Set(['how-we-tested', 'how-we-tested-2']);
    expect(uniqueSlug('How We Tested', used)).toBe('how-we-tested-3');
  });

  it('adds the returned slug to the used set', () => {
    const used = new Set();
    uniqueSlug('How We Tested', used);
    expect(used.has('how-we-tested')).toBe(true);
  });

  it('falls back to "section" when the title has no alphanumeric characters', () => {
    const used = new Set();
    expect(uniqueSlug('???', used)).toBe('section');
  });
});
