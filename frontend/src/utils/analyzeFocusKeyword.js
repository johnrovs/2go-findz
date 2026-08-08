function normalize(text) {
  return (text ?? '').toLowerCase();
}

function stripHtml(html) {
  return (html ?? '').replace(/<[^>]*>/g, ' ');
}

export function analyzeFocusKeywordUsage(keyword, { seoTitle, metaDescription, slug, introduction, tocEntries }) {
  const trimmedKeyword = (keyword ?? '').trim().toLowerCase();
  if (!trimmedKeyword) {
    return { inTitle: false, inDescription: false, inSlug: false, inContent: false };
  }

  const contentText = [
    stripHtml(introduction),
    ...(tocEntries ?? [])
      .filter((entry) => !entry.sectionKey)
      .map((entry) => `${entry.title} ${stripHtml(entry.content)}`),
  ].join(' ');

  return {
    inTitle: normalize(seoTitle).includes(trimmedKeyword),
    inDescription: normalize(metaDescription).includes(trimmedKeyword),
    inSlug: normalize(slug).includes(trimmedKeyword),
    inContent: normalize(contentText).includes(trimmedKeyword),
  };
}
