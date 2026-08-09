import { describe, expect, it } from 'vitest';
import { wordCount } from './wordCount.js';

describe('wordCount', () => {
  it('counts words in plain text', () => {
    expect(wordCount('one two three')).toBe(3);
  });

  it('strips HTML tags before counting', () => {
    expect(wordCount('<p>one <strong>two</strong> three</p>')).toBe(3);
  });

  it('returns 0 for empty or whitespace-only content', () => {
    expect(wordCount('')).toBe(0);
    expect(wordCount('   ')).toBe(0);
    expect(wordCount('<p></p>')).toBe(0);
  });
});
