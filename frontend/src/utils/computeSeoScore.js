function countWords(html) {
  const text = (html ?? '').replace(/<[^>]*>/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
}

function rangeScore(length, min, max, fullPoints, partialPoints) {
  if (length === 0) return 0;
  return length >= min && length <= max ? fullPoints : partialPoints;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function computeSeoScore({
  seoTitle, metaDescription, focusKeyword, slug, introduction, canonicalUrl,
  hasStructuredData, hasQuickPick, hasTopPick,
}) {
  const trimmedKeyword = (focusKeyword ?? '').trim().toLowerCase();
  const strippedIntroduction = (introduction ?? '').replace(/<[^>]*>/g, ' ').toLowerCase();

  const inTitle = Boolean(trimmedKeyword) && (seoTitle ?? '').toLowerCase().includes(trimmedKeyword);
  const inDescription = Boolean(trimmedKeyword) && (metaDescription ?? '').toLowerCase().includes(trimmedKeyword);
  const inSlug = Boolean(trimmedKeyword) && (slug ?? '').toLowerCase().includes(trimmedKeyword);
  const inContent = Boolean(trimmedKeyword) && strippedIntroduction.includes(trimmedKeyword);

  const canonicalValid = !canonicalUrl || isValidHttpUrl(canonicalUrl);

  const checks = [
    {
      id: 'seoTitle', label: 'SEO Title length',
      points: rangeScore((seoTitle ?? '').length, 50, 60, 15, 10), maxPoints: 15,
      why: 'Search engines display your title in results, and a well-sized title improves click-through.',
      recommendation: 'Aim for 50–60 characters.', focusStep: 8, focusFieldId: 'seo-title',
    },
    {
      id: 'metaDescription', label: 'Meta Description length',
      points: rangeScore((metaDescription ?? '').length, 140, 160, 15, 10), maxPoints: 15,
      why: 'The meta description is often shown under your title in search results.',
      recommendation: 'Aim for 140–160 characters.', focusStep: 8, focusFieldId: 'meta-description',
    },
    {
      id: 'focusKeywordSet', label: 'Focus Keyword set',
      points: trimmedKeyword ? 5 : 0, maxPoints: 5,
      why: 'A focus keyword helps you check that your content addresses a specific search intent.',
      recommendation: 'Choose the main phrase this guide should rank for.', focusStep: 8, focusFieldId: 'focus-keyword',
    },
    {
      id: 'keywordInTitle', label: 'Keyword in SEO Title',
      points: inTitle ? 10 : 0, maxPoints: 10,
      why: 'Search engines weigh terms that appear in the title.',
      recommendation: 'Work the focus keyword naturally into the SEO Title.', focusStep: 8, focusFieldId: 'seo-title',
    },
    {
      id: 'keywordInDescription', label: 'Keyword in Meta Description',
      points: inDescription ? 10 : 0, maxPoints: 10,
      why: 'A keyword match in the description reinforces relevance to searchers.',
      recommendation: 'Work the focus keyword naturally into the Meta Description.', focusStep: 8, focusFieldId: 'meta-description',
    },
    {
      id: 'keywordInSlug', label: 'Keyword in URL Slug',
      points: inSlug ? 5 : 0, maxPoints: 5,
      why: 'Keywords in the URL are a minor relevance signal.',
      recommendation: 'Include the focus keyword in the URL slug.', focusStep: 1, focusFieldId: 'slug',
    },
    {
      id: 'keywordInContent', label: 'Keyword in Introduction/Buying Guide content',
      points: inContent ? 10 : 0, maxPoints: 10,
      why: 'Search engines look for the keyword used naturally within the actual content.',
      recommendation: 'Mention the focus keyword naturally in the introduction or buying guide content.',
      focusStep: 1, focusFieldId: null,
    },
    {
      id: 'contentCompleteness', label: 'Content completeness',
      points: countWords(introduction) >= 40 ? 10 : 0, maxPoints: 10,
      why: 'Thin introductions give readers and search engines little to evaluate.',
      recommendation: 'Write at least 40 words in the introduction.', focusStep: 1, focusFieldId: null,
    },
    {
      id: 'canonicalUrl', label: 'Valid Canonical URL',
      points: canonicalValid ? 5 : 0, maxPoints: 5,
      why: 'An invalid canonical URL can confuse search engines about which page to index.',
      recommendation: 'Leave it blank or enter a valid absolute https URL.', focusStep: 8, focusFieldId: 'canonical-url',
    },
    {
      id: 'structuredData', label: 'Structured data present',
      points: hasStructuredData ? 10 : 0, maxPoints: 10,
      why: 'FAQ structured data can make your guide eligible for rich results.',
      recommendation: 'Add at least one complete FAQ with both a question and an answer.', focusStep: 7, focusFieldId: null,
    },
    {
      id: 'internalLinks', label: 'Internal links found',
      points: hasQuickPick && hasTopPick ? 5 : 0, maxPoints: 5,
      why: 'Internal links to product sections help readers and search engines navigate your guide.',
      recommendation: 'Add at least one Quick Pick and select a Top Pick.', focusStep: 3, focusFieldId: null,
    },
  ];

  const score = checks.reduce((sum, check) => sum + check.points, 0);
  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work';

  return { score, label, checks };
}
