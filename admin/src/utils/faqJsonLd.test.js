import { describe, expect, it } from 'vitest';
import { buildFaqJsonLd } from './faqJsonLd.js';

describe('buildFaqJsonLd', () => {
  it('returns null when there are no FAQs', () => {
    expect(buildFaqJsonLd([])).toBeNull();
  });

  it('returns null when every FAQ is blank', () => {
    expect(buildFaqJsonLd([{ question: '', answer: '' }])).toBeNull();
  });

  it('builds a valid FAQPage schema from complete FAQs', () => {
    const result = buildFaqJsonLd([{ question: 'Is it worth it?', answer: 'Yes.' }]);
    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is it worth it?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes.' },
        },
      ],
    });
  });

  it('excludes FAQs with a blank question or answer', () => {
    const result = buildFaqJsonLd([
      { question: 'Complete?', answer: 'Yes.' },
      { question: '', answer: 'Orphan answer.' },
      { question: 'Orphan question?', answer: '' },
    ]);
    expect(result.mainEntity).toHaveLength(1);
    expect(result.mainEntity[0].name).toBe('Complete?');
  });

  it('trims whitespace from question and answer', () => {
    const result = buildFaqJsonLd([{ question: '  Trimmed?  ', answer: '  Trimmed answer.  ' }]);
    expect(result.mainEntity[0].name).toBe('Trimmed?');
    expect(result.mainEntity[0].acceptedAnswer.text).toBe('Trimmed answer.');
  });

  it('preserves multiple FAQs in their given order', () => {
    const result = buildFaqJsonLd([
      { question: 'First?', answer: 'A.' },
      { question: 'Second?', answer: 'B.' },
    ]);
    expect(result.mainEntity.map((entry) => entry.name)).toEqual(['First?', 'Second?']);
  });
});
