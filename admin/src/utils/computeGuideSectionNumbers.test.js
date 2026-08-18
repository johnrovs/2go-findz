import { describe, expect, it } from 'vitest';
import { computeGuideSectionNumbers } from './computeGuideSectionNumbers.js';

const baseFlags = {
  hasQuickRecommendations: false,
  hasComparison: false,
  hasTopPick: false,
  hasRunnerUps: false,
  hasBuyingGuideContent: false,
  hasFaqs: false,
  hasFinalRecommendation: false,
};

describe('computeGuideSectionNumbers', () => {
  it('numbers structural sections in TOC order, skipping ones with no content', () => {
    const tocEntries = [
      { sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '' },
      { sectionKey: 'COMPARISON_TABLE', title: '', content: '' },
      { sectionKey: 'TOP_PICK', title: '', content: '' },
      { sectionKey: 'FAQS', title: '', content: '' },
    ];
    const numbers = computeGuideSectionNumbers(tocEntries, {
      ...baseFlags,
      hasQuickRecommendations: true,
      hasTopPick: true,
      hasFaqs: true,
    });
    expect(numbers).toEqual({ QUICK_RECOMMENDATIONS: 1, TOP_PICK: 2, FAQS: 3 });
  });

  it('numbers custom Buying Guide entries as a single BUYING_GUIDE slot at their TOC position', () => {
    const tocEntries = [
      { sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '' },
      { sectionKey: null, title: 'How We Tested', content: '<p>Body</p>' },
      { sectionKey: 'FAQS', title: '', content: '' },
    ];
    const numbers = computeGuideSectionNumbers(tocEntries, {
      ...baseFlags,
      hasQuickRecommendations: true,
      hasBuyingGuideContent: true,
      hasFaqs: true,
    });
    expect(numbers).toEqual({ QUICK_RECOMMENDATIONS: 1, BUYING_GUIDE: 2, FAQS: 3 });
  });

  it('appends FINAL_RECOMMENDATION immediately after the last numbered section when present', () => {
    const tocEntries = [{ sectionKey: 'TOP_PICK', title: '', content: '' }];
    const numbers = computeGuideSectionNumbers(tocEntries, {
      ...baseFlags,
      hasTopPick: true,
      hasFinalRecommendation: true,
    });
    expect(numbers).toEqual({ TOP_PICK: 1, FINAL_RECOMMENDATION: 2 });
  });

  it('omits FINAL_RECOMMENDATION entirely when the flag is false', () => {
    const tocEntries = [{ sectionKey: 'TOP_PICK', title: '', content: '' }];
    const numbers = computeGuideSectionNumbers(tocEntries, { ...baseFlags, hasTopPick: true });
    expect(numbers).toEqual({ TOP_PICK: 1 });
  });

  it('returns an empty object when nothing has content', () => {
    expect(computeGuideSectionNumbers([], baseFlags)).toEqual({});
  });
});
