const CONTENT_BY_SECTION_KEY_FLAG = {
  QUICK_RECOMMENDATIONS: 'hasQuickRecommendations',
  COMPARISON_TABLE: 'hasComparison',
  TOP_PICK: 'hasTopPick',
  RUNNER_UPS: 'hasRunnerUps',
  FAQS: 'hasFaqs',
};

export function computeGuideSectionNumbers(tocEntries, flags) {
  const numbers = {};
  let nextNumber = 1;
  let buyingGuideNumbered = false;

  tocEntries.forEach((entry) => {
    if (entry.sectionKey) {
      const flagName = CONTENT_BY_SECTION_KEY_FLAG[entry.sectionKey];
      if (flagName && flags[flagName]) {
        numbers[entry.sectionKey] = nextNumber;
        nextNumber += 1;
      }
      return;
    }
    if (!buyingGuideNumbered && flags.hasBuyingGuideContent) {
      numbers.BUYING_GUIDE = nextNumber;
      nextNumber += 1;
      buyingGuideNumbered = true;
    }
  });

  if (flags.hasFinalRecommendation) {
    numbers.FINAL_RECOMMENDATION = nextNumber;
  }

  return numbers;
}
