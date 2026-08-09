# Public Buying Guide Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken public `/buying-guides/:slug` page with a real implementation rendering every section of a published guide (hero, TOC, Quick Recommendations, Product Comparison, Top Pick, Runner-Ups, Buying Guide content, FAQs, Final Recommendation) from live API data.

**Architecture:** Extract `LivePreview.jsx`'s inline rendering pieces into standalone shared components (`frontend/src/components/buying-guide/`) that take the public API's shape directly; extend the public API DTO with SEO fields already on the entity; extend the existing `useDocumentHead` hook for OG/Twitter/robots tags; build the page by composing the shared components plus new section wrappers; fix the pre-existing slug/id routing bug; refactor `LivePreview.jsx` to import the same shared components (behavior-preserving).

**Tech Stack:** React 18 / Vite / Tailwind / Vitest / RTL frontend; Spring Boot 3.2.5 / Java 21 backend. No TypeScript.

## Global Constraints

- Route stays `/buying-guides/:slug` — do not change to `/guides/:slug`.
- No new dependencies (no `react-helmet-async`) — extend `useDocumentHead` in place.
- No Product/Offer JSON-LD — `Article` schema only.
- No SSR, no fabricated `srcset`, no new caching layer, no real analytics provider — see design doc's "Explicitly out of scope."
- Do not hide content based on a referenced product's `active` flag.
- Every new/extracted component must produce behavior-identical output when reused by `LivePreview.jsx` (its existing test suite must pass unchanged after the refactor in the final task).
- `rel="nofollow sponsored noopener noreferrer"` + `target="_blank"` on every real Amazon CTA; invalid/unsupported URLs render a disabled state instead, never a dead link.
- Match existing Tailwind tokens (`primary`, `amazon`, `surface`, `border`, `heading`, `body`, `muted`, `success`, `danger`) — no new color tokens.
- Full design doc: `docs/superpowers/specs/2026-08-08-public-buying-guide-page-design.md`.

---

### Task 1: Backend — expose SEO fields on the public detail DTO

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideDetailResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java` (`toPublicDetail` method)
- Test: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java`

**Interfaces:**
- Produces: `PublicBuyingGuideDetailResponse` gains `focusKeyword`, `canonicalUrl`, `visibility` (`Visibility` enum, serializes as string), `robotsIndex`, `robotsFollow`, `openGraphTitle`, `openGraphDescription`, `openGraphImageFilename`, `twitterCardType`, `publishedAt`, `updatedAt` (both `LocalDateTime`) — appended after the existing `tocEntries` field.

- [ ] **Step 1: Write the failing test**

Add to `PublicBuyingGuideControllerTest.java`:

```java
    @Test
    void getBySlug_returnsSeoAndAuditFields() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Public SEO Fields Guide Category");

        String requestJson = """
                {
                  "title": "Public SEO Fields Guide", "slug": "public-seo-fields-guide",
                  "excerpt": "Excerpt", "introduction": "<p>Introduction</p>", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": "Custom SEO Title", "seoDescription": "Custom SEO description.",
                  "active": true, "scheduledPublishAt": null, "recommendedProductIds": [],
                  "quickRecommendations": [], "comparisonSpecs": [], "recommendationSections": [],
                  "faqs": [], "tocEntries": [],
                  "focusKeyword": "wireless earbuds", "supportingKeywords": [],
                  "canonicalUrl": "https://example.com/canonical-guide",
                  "visibility": "UNLISTED", "robotsIndex": false, "robotsFollow": false,
                  "openGraphTitle": "OG Title", "openGraphDescription": "OG Description.",
                  "openGraphImageFilename": "og-image.png", "twitterCardType": "summary"
                }
                """.formatted(guideCategoryId);

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(requestJson));

        mockMvc.perform(get("/api/public/buying-guides/{slug}", "public-seo-fields-guide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.focusKeyword").value("wireless earbuds"))
                .andExpect(jsonPath("$.data.canonicalUrl").value("https://example.com/canonical-guide"))
                .andExpect(jsonPath("$.data.visibility").value("UNLISTED"))
                .andExpect(jsonPath("$.data.robotsIndex").value(false))
                .andExpect(jsonPath("$.data.robotsFollow").value(false))
                .andExpect(jsonPath("$.data.openGraphTitle").value("OG Title"))
                .andExpect(jsonPath("$.data.openGraphDescription").value("OG Description."))
                .andExpect(jsonPath("$.data.openGraphImageFilename").value("og-image.png"))
                .andExpect(jsonPath("$.data.twitterCardType").value("summary"))
                .andExpect(jsonPath("$.data.publishedAt").exists())
                .andExpect(jsonPath("$.data.updatedAt").exists());
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=PublicBuyingGuideControllerTest#getBySlug_returnsSeoAndAuditFields -q`
Expected: FAIL — `focusKeyword` (and the rest) are absent from the JSON response (unknown jsonPath).

- [ ] **Step 3: Extend the response record**

In `PublicBuyingGuideDetailResponse.java`, add the import and fields:

```java
package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.Visibility;

import java.time.LocalDateTime;
import java.util.List;

public record PublicBuyingGuideDetailResponse(
        Long id,
        String title,
        String slug,
        String excerpt,
        String introduction,
        String coverImageFilename,
        String categoryName,
        String seoTitle,
        String seoDescription,
        LocalDateTime createdAt,
        List<ProductResponse> recommendedProducts,
        List<PublicBuyingGuideQuickRecommendationResponse> quickRecommendations,
        PublicBuyingGuideComparisonTableResponse comparisonTable,
        PublicBuyingGuideRecommendationSectionResponse topPick,
        List<PublicBuyingGuideRecommendationSectionResponse> runnerUps,
        List<PublicBuyingGuideFaqResponse> faqs,
        List<PublicBuyingGuideTocEntryResponse> tocEntries,
        String focusKeyword,
        String canonicalUrl,
        Visibility visibility,
        boolean robotsIndex,
        boolean robotsFollow,
        String openGraphTitle,
        String openGraphDescription,
        String openGraphImageFilename,
        String twitterCardType,
        LocalDateTime publishedAt,
        LocalDateTime updatedAt
) {
}
```

- [ ] **Step 4: Update the mapper**

In `BuyingGuideMapper.java`'s `toPublicDetail` method, extend the constructor call:

```java
        return new PublicBuyingGuideDetailResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getSlug(),
                guide.getExcerpt(),
                guide.getIntroduction(),
                guide.getCoverImageFilename(),
                guide.getCategory() != null ? guide.getCategory().getProductCategoryName() : null,
                guide.getSeoTitle(),
                guide.getSeoDescription(),
                guide.getCreatedAt(),
                guide.getRecommendedProducts().stream().map(productMapper::toResponse).toList(),
                guide.getQuickRecommendations().stream()
                        .map(rec -> new PublicBuyingGuideQuickRecommendationResponse(
                                productMapper.toResponse(rec.getProduct()), rec.getBadgeName()))
                        .toList(),
                toComparisonTable(guide),
                topPickEntity != null ? toPublicRecommendationSection(guide, topPickEntity) : null,
                runnerUps,
                guide.getFaqs().stream()
                        .map(faq -> new PublicBuyingGuideFaqResponse(faq.getQuestion(), faq.getAnswer()))
                        .toList(),
                resolveTocEntries(guide),
                guide.getFocusKeyword(),
                guide.getCanonicalUrl(),
                guide.getVisibility(),
                guide.getRobotsIndex(),
                guide.getRobotsFollow(),
                guide.getOpenGraphTitle(),
                guide.getOpenGraphDescription(),
                guide.getOpenGraphImageFilename(),
                guide.getTwitterCardType(),
                guide.getPublishedAt(),
                guide.getUpdatedAt()
        );
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=PublicBuyingGuideControllerTest -q`
Expected: PASS (all tests in the file, including the new one).

- [ ] **Step 6: Run full backend suite**

Run: `cd backend && mvn test -q`
Expected: PASS, no regressions (the `toResponse`/admin mapper method is untouched).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideDetailResponse.java backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java
git commit -m "feat(buying-guides): expose SEO and audit fields on the public detail DTO"
```

---

### Task 2: Frontend utils — `computeGuideSectionNumbers` and shared `wordCount`

**Files:**
- Create: `frontend/src/utils/computeGuideSectionNumbers.js`
- Test: `frontend/src/utils/computeGuideSectionNumbers.test.js`
- Create: `frontend/src/utils/wordCount.js`
- Test: `frontend/src/utils/wordCount.test.js`
- Modify: `frontend/src/components/buying-guide-form/RichTextEditor.jsx` (import `wordCount` from the new util instead of defining it locally — avoids the public page ever importing Tiptap just to count words)

**Interfaces:**
- Produces: `computeGuideSectionNumbers(tocEntries, flags)` → `{ [sectionKeyOrBUYING_GUIDE]: number }`, where `tocEntries` is `{ sectionKey: string|null, title: string, content: string }[]` (already-visible-only, matching the public API shape) and `flags` is `{ hasQuickRecommendations, hasComparison, hasTopPick, hasRunnerUps, hasBuyingGuideContent, hasFaqs, hasFinalRecommendation }` (all booleans). Numbers a `FINAL_RECOMMENDATION` synthetic entry immediately after the last numbered structural/custom section when `hasFinalRecommendation` is true (it has no TOC entry of its own).
- Produces: `wordCount(html)` → `number`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/utils/wordCount.test.js`:

```js
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
```

`frontend/src/utils/computeGuideSectionNumbers.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/utils/wordCount.test.js src/utils/computeGuideSectionNumbers.test.js`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Implement `wordCount.js`**

```js
export function wordCount(html) {
  const text = html.replace(/<[^>]*>/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
}
```

- [ ] **Step 4: Implement `computeGuideSectionNumbers.js`**

```js
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/utils/wordCount.test.js src/utils/computeGuideSectionNumbers.test.js`
Expected: PASS.

- [ ] **Step 6: Point `RichTextEditor.jsx` at the shared util**

In `frontend/src/components/buying-guide-form/RichTextEditor.jsx`, replace the local `wordCount` definition:

```js
// remove:
export function wordCount(html) {
  const text = html.replace(/<[^>]*>/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
}
```

with an import at the top of the file and a re-export for existing callers that import `wordCount` from `RichTextEditor.jsx`:

```js
import { wordCount } from '../../utils/wordCount.js';

export { wordCount };
```

- [ ] **Step 7: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS — `RichTextEditor.test.jsx` and any other consumer of `wordCount` from `RichTextEditor.jsx` (e.g. `BuyingGuideContentStep`) still resolve it via the re-export.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/utils/computeGuideSectionNumbers.js frontend/src/utils/computeGuideSectionNumbers.test.js frontend/src/utils/wordCount.js frontend/src/utils/wordCount.test.js frontend/src/components/buying-guide-form/RichTextEditor.jsx
git commit -m "refactor(buying-guides): extract computeGuideSectionNumbers and wordCount into shared utils"
```

---

### Task 3: Extend `useDocumentHead` for robots, Open Graph, and Twitter Card tags

**Files:**
- Modify: `frontend/src/hooks/useDocumentHead.js`
- Modify: `frontend/src/hooks/useDocumentHead.test.js`

**Interfaces:**
- Produces: `useDocumentHead({ title, description, canonicalUrl, robots, ogTitle, ogDescription, ogImage, ogType, ogUrl, twitterCard, twitterTitle, twitterDescription, twitterImage, jsonLd })` — all new fields optional, existing behavior for `title`/`description`/`canonicalUrl`/`jsonLd` unchanged.

- [ ] **Step 1: Write the failing test**

Add to `useDocumentHead.test.js` (and extend `resetDocumentHead` to also clear the new tag selectors):

```js
function resetDocumentHead() {
  document.title = '';
  document
    .querySelectorAll(
      'meta[name="description"], link[rel="canonical"], script[type="application/ld+json"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"]'
    )
    .forEach((el) => el.remove());
}
```

```js
  it('sets robots, Open Graph, and Twitter Card meta tags', () => {
    renderHook(() =>
      useDocumentHead({
        title: 'Test',
        robots: 'noindex,nofollow',
        ogTitle: 'OG Title',
        ogDescription: 'OG Description.',
        ogImage: 'https://example.com/og.png',
        ogType: 'article',
        ogUrl: 'https://example.com/page',
        twitterCard: 'summary_large_image',
        twitterTitle: 'Twitter Title',
        twitterDescription: 'Twitter Description.',
        twitterImage: 'https://example.com/twitter.png',
      })
    );

    expect(document.querySelector('meta[name="robots"]').getAttribute('content')).toBe('noindex,nofollow');
    expect(document.querySelector('meta[property="og:title"]').getAttribute('content')).toBe('OG Title');
    expect(document.querySelector('meta[property="og:description"]').getAttribute('content')).toBe('OG Description.');
    expect(document.querySelector('meta[property="og:image"]').getAttribute('content')).toBe('https://example.com/og.png');
    expect(document.querySelector('meta[property="og:type"]').getAttribute('content')).toBe('article');
    expect(document.querySelector('meta[property="og:url"]').getAttribute('content')).toBe('https://example.com/page');
    expect(document.querySelector('meta[name="twitter:card"]').getAttribute('content')).toBe('summary_large_image');
    expect(document.querySelector('meta[name="twitter:title"]').getAttribute('content')).toBe('Twitter Title');
    expect(document.querySelector('meta[name="twitter:description"]').getAttribute('content')).toBe('Twitter Description.');
    expect(document.querySelector('meta[name="twitter:image"]').getAttribute('content')).toBe('https://example.com/twitter.png');
  });

  it('removes robots, Open Graph, and Twitter tags on unmount', () => {
    const { unmount } = renderHook(() =>
      useDocumentHead({ title: 'Test', robots: 'index,follow', ogTitle: 'OG Title', twitterCard: 'summary' })
    );

    unmount();

    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.querySelector('meta[name="twitter:card"]')).toBeNull();
  });

  it('omits tags whose value is not provided', () => {
    renderHook(() => useDocumentHead({ title: 'Test' }));

    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.querySelector('meta[name="twitter:card"]')).toBeNull();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/hooks/useDocumentHead.test.js`
Expected: FAIL — new tags are never created.

- [ ] **Step 3: Extend the hook**

```js
import { useEffect } from 'react';

const OG_PROPERTIES = {
  ogTitle: 'og:title',
  ogDescription: 'og:description',
  ogImage: 'og:image',
  ogType: 'og:type',
  ogUrl: 'og:url',
};

const TWITTER_NAMES = {
  twitterCard: 'twitter:card',
  twitterTitle: 'twitter:title',
  twitterDescription: 'twitter:description',
  twitterImage: 'twitter:image',
};

export function useDocumentHead({
  title,
  description,
  canonicalUrl,
  robots,
  ogTitle,
  ogDescription,
  ogImage,
  ogType,
  ogUrl,
  twitterCard,
  twitterTitle,
  twitterDescription,
  twitterImage,
  jsonLd,
}) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) {
      document.title = title;
    }

    let descriptionTag = null;
    if (description) {
      descriptionTag = document.createElement('meta');
      descriptionTag.setAttribute('name', 'description');
      descriptionTag.setAttribute('content', description);
      document.head.appendChild(descriptionTag);
    }

    let canonicalTag = null;
    if (canonicalUrl) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      canonicalTag.setAttribute('href', canonicalUrl);
      document.head.appendChild(canonicalTag);
    }

    let robotsTag = null;
    if (robots) {
      robotsTag = document.createElement('meta');
      robotsTag.setAttribute('name', 'robots');
      robotsTag.setAttribute('content', robots);
      document.head.appendChild(robotsTag);
    }

    const ogValues = { ogTitle, ogDescription, ogImage, ogType, ogUrl };
    const ogTags = Object.entries(OG_PROPERTIES)
      .filter(([key]) => ogValues[key])
      .map(([key, property]) => {
        const tag = document.createElement('meta');
        tag.setAttribute('property', property);
        tag.setAttribute('content', ogValues[key]);
        document.head.appendChild(tag);
        return tag;
      });

    const twitterValues = { twitterCard, twitterTitle, twitterDescription, twitterImage };
    const twitterTags = Object.entries(TWITTER_NAMES)
      .filter(([key]) => twitterValues[key])
      .map(([key, name]) => {
        const tag = document.createElement('meta');
        tag.setAttribute('name', name);
        tag.setAttribute('content', twitterValues[key]);
        document.head.appendChild(tag);
        return tag;
      });

    const jsonLdTags = (jsonLd ?? []).map((schema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
      return script;
    });

    return () => {
      document.title = previousTitle;
      descriptionTag?.remove();
      canonicalTag?.remove();
      robotsTag?.remove();
      ogTags.forEach((tag) => tag.remove());
      twitterTags.forEach((tag) => tag.remove());
      jsonLdTags.forEach((tag) => tag.remove());
    };
  }, [
    title,
    description,
    canonicalUrl,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    ogUrl,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    jsonLd,
  ]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/hooks/useDocumentHead.test.js`
Expected: PASS, including the three pre-existing tests (unchanged behavior).

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS — `ComparisonDetailPage.test.jsx` (the existing consumer) unaffected since it never passes the new fields.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useDocumentHead.js frontend/src/hooks/useDocumentHead.test.js
git commit -m "feat(buying-guides): add robots, Open Graph, and Twitter Card support to useDocumentHead"
```

---

### Task 4: `useAnalytics` hook

**Files:**
- Create: `frontend/src/hooks/useAnalytics.js`
- Test: `frontend/src/hooks/useAnalytics.test.js`

**Interfaces:**
- Produces: `trackEvent(name, payload = {})` — a plain exported function (not a React hook itself, despite the file name matching the design doc's naming — kept in `hooks/` alongside `useDocumentHead.js` for discoverability since it's guide-page-analytics-specific plumbing). Logs `[analytics] name payload` via `console.info` only when `import.meta.env.DEV` is true. Never throws.

- [ ] **Step 1: Write the failing test**

```js
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackEvent } from './useAnalytics.js';

describe('trackEvent', () => {
  let infoSpy;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it('logs the event name and payload in dev', () => {
    trackEvent('guide_view', { guideId: 3 });

    expect(infoSpy).toHaveBeenCalledWith('[analytics]', 'guide_view', { guideId: 3 });
  });

  it('defaults payload to an empty object', () => {
    trackEvent('guide_view');

    expect(infoSpy).toHaveBeenCalledWith('[analytics]', 'guide_view', {});
  });

  it('never throws even if console.info is unavailable', () => {
    infoSpy.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => trackEvent('guide_view', {})).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/hooks/useAnalytics.test.js`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement the hook**

```js
// Real provider integration point: swap the body of this function for a
// call into GA4/GTM/whatever is chosen later. Every call site in this
// codebase already passes the full event name + structured payload;
// nothing else needs to change when a provider is wired in.
export function trackEvent(name, payload = {}) {
  try {
    if (import.meta.env.DEV) {
      console.info('[analytics]', name, payload);
    }
  } catch {
    // Never let analytics break the page.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/hooks/useAnalytics.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useAnalytics.js frontend/src/hooks/useAnalytics.test.js
git commit -m "feat(buying-guides): add minimal trackEvent analytics hook"
```

---

### Task 5: `amazonLink.js` — add `getAmazonMarketplace`

**Files:**
- Modify: `frontend/src/utils/amazonLink.js`
- Test: `frontend/src/utils/amazonLink.test.js` (create if it doesn't already exist; extend if it does — check first)

**Interfaces:**
- Produces: `getAmazonMarketplace(url)` → `'US' | 'CA' | 'UK' | 'DE' | null`. Returns `null` for any URL `isSupportedAmazonUrl` would reject.

- [ ] **Step 1: Check for an existing test file**

Run: `ls frontend/src/utils/amazonLink.test.js 2>/dev/null || echo "none"`

If it exists, read it first and add the new test cases into its existing `describe` block instead of creating a new file.

- [ ] **Step 2: Write the failing test**

```js
import { describe, expect, it } from 'vitest';
import { getAmazonMarketplace, isSupportedAmazonUrl } from './amazonLink.js';

describe('getAmazonMarketplace', () => {
  it('maps supported hostnames to their marketplace code', () => {
    expect(getAmazonMarketplace('https://amazon.com/dp/B00TEST')).toBe('US');
    expect(getAmazonMarketplace('https://www.amazon.com/dp/B00TEST')).toBe('US');
    expect(getAmazonMarketplace('https://amazon.ca/dp/B00TEST')).toBe('CA');
    expect(getAmazonMarketplace('https://amazon.co.uk/dp/B00TEST')).toBe('UK');
    expect(getAmazonMarketplace('https://amazon.de/dp/B00TEST')).toBe('DE');
  });

  it('returns null for unsupported or invalid URLs', () => {
    expect(getAmazonMarketplace('https://example.com/dp/B00TEST')).toBeNull();
    expect(getAmazonMarketplace('not a url')).toBeNull();
    expect(getAmazonMarketplace(null)).toBeNull();
  });
});
```

(If a test file already existed with its own `isSupportedAmazonUrl` tests, keep those and only append the `getAmazonMarketplace` describe block.)

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/utils/amazonLink.test.js`
Expected: FAIL — `getAmazonMarketplace` is not exported.

- [ ] **Step 4: Implement**

Append to `amazonLink.js`:

```js
const MARKETPLACE_BY_HOSTNAME = {
  'amazon.com': 'US',
  'amazon.ca': 'CA',
  'amazon.co.uk': 'UK',
  'amazon.de': 'DE',
};

export function getAmazonMarketplace(url) {
  if (!isSupportedAmazonUrl(url)) return null;
  const hostname = new URL(url).hostname.replace(/^www\./, '');
  return MARKETPLACE_BY_HOSTNAME[hostname] ?? null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/utils/amazonLink.test.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/utils/amazonLink.js frontend/src/utils/amazonLink.test.js
git commit -m "feat(buying-guides): add getAmazonMarketplace for analytics payloads"
```

---

### Task 6: `AmazonAffiliateButton`

**Files:**
- Create: `frontend/src/components/AmazonAffiliateButton.jsx`
- Test: `frontend/src/components/AmazonAffiliateButton.test.jsx`

**Interfaces:**
- Consumes: `Button` (`components/Button.jsx`, `variant="amazon"` + `href`), `isSupportedAmazonUrl` (`utils/amazonLink.js`).
- Produces: `<AmazonAffiliateButton productName={string} url={string|null} onClick={fn?} className={string?}>{children?}</AmazonAffiliateButton>`. Renders a real link with safe `rel`/`target` and an `aria-label` including `productName` when `url` passes `isSupportedAmazonUrl`; otherwise renders a non-interactive "Link unavailable" element with no `href`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AmazonAffiliateButton from './AmazonAffiliateButton.jsx';

describe('AmazonAffiliateButton', () => {
  it('renders a real Amazon link with safe attributes when the URL is valid', () => {
    render(<AmazonAffiliateButton productName="Wireless Earbuds" url="https://amazon.com/dp/B00TEST" />);

    const link = screen.getByRole('link', { name: 'View Wireless Earbuds on Amazon' });
    expect(link).toHaveAttribute('href', 'https://amazon.com/dp/B00TEST');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('renders a disabled state instead of a link when the URL is invalid', () => {
    render(<AmazonAffiliateButton productName="Wireless Earbuds" url="https://example.com/not-amazon" />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Link unavailable')).toBeInTheDocument();
  });

  it('renders a disabled state when the URL is missing', () => {
    render(<AmazonAffiliateButton productName="Wireless Earbuds" url={null} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Link unavailable')).toBeInTheDocument();
  });

  it('calls onClick when the valid link is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<AmazonAffiliateButton productName="Wireless Earbuds" url="https://amazon.com/dp/B00TEST" onClick={onClick} />);

    await user.click(screen.getByRole('link', { name: /View Wireless Earbuds on Amazon/ }));

    expect(onClick).toHaveBeenCalled();
  });

  it('accepts custom children as the link label', () => {
    render(
      <AmazonAffiliateButton productName="Wireless Earbuds" url="https://amazon.com/dp/B00TEST">
        View Wireless Earbuds on Amazon $49.99
      </AmazonAffiliateButton>
    );

    expect(screen.getByText('View Wireless Earbuds on Amazon $49.99')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/AmazonAffiliateButton.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import Button from './Button.jsx';
import { isSupportedAmazonUrl } from '../utils/amazonLink.js';

function AmazonAffiliateButton({ productName, url, onClick, className = '', children }) {
  if (!isSupportedAmazonUrl(url)) {
    return (
      <span className={`block rounded-btn bg-slate-200 px-4 py-2 text-center text-sm font-semibold text-muted ${className}`}>
        Link unavailable
      </span>
    );
  }

  return (
    <Button
      variant="amazon"
      size="sm"
      href={url}
      target="_blank"
      rel="nofollow sponsored noopener noreferrer"
      aria-label={`View ${productName} on Amazon`}
      onClick={onClick}
      className={`w-full justify-center ${className}`}
    >
      {children ?? 'View on Amazon'}
    </Button>
  );
}

export default AmazonAffiliateButton;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/AmazonAffiliateButton.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AmazonAffiliateButton.jsx frontend/src/components/AmazonAffiliateButton.test.jsx
git commit -m "feat(buying-guides): add AmazonAffiliateButton"
```

---

### Task 7: `RecommendationCard` (shared: Top Pick / Runner-Up rendering)

**Files:**
- Create: `frontend/src/components/buying-guide/RecommendationCard.jsx`
- Test: `frontend/src/components/buying-guide/RecommendationCard.test.jsx`

**Interfaces:**
- Consumes: `AmazonAffiliateButton`, `getImageUrl` (`utils/imageUrl.js`), `Award`/`Medal`/`Check`/`X` icons from `lucide-react`.
- Produces: `<RecommendationCard recommendation={PublicBuyingGuideRecommendationSectionResponse} rank={number|null} onAffiliateClick={fn?} />`. `recommendation` shape: `{ product: { id, name, imageFileName, productPrice, productLink, rating, reviewCount }, recommendationType: 'TOP_PICK'|'RUNNER_UP', sectionLabel, whyRecommended, pros: string[], cons: string[], bestFor: string[], badgeName } `. Shows `#{rank}` only when `rank` is provided (Top Pick passes `null`).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecommendationCard from './RecommendationCard.jsx';

const topPick = {
  product: {
    id: 1,
    name: 'Soundcore Liberty 4 NC',
    imageFileName: 'soundcore.png',
    productPrice: 69.99,
    productLink: 'https://amazon.com/dp/B00TEST',
    rating: 4.5,
    reviewCount: 12850,
  },
  recommendationType: 'TOP_PICK',
  sectionLabel: 'Best Overall',
  whyRecommended: '<p>It offers the perfect combination of sound and battery life.</p>',
  pros: ['Excellent Noise Cancellation', 'High-quality audio'],
  cons: ['Slightly bulky case'],
  bestFor: ['Daily commuters', 'Students'],
  badgeName: 'Best Overall',
};

describe('RecommendationCard', () => {
  it('renders the product name, badge, price, and rating', () => {
    render(<RecommendationCard recommendation={topPick} rank={null} />);

    expect(screen.getByRole('heading', { name: 'Soundcore Liberty 4 NC' })).toBeInTheDocument();
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
    expect(screen.getByText('$69.99')).toBeInTheDocument();
    expect(screen.getByText(/4.5/)).toBeInTheDocument();
    expect(screen.getByText(/12,850/)).toBeInTheDocument();
  });

  it('does not show a rank badge for the Top Pick', () => {
    render(<RecommendationCard recommendation={topPick} rank={null} />);
    expect(screen.queryByText('#1')).not.toBeInTheDocument();
  });

  it('shows a rank badge for a Runner-Up', () => {
    render(<RecommendationCard recommendation={{ ...topPick, recommendationType: 'RUNNER_UP' }} rank={1} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('renders pros, cons, and best-for lists with accessible text alternatives', () => {
    render(<RecommendationCard recommendation={topPick} rank={null} />);

    expect(screen.getByText('Excellent Noise Cancellation')).toBeInTheDocument();
    expect(screen.getByText('Slightly bulky case')).toBeInTheDocument();
    expect(screen.getByText('Daily commuters')).toBeInTheDocument();
  });

  it('hides empty optional groups instead of rendering blank sections', () => {
    render(<RecommendationCard recommendation={{ ...topPick, cons: [], bestFor: [] }} rank={null} />);

    expect(screen.queryByText('Best For')).not.toBeInTheDocument();
  });

  it('renders the Amazon CTA and forwards onAffiliateClick', async () => {
    const onAffiliateClick = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationCard recommendation={topPick} rank={null} onAffiliateClick={onAffiliateClick} />);

    await user.click(screen.getByRole('link', { name: /Soundcore Liberty 4 NC/ }));

    expect(onAffiliateClick).toHaveBeenCalled();
  });

  it('omits rating text when the product has no rating', () => {
    render(<RecommendationCard recommendation={{ ...topPick, product: { ...topPick.product, rating: null } }} rank={null} />);
    expect(screen.queryByText(/reviews\)/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/RecommendationCard.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { Award, Check, Medal, X } from 'lucide-react';
import AmazonAffiliateButton from '../AmazonAffiliateButton.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function RecommendationCard({ recommendation, rank, onAffiliateClick }) {
  const { product, recommendationType, sectionLabel, whyRecommended, pros, cons, bestFor } = recommendation;
  const isTopPick = recommendationType === 'TOP_PICK';
  const imageUrl = getImageUrl(product.imageFileName);

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        {rank != null && <span className="text-xs font-semibold text-muted">#{rank}</span>}
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {isTopPick ? <Award size={14} aria-hidden="true" /> : <Medal size={14} aria-hidden="true" />}
          {sectionLabel || 'Untitled Badge'}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface-secondary">
          {imageUrl && <img src={imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <h3 className="text-card-title text-heading">{product.name}</h3>
          {product.rating != null && (
            <p className="text-xs text-muted">
              ★ {product.rating} ({(product.reviewCount ?? 0).toLocaleString()} reviews)
            </p>
          )}
          <p className="text-sm font-semibold text-heading">${Number(product.productPrice).toFixed(2)}</p>
        </div>
      </div>

      <AmazonAffiliateButton productName={product.name} url={product.productLink} onClick={onAffiliateClick} className="mb-3" />

      {whyRecommended && (
        <div className="prose prose-sm mb-3 max-w-none text-body" dangerouslySetInnerHTML={{ __html: whyRecommended }} />
      )}

      {pros.length > 0 && (
        <ul className="mb-2 space-y-1">
          {pros.map((item, index) => (
            <li key={index} className="flex items-start gap-1.5 text-sm text-body">
              <Check size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}

      {cons.length > 0 && (
        <ul className="mb-2 space-y-1">
          {cons.map((item, index) => (
            <li key={index} className="flex items-start gap-1.5 text-sm text-body">
              <X size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}

      {bestFor.length > 0 && (
        <div>
          <span className="text-sm font-semibold text-heading">Best For</span>
          <ul className="list-disc pl-5 text-sm text-body">
            {bestFor.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default RecommendationCard;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/RecommendationCard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/RecommendationCard.jsx frontend/src/components/buying-guide/RecommendationCard.test.jsx
git commit -m "feat(buying-guides): add shared RecommendationCard component"
```

---

### Task 8: `ComparisonTable`

**Files:**
- Create: `frontend/src/components/buying-guide/ComparisonTable.jsx`
- Test: `frontend/src/components/buying-guide/ComparisonTable.test.jsx`

**Interfaces:**
- Consumes: `getImageUrl`, `Check`/`X` icons.
- Produces: `<ComparisonTable comparisonTable={PublicBuyingGuideComparisonTableResponse} />`, where `comparisonTable` is `{ specificationNames: string[], rows: [{ product: {id, name, imageFileName}, specificationValues: string[] }] }` — `specificationValues[i]` corresponds to `specificationNames[i]`, index-aligned per row.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ComparisonTable from './ComparisonTable.jsx';

const comparisonTable = {
  specificationNames: ['Battery Life', 'ANC'],
  rows: [
    { product: { id: 1, name: 'TOZO NC9', imageFileName: null }, specificationValues: ['40 Hrs', 'Yes'] },
    { product: { id: 2, name: 'JLab Go Air Pop', imageFileName: null }, specificationValues: ['32 Hrs', 'No'] },
  ],
};

describe('ComparisonTable', () => {
  it('renders a semantic table with product columns and spec rows', () => {
    render(<ComparisonTable comparisonTable={comparisonTable} />);

    const table = screen.getByRole('table');
    expect(table).toHaveAccessibleName(/TOZO NC9, JLab Go Air Pop/);
    expect(screen.getByRole('columnheader', { name: 'TOZO NC9' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Battery Life' })).toBeInTheDocument();
    expect(screen.getByText('40 Hrs')).toBeInTheDocument();
  });

  it('renders boolean-like values as an icon plus accessible Yes/No text', () => {
    render(<ComparisonTable comparisonTable={comparisonTable} />);

    expect(screen.getAllByText('Yes', { selector: '.sr-only' })).toHaveLength(1);
    expect(screen.getAllByText('No', { selector: '.sr-only' })).toHaveLength(1);
  });

  it('renders an em dash for missing values', () => {
    const withMissing = {
      specificationNames: ['Weight'],
      rows: [{ product: { id: 1, name: 'Product A', imageFileName: null }, specificationValues: [''] }],
    };
    render(<ComparisonTable comparisonTable={withMissing} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('returns null when there is no comparison data', () => {
    const { container } = render(<ComparisonTable comparisonTable={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/ComparisonTable.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { Check, X } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl.js';

function renderCellValue(rawValue) {
  const value = (rawValue ?? '').trim();
  if (!value) return <span aria-hidden="true">&mdash;</span>;
  const lower = value.toLowerCase();
  if (lower === 'yes') {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Check size={16} aria-hidden="true" />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (lower === 'no') {
    return (
      <span className="inline-flex items-center gap-1 text-danger">
        <X size={16} aria-hidden="true" />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return value;
}

function ComparisonTable({ comparisonTable }) {
  if (!comparisonTable || comparisonTable.rows.length === 0) return null;
  const { specificationNames, rows } = comparisonTable;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <caption className="sr-only">Comparison of {rows.map((row) => row.product.name).join(', ')}</caption>
        <thead className="bg-slate-900">
          <tr>
            <th scope="col" className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
              Feature
            </th>
            {rows.map((row) => {
              const imageUrl = getImageUrl(row.product.imageFileName);
              return (
                <th key={row.product.id} scope="col" className="p-3 text-center text-xs font-semibold text-white">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      className="mx-auto mb-1 h-10 w-10 rounded-md object-cover"
                    />
                  )}
                  {row.product.name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {specificationNames.map((name, specIndex) => (
            <tr key={name} className="odd:bg-white even:bg-surface-secondary">
              <th scope="row" className="border-b border-border p-3 text-left text-sm font-medium text-body">
                {name}
              </th>
              {rows.map((row) => (
                <td key={row.product.id} className="border-b border-border p-3 text-center text-sm text-body">
                  {renderCellValue(row.specificationValues[specIndex])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ComparisonTable;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/ComparisonTable.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/ComparisonTable.jsx frontend/src/components/buying-guide/ComparisonTable.test.jsx
git commit -m "feat(buying-guides): add shared ComparisonTable component"
```

---

### Task 9: `BuyingGuideFaqAccordion`

**Files:**
- Create: `frontend/src/components/buying-guide/BuyingGuideFaqAccordion.jsx`
- Test: `frontend/src/components/buying-guide/BuyingGuideFaqAccordion.test.jsx`

**Interfaces:**
- Produces: `<BuyingGuideFaqAccordion faqs={{question, answer}[]} onExpand={fn?} />`. Shows the first 5, "View all N questions" toggle beyond that. Real `<button aria-expanded>` per item. Calls `onExpand(question)` only on the closed→open transition (not on collapse).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideFaqAccordion from './BuyingGuideFaqAccordion.jsx';

const sixFaqs = Array.from({ length: 6 }, (_, i) => ({
  question: `Question ${i + 1}?`,
  answer: `Answer ${i + 1}.`,
}));

describe('BuyingGuideFaqAccordion', () => {
  it('shows only the first 5 questions with a "View all" toggle', () => {
    render(<BuyingGuideFaqAccordion faqs={sixFaqs} />);

    expect(screen.getByText('Question 1?')).toBeInTheDocument();
    expect(screen.queryByText('Question 6?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View all 6 questions' })).toBeInTheDocument();
  });

  it('reveals the rest when "View all" is clicked and relabels itself', async () => {
    const user = userEvent.setup();
    render(<BuyingGuideFaqAccordion faqs={sixFaqs} />);

    await user.click(screen.getByRole('button', { name: 'View all 6 questions' }));

    expect(screen.getByText('Question 6?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer questions' })).toBeInTheDocument();
  });

  it('does not render a toggle when there are 5 or fewer FAQs', () => {
    render(<BuyingGuideFaqAccordion faqs={sixFaqs.slice(0, 5)} />);
    expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
  });

  it('expands an answer independently via a real button with correct aria-expanded', async () => {
    const user = userEvent.setup();
    render(<BuyingGuideFaqAccordion faqs={sixFaqs} />);

    const firstButton = screen.getByRole('button', { name: /Question 1\?/ });
    expect(firstButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Answer 1.')).not.toBeInTheDocument();

    await user.click(firstButton);

    expect(firstButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Answer 1.')).toBeInTheDocument();
    expect(screen.queryByText('Answer 2.')).not.toBeInTheDocument();
  });

  it('calls onExpand only when opening, not when closing', async () => {
    const onExpand = vi.fn();
    const user = userEvent.setup();
    render(<BuyingGuideFaqAccordion faqs={sixFaqs} onExpand={onExpand} />);

    const firstButton = screen.getByRole('button', { name: /Question 1\?/ });
    await user.click(firstButton);
    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(onExpand).toHaveBeenCalledWith('Question 1?');

    await user.click(firstButton);
    expect(onExpand).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard activation', async () => {
    const user = userEvent.setup();
    render(<BuyingGuideFaqAccordion faqs={sixFaqs} />);

    await user.tab();
    expect(screen.getByRole('button', { name: /Question 1\?/ })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Answer 1.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideFaqAccordion.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_PREVIEW_LIMIT = 5;

function BuyingGuideFaqAccordion({ faqs, onExpand }) {
  const [expandedIndexes, setExpandedIndexes] = useState(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const visibleFaqs = showAll ? faqs : faqs.slice(0, FAQ_PREVIEW_LIMIT);

  function toggle(index, question) {
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        onExpand?.(question);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {visibleFaqs.map((faq, index) => {
        const isExpanded = expandedIndexes.has(index);
        const answerId = `faq-answer-${index}`;
        return (
          <div key={index} className="rounded-card border border-border p-4">
            <button
              type="button"
              onClick={() => toggle(index, faq.question)}
              aria-expanded={isExpanded}
              aria-controls={answerId}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-sm font-semibold text-heading">{faq.question}</span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={`shrink-0 text-muted transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            {isExpanded && (
              <p id={answerId} className="mt-2 whitespace-pre-line text-sm text-body">
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
      {faqs.length > FAQ_PREVIEW_LIMIT && (
        <button type="button" onClick={() => setShowAll((prev) => !prev)} className="text-sm font-semibold text-primary hover:underline">
          {showAll ? 'Show fewer questions' : `View all ${faqs.length} questions`}
        </button>
      )}
    </div>
  );
}

export default BuyingGuideFaqAccordion;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideFaqAccordion.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/BuyingGuideFaqAccordion.jsx frontend/src/components/buying-guide/BuyingGuideFaqAccordion.test.jsx
git commit -m "feat(buying-guides): add shared BuyingGuideFaqAccordion component"
```

---

### Task 10: `BuyingGuideContentCard`

**Files:**
- Create: `frontend/src/components/buying-guide/BuyingGuideContentCard.jsx`
- Test: `frontend/src/components/buying-guide/BuyingGuideContentCard.test.jsx`

**Interfaces:**
- Consumes: `wordCount` (`utils/wordCount.js`).
- Produces: `<BuyingGuideContentCard title={string} content={string} anchorId={string} number={number} onExpand={fn?} />`. Clamps to 4 lines with a "Read more"/"Show less" toggle when `wordCount(content) > 40`; calls `onExpand(title)` only when expanding.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideContentCard from './BuyingGuideContentCard.jsx';

describe('BuyingGuideContentCard', () => {
  it('renders the numbered heading, anchor id, and content', () => {
    render(
      <BuyingGuideContentCard title="How We Tested" content="<p>Short body.</p>" anchorId="how-we-tested" number={1} />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('How We Tested')).toBeInTheDocument();
    const card = screen.getByText('How We Tested').closest('[id]');
    expect(card).toHaveAttribute('id', 'how-we-tested');
  });

  it('does not show a Read more toggle for short content', () => {
    render(<BuyingGuideContentCard title="Short" content="<p>Short body.</p>" anchorId="short" number={1} />);
    expect(screen.queryByText('Read more')).not.toBeInTheDocument();
  });

  it('shows a Read more toggle for long content and expands on click', async () => {
    const longContent = `<p>${'word '.repeat(50)}</p>`;
    const user = userEvent.setup();
    render(<BuyingGuideContentCard title="Long Section" content={longContent} anchorId="long-section" number={1} />);

    const toggle = screen.getByRole('button', { name: 'Read more' });
    await user.click(toggle);

    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });

  it('calls onExpand only when expanding', async () => {
    const onExpand = vi.fn();
    const longContent = `<p>${'word '.repeat(50)}</p>`;
    const user = userEvent.setup();
    render(<BuyingGuideContentCard title="Long Section" content={longContent} anchorId="long-section" number={1} onExpand={onExpand} />);

    const toggle = screen.getByRole('button', { name: 'Read more' });
    await user.click(toggle);
    expect(onExpand).toHaveBeenCalledWith('Long Section');

    await user.click(screen.getByRole('button', { name: 'Show less' }));
    expect(onExpand).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideContentCard.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { useState } from 'react';
import { wordCount } from '../../utils/wordCount.js';

const CONTENT_PREVIEW_WORD_LIMIT = 40;

function BuyingGuideContentCard({ title, content, anchorId, number, onExpand }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = wordCount(content) > CONTENT_PREVIEW_WORD_LIMIT;

  function toggle() {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);
    if (willExpand) onExpand?.(title);
  }

  return (
    <div id={anchorId} className="scroll-mt-24 rounded-card border border-border bg-white p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
          {number}
        </span>
        <h3 className="text-card-title text-heading">{title}</h3>
      </div>
      <div
        className={`prose prose-sm max-w-none text-body ${!isExpanded && isLong ? 'line-clamp-4' : ''}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {isLong && (
        <button type="button" onClick={toggle} className="mt-2 text-sm font-semibold text-primary hover:underline">
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}

export default BuyingGuideContentCard;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideContentCard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/BuyingGuideContentCard.jsx frontend/src/components/buying-guide/BuyingGuideContentCard.test.jsx
git commit -m "feat(buying-guides): add shared BuyingGuideContentCard component"
```

---

### Task 11: `GuideTableOfContents`

**Files:**
- Create: `frontend/src/components/buying-guide/GuideTableOfContents.jsx`
- Test: `frontend/src/components/buying-guide/GuideTableOfContents.test.jsx`

**Interfaces:**
- Produces: `<GuideTableOfContents items={{id, number, label, anchorId}[]} activeId={string|null} onNavigate={fn} />`. Pure/controlled — does no scrolling itself; calls `onNavigate(item)` on click (`preventDefault`ed). Desktop: sticky sidebar (`xl:sticky xl:top-16`), list always visible at `xl:`. Below `xl`: a toggle button controls visibility (`aria-expanded`/`aria-controls`). Returns `null` when `items` is empty.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GuideTableOfContents from './GuideTableOfContents.jsx';

const items = [
  { id: 'QUICK_RECOMMENDATIONS', number: 1, label: 'Quick Recommendations', anchorId: 'quick-recommendations' },
  { id: 'TOP_PICK', number: 2, label: 'Our Top Pick', anchorId: 'top-pick' },
];

describe('GuideTableOfContents', () => {
  it('renders numbered links for each item', () => {
    render(<GuideTableOfContents items={items} activeId={null} onNavigate={vi.fn()} />);

    expect(screen.getByRole('link', { name: /Quick Recommendations/ })).toHaveAttribute('href', '#quick-recommendations');
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('calls onNavigate with the clicked item instead of navigating', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<GuideTableOfContents items={items} activeId={null} onNavigate={onNavigate} />);

    await user.click(screen.getByRole('link', { name: /Our Top Pick/ }));

    expect(onNavigate).toHaveBeenCalledWith(items[1]);
  });

  it('marks the active item with aria-current', () => {
    render(<GuideTableOfContents items={items} activeId="TOP_PICK" onNavigate={vi.fn()} />);

    expect(screen.getByRole('link', { name: /Our Top Pick/ })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('link', { name: /Quick Recommendations/ })).not.toHaveAttribute('aria-current');
  });

  it('toggles visibility via an accessible mobile control', async () => {
    const user = userEvent.setup();
    render(<GuideTableOfContents items={items} activeId={null} onNavigate={vi.fn()} />);

    const toggle = screen.getByRole('button', { name: 'Table of Contents' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders nothing when there are no items', () => {
    const { container } = render(<GuideTableOfContents items={[]} activeId={null} onNavigate={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/GuideTableOfContents.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

function GuideTableOfContents({ items, activeId, onNavigate }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="rounded-card border border-border bg-white p-4 xl:sticky xl:top-16 xl:self-start">
      <button
        type="button"
        onClick={() => setIsMobileOpen((open) => !open)}
        aria-expanded={isMobileOpen}
        aria-controls="guide-toc-list"
        className="flex w-full items-center justify-between text-sm font-semibold text-heading xl:hidden"
      >
        Table of Contents
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 transition-transform motion-reduce:transition-none ${isMobileOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <span className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-muted xl:block">Table of Contents</span>
      <ul id="guide-toc-list" className={`space-y-1 ${isMobileOpen ? 'mt-3 block' : 'hidden'} xl:mt-0 xl:block`}>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.anchorId}`}
              aria-current={activeId === item.id ? 'true' : undefined}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item);
              }}
              className={`flex items-center gap-2 rounded-btn px-2 py-1.5 text-sm ${
                activeId === item.id ? 'bg-primary/10 font-semibold text-primary' : 'text-body hover:text-primary'
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {item.number}
              </span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default GuideTableOfContents;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/GuideTableOfContents.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/GuideTableOfContents.jsx frontend/src/components/buying-guide/GuideTableOfContents.test.jsx
git commit -m "feat(buying-guides): add GuideTableOfContents component"
```

---

### Task 12: `BuyingGuideBreadcrumbs`

**Files:**
- Create: `frontend/src/components/buying-guide/BuyingGuideBreadcrumbs.jsx`
- Test: `frontend/src/components/buying-guide/BuyingGuideBreadcrumbs.test.jsx`

**Interfaces:**
- Produces: `<BuyingGuideBreadcrumbs title={string} />`. Renders `Home / Buying Guides / {title}` with the first two as real links, the last as `<span aria-current="page">` with `truncate` for graceful small-screen wrapping.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BuyingGuideBreadcrumbs from './BuyingGuideBreadcrumbs.jsx';

function renderBreadcrumbs(title) {
  return render(
    <MemoryRouter>
      <BuyingGuideBreadcrumbs title={title} />
    </MemoryRouter>
  );
}

describe('BuyingGuideBreadcrumbs', () => {
  it('links Home and Buying Guides', () => {
    renderBreadcrumbs('Best Wireless Earbuds Under $100');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toHaveAttribute('href', '/buying-guides');
  });

  it('marks the guide title as the current page, not a link', () => {
    renderBreadcrumbs('Best Wireless Earbuds Under $100');

    const current = screen.getByText('Best Wireless Earbuds Under $100');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).not.toBe('A');
  });

  it('uses a nav landmark with an accessible name', () => {
    renderBreadcrumbs('Guide Title');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideBreadcrumbs.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { Link } from 'react-router-dom';

function BuyingGuideBreadcrumbs({ title }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/buying-guides" className="hover:text-primary">
            Buying Guides
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="min-w-0">
          <span aria-current="page" className="block max-w-[220px] truncate text-body sm:max-w-xs">
            {title}
          </span>
        </li>
      </ol>
    </nav>
  );
}

export default BuyingGuideBreadcrumbs;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideBreadcrumbs.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/BuyingGuideBreadcrumbs.jsx frontend/src/components/buying-guide/BuyingGuideBreadcrumbs.test.jsx
git commit -m "feat(buying-guides): add BuyingGuideBreadcrumbs component"
```

---

### Task 13: `BuyingGuideHero`

**Files:**
- Create: `frontend/src/components/buying-guide/BuyingGuideHero.jsx`
- Test: `frontend/src/components/buying-guide/BuyingGuideHero.test.jsx`

**Interfaces:**
- Consumes: `getImageUrl`.
- Produces: `<BuyingGuideHero title={string} excerpt={string} coverImageFilename={string|null} updatedAt={string|null} />`. Renders the `h1`, "BUYING GUIDE" badge, excerpt, "2G" avatar + "By 2Go Findz Team" + formatted updated date, and the featured image (or nothing when absent — no broken `<img>`).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BuyingGuideHero from './BuyingGuideHero.jsx';

describe('BuyingGuideHero', () => {
  it('renders the title as the page h1 and the excerpt', () => {
    render(
      <BuyingGuideHero
        title="Best Wireless Earbuds Under $100"
        excerpt="A curated guide to the best budget earbuds."
        coverImageFilename={null}
        updatedAt="2026-05-28T10:00:00"
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Best Wireless Earbuds Under $100' })).toBeInTheDocument();
    expect(screen.getByText('A curated guide to the best budget earbuds.')).toBeInTheDocument();
  });

  it('renders the byline with a formatted updated date', () => {
    render(<BuyingGuideHero title="Guide" excerpt="Excerpt" coverImageFilename={null} updatedAt="2026-05-28T10:00:00" />);
    expect(screen.getByText(/By 2Go Findz Team/)).toBeInTheDocument();
    expect(screen.getByText(/May 28, 2026/)).toBeInTheDocument();
  });

  it('renders the featured image with title as alt text when present', () => {
    render(<BuyingGuideHero title="Guide" excerpt="Excerpt" coverImageFilename="cover.png" updatedAt={null} />);
    expect(screen.getByAltText('Guide')).toBeInTheDocument();
  });

  it('renders no broken image element when the cover image is missing', () => {
    render(<BuyingGuideHero title="Guide" excerpt="Excerpt" coverImageFilename={null} updatedAt={null} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the BUYING GUIDE badge', () => {
    render(<BuyingGuideHero title="Guide" excerpt="Excerpt" coverImageFilename={null} updatedAt={null} />);
    expect(screen.getByText('BUYING GUIDE')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideHero.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { getImageUrl } from '../../utils/imageUrl.js';

function formatUpdatedDate(updatedAt) {
  if (!updatedAt) return null;
  return new Date(updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function BuyingGuideHero({ title, excerpt, coverImageFilename, updatedAt }) {
  const imageUrl = getImageUrl(coverImageFilename);
  const formattedDate = formatUpdatedDate(updatedAt);

  return (
    <div className="rounded-card border border-border bg-white p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Buying Guide
          </span>
          <h1 className="mb-3 text-page-heading text-heading">{title}</h1>
          {excerpt && <p className="mb-4 text-body">{excerpt}</p>}
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              2G
            </span>
            <span>
              By 2Go Findz Team{formattedDate ? ` · Updated ${formattedDate}` : ''}
            </span>
          </div>
        </div>
        {imageUrl && (
          <div className="aspect-video overflow-hidden rounded-image bg-surface-secondary">
            <img src={imageUrl} alt={title} loading="eager" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

export default BuyingGuideHero;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideHero.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/BuyingGuideHero.jsx frontend/src/components/buying-guide/BuyingGuideHero.test.jsx
git commit -m "feat(buying-guides): add BuyingGuideHero component"
```

---

### Task 14: `QuickRecommendationsSection`

**Files:**
- Create: `frontend/src/components/buying-guide/QuickRecommendationsSection.jsx`
- Test: `frontend/src/components/buying-guide/QuickRecommendationsSection.test.jsx`

**Interfaces:**
- Consumes: `AmazonAffiliateButton`, `getImageUrl`, `getAmazonMarketplace`, the admin's existing `QuickPickBadge` (`components/buying-guide-form/QuickPickBadge.jsx` — reused as-is, it has no admin-only dependencies).
- Produces: `<QuickRecommendationsSection quickRecommendations={PublicBuyingGuideQuickRecommendationResponse[]} number={number} guideId={number} onAffiliateClick={fn} />`, where each item is `{ product: {id, name, imageFileName, productPrice, productLink, rating, reviewCount}, badgeName }`. Returns `null` when empty.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuickRecommendationsSection from './QuickRecommendationsSection.jsx';

const quickRecommendations = [
  {
    product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: 69.99, productLink: 'https://amazon.com/dp/B00A', rating: 4.5, reviewCount: 12850 },
    badgeName: 'Best Overall',
  },
  {
    product: { id: 2, name: 'JLab Go Air Pop', imageFileName: null, productPrice: 24.99, productLink: 'https://amazon.com/dp/B00B', rating: null, reviewCount: 0 },
    badgeName: 'Best Budget',
  },
];

describe('QuickRecommendationsSection', () => {
  it('renders the numbered heading and one card per recommendation', () => {
    render(<QuickRecommendationsSection quickRecommendations={quickRecommendations} number={1} guideId={3} onAffiliateClick={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /1\. Quick Recommendations/ })).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('JLab Go Air Pop')).toBeInTheDocument();
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
  });

  it('hides rating text for products without a rating', () => {
    render(<QuickRecommendationsSection quickRecommendations={quickRecommendations} number={1} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(screen.getAllByText(/★/)).toHaveLength(1);
  });

  it('fires onAffiliateClick with product and placement context', async () => {
    const onAffiliateClick = vi.fn();
    const user = userEvent.setup();
    render(<QuickRecommendationsSection quickRecommendations={quickRecommendations} number={1} guideId={3} onAffiliateClick={onAffiliateClick} />);

    await user.click(screen.getByRole('link', { name: /Soundcore Liberty 4 NC/ }));

    expect(onAffiliateClick).toHaveBeenCalledWith(expect.objectContaining({ productId: 1, placement: 0 }));
  });

  it('renders nothing when there are no quick recommendations', () => {
    const { container } = render(<QuickRecommendationsSection quickRecommendations={[]} number={1} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/QuickRecommendationsSection.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import AmazonAffiliateButton from '../AmazonAffiliateButton.jsx';
import QuickPickBadge from '../buying-guide-form/QuickPickBadge.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { getAmazonMarketplace } from '../../utils/amazonLink.js';

function QuickRecommendationsSection({ quickRecommendations, number, guideId, onAffiliateClick }) {
  if (quickRecommendations.length === 0) return null;

  return (
    <section aria-labelledby="quick-recommendations-heading" id="quick-recommendations" className="scroll-mt-24">
      <h2 id="quick-recommendations-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. Quick Recommendations
      </h2>
      <div className="grid grid-cols-1 gap-4 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {quickRecommendations.map(({ product, badgeName }, index) => {
          const imageUrl = getImageUrl(product.imageFileName);
          return (
            <div key={product.id} className="rounded-card border border-border bg-white p-4">
              <QuickPickBadge label={badgeName || 'Untitled Badge'} index={index} />
              <div className="my-3 aspect-square overflow-hidden rounded-md bg-surface-secondary">
                {imageUrl && <img src={imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />}
              </div>
              <p className="mb-1 text-sm font-semibold text-heading">{product.name}</p>
              {product.rating != null && (
                <p className="mb-1 text-xs text-muted">
                  ★ {product.rating} ({(product.reviewCount ?? 0).toLocaleString()})
                </p>
              )}
              <p className="mb-3 text-sm font-semibold text-heading">${Number(product.productPrice).toFixed(2)}</p>
              <AmazonAffiliateButton
                productName={product.name}
                url={product.productLink}
                onClick={() =>
                  onAffiliateClick({
                    guideId,
                    productId: product.id,
                    section: 'quick_recommendations',
                    placement: index,
                    marketplace: getAmazonMarketplace(product.productLink),
                  })
                }
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default QuickRecommendationsSection;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/QuickRecommendationsSection.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/QuickRecommendationsSection.jsx frontend/src/components/buying-guide/QuickRecommendationsSection.test.jsx
git commit -m "feat(buying-guides): add QuickRecommendationsSection component"
```

---

### Task 15: `ProductComparisonSection`

**Files:**
- Create: `frontend/src/components/buying-guide/ProductComparisonSection.jsx`
- Test: `frontend/src/components/buying-guide/ProductComparisonSection.test.jsx`

**Interfaces:**
- Consumes: `ComparisonTable`, `isSupportedAmazonUrl`, `getAmazonMarketplace`.
- Produces: `<ProductComparisonSection comparisonTable={PublicBuyingGuideComparisonTableResponse|null} number={number} guideId={number} onProductClick={fn} />`. Shows the price notice only when a specification name matches `/price/i`. Product name in each column header links to that product's Amazon URL when valid (there's no internal product-detail page on the public site), firing `onProductClick`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductComparisonSection from './ProductComparisonSection.jsx';

const comparisonTable = {
  specificationNames: ['Price', 'Battery Life'],
  rows: [
    { product: { id: 1, name: 'TOZO NC9', imageFileName: null, productLink: 'https://amazon.com/dp/B00A' }, specificationValues: ['$39.99', '40 Hrs'] },
  ],
};

describe('ProductComparisonSection', () => {
  it('renders the numbered heading and the comparison table', () => {
    render(<ProductComparisonSection comparisonTable={comparisonTable} number={2} guideId={3} onProductClick={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /2\. Product Comparison/ })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows the price notice when a Price specification is present', () => {
    render(<ProductComparisonSection comparisonTable={comparisonTable} number={2} guideId={3} onProductClick={vi.fn()} />);
    expect(screen.getByText(/Prices and availability may change/)).toBeInTheDocument();
  });

  it('omits the price notice when no price specification is shown', () => {
    const withoutPrice = { specificationNames: ['Battery Life'], rows: comparisonTable.rows };
    render(<ProductComparisonSection comparisonTable={withoutPrice} number={2} guideId={3} onProductClick={vi.fn()} />);
    expect(screen.queryByText(/Prices and availability may change/)).not.toBeInTheDocument();
  });

  it('links product names to their Amazon URL and fires onProductClick', async () => {
    const onProductClick = vi.fn();
    const user = userEvent.setup();
    render(<ProductComparisonSection comparisonTable={comparisonTable} number={2} guideId={3} onProductClick={onProductClick} />);

    const link = screen.getByRole('link', { name: 'TOZO NC9' });
    expect(link).toHaveAttribute('href', 'https://amazon.com/dp/B00A');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');

    await user.click(link);
    expect(onProductClick).toHaveBeenCalledWith(expect.objectContaining({ guideId: 3, productId: 1 }));
  });

  it('renders nothing when there is no comparison table', () => {
    const { container } = render(<ProductComparisonSection comparisonTable={null} number={2} guideId={3} onProductClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/ProductComparisonSection.test.jsx`
Expected: FAIL — module doesn't exist, and the product-name-as-link behavior doesn't exist in the plain `ComparisonTable`.

- [ ] **Step 3: Implement**

This section renders its own product-name header row (with links) above `ComparisonTable`'s spec rows, rather than modifying `ComparisonTable` itself (keeping `ComparisonTable` a dumb, link-free renderer reusable by `LivePreview.jsx`, which has its own separate in-page anchor-link behavior for product names). To avoid rendering two `<thead>`s, `ProductComparisonSection` builds the full table itself using the same `renderCellValue` logic — duplicating the ~15-line cell-rendering helper would violate DRY, so instead `ComparisonTable` is extended with an optional `renderProductHeader` render-prop that defaults to plain text (used by `LivePreview.jsx`) and is overridden here to render a link:

Update `ComparisonTable.jsx`'s signature and header cell:

```jsx
function ComparisonTable({ comparisonTable, renderProductHeader }) {
  if (!comparisonTable || comparisonTable.rows.length === 0) return null;
  const { specificationNames, rows } = comparisonTable;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <caption className="sr-only">Comparison of {rows.map((row) => row.product.name).join(', ')}</caption>
        <thead className="bg-slate-900">
          <tr>
            <th scope="col" className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
              Feature
            </th>
            {rows.map((row) => {
              const imageUrl = getImageUrl(row.product.imageFileName);
              return (
                <th key={row.product.id} scope="col" className="p-3 text-center text-xs font-semibold text-white">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt=""
                      loading="lazy"
                      className="mx-auto mb-1 h-10 w-10 rounded-md object-cover"
                    />
                  )}
                  {renderProductHeader ? renderProductHeader(row.product) : row.product.name}
                </th>
              );
            })}
          </tr>
        </thead>
        {/* ...tbody unchanged... */}
      </table>
    </div>
  );
}
```

Add a step 3a to `ComparisonTable.test.jsx` verifying the default (no `renderProductHeader`) still renders plain text — this is covered by the existing "renders a semantic table" test since it doesn't pass the prop, so no new test is strictly required there, but add one explicit case:

```jsx
  it('uses a custom renderProductHeader when provided', () => {
    render(
      <ComparisonTable
        comparisonTable={comparisonTable}
        renderProductHeader={(product) => <a href={`#custom-${product.id}`}>{product.name} (custom)</a>}
      />
    );
    expect(screen.getByRole('link', { name: 'TOZO NC9 (custom)' })).toBeInTheDocument();
  });
```

Now implement `ProductComparisonSection.jsx`:

```jsx
import ComparisonTable from './ComparisonTable.jsx';
import { isSupportedAmazonUrl, getAmazonMarketplace } from '../../utils/amazonLink.js';

function ProductComparisonSection({ comparisonTable, number, guideId, onProductClick }) {
  if (!comparisonTable || comparisonTable.rows.length === 0) return null;

  const hasPrice = comparisonTable.specificationNames.some((name) => /price/i.test(name));

  return (
    <section aria-labelledby="product-comparison-heading" id="product-comparison" className="scroll-mt-24">
      <h2 id="product-comparison-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. Product Comparison
      </h2>
      <ComparisonTable
        comparisonTable={comparisonTable}
        renderProductHeader={(product) =>
          isSupportedAmazonUrl(product.productLink) ? (
            <a
              href={product.productLink}
              target="_blank"
              rel="nofollow sponsored noopener noreferrer"
              onClick={() =>
                onProductClick({
                  guideId,
                  productId: product.id,
                  section: 'product_comparison',
                  marketplace: getAmazonMarketplace(product.productLink),
                })
              }
              className="hover:underline"
            >
              {product.name}
            </a>
          ) : (
            product.name
          )
        }
      />
      {hasPrice && <p className="mt-2 text-xs text-muted">Prices and availability may change after publication.</p>}
    </section>
  );
}

export default ProductComparisonSection;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide/ComparisonTable.test.jsx src/components/buying-guide/ProductComparisonSection.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/ComparisonTable.jsx frontend/src/components/buying-guide/ComparisonTable.test.jsx frontend/src/components/buying-guide/ProductComparisonSection.jsx frontend/src/components/buying-guide/ProductComparisonSection.test.jsx
git commit -m "feat(buying-guides): add ProductComparisonSection and renderProductHeader hook to ComparisonTable"
```

---

### Task 16: `TopPickSection`

**Files:**
- Create: `frontend/src/components/buying-guide/TopPickSection.jsx`
- Test: `frontend/src/components/buying-guide/TopPickSection.test.jsx`

**Interfaces:**
- Consumes: `RecommendationCard`, `getAmazonMarketplace`.
- Produces: `<TopPickSection topPick={PublicBuyingGuideRecommendationSectionResponse|null} number={number} guideId={number} onAffiliateClick={fn} />`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TopPickSection from './TopPickSection.jsx';

const topPick = {
  product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: 69.99, productLink: 'https://amazon.com/dp/B00A', rating: 4.5, reviewCount: 12850 },
  recommendationType: 'TOP_PICK',
  sectionLabel: 'Best Overall',
  whyRecommended: '<p>Great value.</p>',
  pros: [],
  cons: [],
  bestFor: [],
  badgeName: 'Best Overall',
};

describe('TopPickSection', () => {
  it('renders the numbered heading and the recommendation card', () => {
    render(<TopPickSection topPick={topPick} number={3} guideId={3} onAffiliateClick={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /3\. Our Top Pick/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Soundcore Liberty 4 NC' })).toBeInTheDocument();
  });

  it('fires onAffiliateClick with top_pick section context', async () => {
    const onAffiliateClick = vi.fn();
    const user = userEvent.setup();
    render(<TopPickSection topPick={topPick} number={3} guideId={3} onAffiliateClick={onAffiliateClick} />);

    await user.click(screen.getByRole('link', { name: /Soundcore Liberty 4 NC/ }));

    expect(onAffiliateClick).toHaveBeenCalledWith(expect.objectContaining({ guideId: 3, productId: 1, section: 'top_pick' }));
  });

  it('renders nothing when there is no Top Pick', () => {
    const { container } = render(<TopPickSection topPick={null} number={3} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/TopPickSection.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import RecommendationCard from './RecommendationCard.jsx';
import { getAmazonMarketplace } from '../../utils/amazonLink.js';

function TopPickSection({ topPick, number, guideId, onAffiliateClick }) {
  if (!topPick) return null;

  return (
    <section aria-labelledby="top-pick-heading" id="top-pick" className="scroll-mt-24">
      <h2 id="top-pick-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. Our Top Pick
      </h2>
      <RecommendationCard
        recommendation={topPick}
        rank={null}
        onAffiliateClick={() =>
          onAffiliateClick({
            guideId,
            productId: topPick.product.id,
            section: 'top_pick',
            marketplace: getAmazonMarketplace(topPick.product.productLink),
          })
        }
      />
    </section>
  );
}

export default TopPickSection;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/TopPickSection.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/TopPickSection.jsx frontend/src/components/buying-guide/TopPickSection.test.jsx
git commit -m "feat(buying-guides): add TopPickSection component"
```

---

### Task 17: `RunnerUpsSection`

**Files:**
- Create: `frontend/src/components/buying-guide/RunnerUpsSection.jsx`
- Test: `frontend/src/components/buying-guide/RunnerUpsSection.test.jsx`

**Interfaces:**
- Consumes: `RecommendationCard`, `getAmazonMarketplace`.
- Produces: `<RunnerUpsSection runnerUps={PublicBuyingGuideRecommendationSectionResponse[]} number={number} guideId={number} onAffiliateClick={fn} />`. Shows the first 4; "See all reviewed products" real expand/collapse control appears only when more than 4 exist.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RunnerUpsSection from './RunnerUpsSection.jsx';

function makeRunnerUp(id, name) {
  return {
    product: { id, name, imageFileName: null, productPrice: 19.99, productLink: `https://amazon.com/dp/B00${id}`, rating: null, reviewCount: 0 },
    recommendationType: 'RUNNER_UP',
    sectionLabel: 'Best Budget Pick',
    whyRecommended: '<p>Solid value.</p>',
    pros: [],
    cons: [],
    bestFor: [],
    badgeName: 'Best Budget Pick',
  };
}

describe('RunnerUpsSection', () => {
  it('renders the numbered heading and one card per runner-up, ranked in order', () => {
    const runnerUps = [makeRunnerUp(1, 'Collagen Gummy'), makeRunnerUp(2, 'Magnesium Complex')];
    render(<RunnerUpsSection runnerUps={runnerUps} number={4} guideId={3} onAffiliateClick={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /4\. Runner-Ups/ })).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('does not show "See all" when there are 4 or fewer runner-ups', () => {
    const runnerUps = [makeRunnerUp(1, 'A'), makeRunnerUp(2, 'B')];
    render(<RunnerUpsSection runnerUps={runnerUps} number={4} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(screen.queryByText(/See all/)).not.toBeInTheDocument();
  });

  it('shows a real "See all reviewed products" toggle beyond 4, revealing the rest', async () => {
    const runnerUps = Array.from({ length: 6 }, (_, i) => makeRunnerUp(i + 1, `Product ${i + 1}`));
    const user = userEvent.setup();
    render(<RunnerUpsSection runnerUps={runnerUps} number={4} guideId={3} onAffiliateClick={vi.fn()} />);

    expect(screen.queryByText('Product 5')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'See all reviewed products' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(screen.getByText('Product 5')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders nothing when there are no runner-ups', () => {
    const { container } = render(<RunnerUpsSection runnerUps={[]} number={4} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/RunnerUpsSection.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { useState } from 'react';
import RecommendationCard from './RecommendationCard.jsx';
import { getAmazonMarketplace } from '../../utils/amazonLink.js';

const INITIAL_VISIBLE_COUNT = 4;

function RunnerUpsSection({ runnerUps, number, guideId, onAffiliateClick }) {
  const [showAll, setShowAll] = useState(false);
  if (runnerUps.length === 0) return null;

  const visibleRunnerUps = showAll ? runnerUps : runnerUps.slice(0, INITIAL_VISIBLE_COUNT);

  return (
    <section aria-labelledby="runner-ups-heading" id="runner-ups" className="scroll-mt-24">
      <h2 id="runner-ups-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. Runner-Ups
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {visibleRunnerUps.map((runnerUp, index) => (
          <RecommendationCard
            key={runnerUp.product.id}
            recommendation={runnerUp}
            rank={index + 1}
            onAffiliateClick={() =>
              onAffiliateClick({
                guideId,
                productId: runnerUp.product.id,
                section: 'runner_up',
                placement: index,
                marketplace: getAmazonMarketplace(runnerUp.product.productLink),
              })
            }
          />
        ))}
      </div>
      {runnerUps.length > INITIAL_VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          aria-expanded={showAll}
          className="mt-4 text-sm font-semibold text-primary hover:underline"
        >
          {showAll ? 'Show fewer runner-ups' : 'See all reviewed products'}
        </button>
      )}
    </section>
  );
}

export default RunnerUpsSection;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/RunnerUpsSection.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/RunnerUpsSection.jsx frontend/src/components/buying-guide/RunnerUpsSection.test.jsx
git commit -m "feat(buying-guides): add RunnerUpsSection component"
```

---

### Task 18: `BuyingGuideContentSection`

**Files:**
- Create: `frontend/src/components/buying-guide/BuyingGuideContentSection.jsx`
- Test: `frontend/src/components/buying-guide/BuyingGuideContentSection.test.jsx`

**Interfaces:**
- Consumes: `BuyingGuideContentCard`.
- Produces: `<BuyingGuideContentSection sections={{title, content, anchorId}[]} number={number} guideId={number} onExpand={fn} />` — `sections` here are already-filtered custom entries with pre-computed anchor IDs (computed once by the page, per the design doc's correctness note — this component does not compute anchors itself).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideContentSection from './BuyingGuideContentSection.jsx';

const sections = [
  { title: 'How We Tested', content: '<p>We tested for a week.</p>', anchorId: 'how-we-tested' },
  { title: 'What to Look For', content: '<p>Look for battery life.</p>', anchorId: 'what-to-look-for' },
];

describe('BuyingGuideContentSection', () => {
  it('renders the numbered heading and one card per section, numbered from 1', () => {
    render(<BuyingGuideContentSection sections={sections} number={5} guideId={3} onExpand={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /5\. Buying Guide/ })).toBeInTheDocument();
    expect(screen.getByText('How We Tested')).toBeInTheDocument();
    expect(screen.getByText('What to Look For')).toBeInTheDocument();
  });

  it('forwards onExpand from an individual card', async () => {
    const onExpand = vi.fn();
    const longContent = `<p>${'word '.repeat(50)}</p>`;
    const user = userEvent.setup();
    render(
      <BuyingGuideContentSection
        sections={[{ title: 'Long Section', content: longContent, anchorId: 'long-section' }]}
        number={5}
        guideId={3}
        onExpand={onExpand}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Read more' }));
    expect(onExpand).toHaveBeenCalledWith(expect.objectContaining({ guideId: 3, title: 'Long Section' }));
  });

  it('renders nothing when there are no custom sections', () => {
    const { container } = render(<BuyingGuideContentSection sections={[]} number={5} guideId={3} onExpand={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideContentSection.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import BuyingGuideContentCard from './BuyingGuideContentCard.jsx';

function BuyingGuideContentSection({ sections, number, guideId, onExpand }) {
  if (sections.length === 0) return null;

  return (
    <section aria-labelledby="buying-guide-content-heading" id="buying-guide" className="scroll-mt-24">
      <h2 id="buying-guide-content-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. Buying Guide
      </h2>
      <div className="space-y-4">
        {sections.map((section, index) => (
          <BuyingGuideContentCard
            key={section.anchorId}
            title={section.title}
            content={section.content}
            anchorId={section.anchorId}
            number={index + 1}
            onExpand={(title) => onExpand({ guideId, title })}
          />
        ))}
      </div>
    </section>
  );
}

export default BuyingGuideContentSection;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideContentSection.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/BuyingGuideContentSection.jsx frontend/src/components/buying-guide/BuyingGuideContentSection.test.jsx
git commit -m "feat(buying-guides): add BuyingGuideContentSection component"
```

---

### Task 19: `BuyingGuideFaqSection`

**Files:**
- Create: `frontend/src/components/buying-guide/BuyingGuideFaqSection.jsx`
- Test: `frontend/src/components/buying-guide/BuyingGuideFaqSection.test.jsx`

**Interfaces:**
- Consumes: `BuyingGuideFaqAccordion`.
- Produces: `<BuyingGuideFaqSection faqs={{question,answer}[]} number={number} guideId={number} onExpand={fn} />`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideFaqSection from './BuyingGuideFaqSection.jsx';

const faqs = [{ question: 'Is it worth it?', answer: 'Yes.' }];

describe('BuyingGuideFaqSection', () => {
  it('renders the numbered heading and the accordion', () => {
    render(<BuyingGuideFaqSection faqs={faqs} number={6} guideId={3} onExpand={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /6\. Frequently Asked Questions/ })).toBeInTheDocument();
    expect(screen.getByText('Is it worth it?')).toBeInTheDocument();
  });

  it('forwards onExpand with guide context', async () => {
    const onExpand = vi.fn();
    const user = userEvent.setup();
    render(<BuyingGuideFaqSection faqs={faqs} number={6} guideId={3} onExpand={onExpand} />);

    await user.click(screen.getByRole('button', { name: /Is it worth it\?/ }));

    expect(onExpand).toHaveBeenCalledWith(expect.objectContaining({ guideId: 3, question: 'Is it worth it?' }));
  });

  it('renders nothing when there are no FAQs', () => {
    const { container } = render(<BuyingGuideFaqSection faqs={[]} number={6} guideId={3} onExpand={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideFaqSection.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import BuyingGuideFaqAccordion from './BuyingGuideFaqAccordion.jsx';

function BuyingGuideFaqSection({ faqs, number, guideId, onExpand }) {
  if (faqs.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" id="faq" className="scroll-mt-24">
      <h2 id="faq-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. Frequently Asked Questions
      </h2>
      <BuyingGuideFaqAccordion faqs={faqs} onExpand={(question) => onExpand({ guideId, question })} />
    </section>
  );
}

export default BuyingGuideFaqSection;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/BuyingGuideFaqSection.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/BuyingGuideFaqSection.jsx frontend/src/components/buying-guide/BuyingGuideFaqSection.test.jsx
git commit -m "feat(buying-guides): add BuyingGuideFaqSection component"
```

---

### Task 20: `FinalRecommendationSection`

**Files:**
- Create: `frontend/src/components/buying-guide/FinalRecommendationSection.jsx`
- Test: `frontend/src/components/buying-guide/FinalRecommendationSection.test.jsx`

**Interfaces:**
- Consumes: `AmazonAffiliateButton`, `getAmazonMarketplace`.
- Produces: `<FinalRecommendationSection topPick={PublicBuyingGuideRecommendationSectionResponse|null} number={number} guideId={number} onAffiliateClick={fn} />`. Derives a plain-text summary from `topPick.whyRecommended` (strip tags, truncate to 200 chars at a word boundary). Renders nothing when `topPick` is `null`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FinalRecommendationSection from './FinalRecommendationSection.jsx';

const topPick = {
  product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: 69.99, productLink: 'https://amazon.com/dp/B00A' },
  recommendationType: 'TOP_PICK',
  sectionLabel: 'Best Overall',
  whyRecommended: '<p>It offers the perfect combination of premium sound quality, powerful noise cancellation, and all-day comfort.</p>',
  pros: [],
  cons: [],
  bestFor: [],
  badgeName: 'Best Overall',
};

describe('FinalRecommendationSection', () => {
  it('renders the numbered heading, a summary derived from whyRecommended, and a named CTA', () => {
    render(<FinalRecommendationSection topPick={topPick} number={7} guideId={3} onAffiliateClick={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /7\. Final Recommendation/ })).toBeInTheDocument();
    expect(screen.getByText(/It offers the perfect combination/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Soundcore Liberty 4 NC on Amazon' })).toBeInTheDocument();
  });

  it('truncates a long summary at a word boundary without leaving raw HTML', () => {
    const longWhyRecommended = `<p>${'word '.repeat(60)}</p>`;
    render(<FinalRecommendationSection topPick={{ ...topPick, whyRecommended: longWhyRecommended }} number={7} guideId={3} onAffiliateClick={vi.fn()} />);

    const summary = screen.getByText(/word word word/);
    expect(summary.textContent).not.toContain('<p>');
    expect(summary.textContent.length).toBeLessThanOrEqual(210);
  });

  it('fires onAffiliateClick with final_recommendation context', async () => {
    const onAffiliateClick = vi.fn();
    const user = userEvent.setup();
    render(<FinalRecommendationSection topPick={topPick} number={7} guideId={3} onAffiliateClick={onAffiliateClick} />);

    await user.click(screen.getByRole('link', { name: /Soundcore Liberty 4 NC/ }));

    expect(onAffiliateClick).toHaveBeenCalledWith(expect.objectContaining({ guideId: 3, productId: 1, section: 'final_recommendation' }));
  });

  it('renders nothing when there is no Top Pick', () => {
    const { container } = render(<FinalRecommendationSection topPick={null} number={7} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide/FinalRecommendationSection.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { Trophy } from 'lucide-react';
import AmazonAffiliateButton from '../AmazonAffiliateButton.jsx';
import { getAmazonMarketplace } from '../../utils/amazonLink.js';

const SUMMARY_CHAR_LIMIT = 200;

function summarize(html) {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= SUMMARY_CHAR_LIMIT) return text;
  const truncated = text.slice(0, SUMMARY_CHAR_LIMIT);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${truncated.slice(0, lastSpace)}…`;
}

function FinalRecommendationSection({ topPick, number, guideId, onAffiliateClick }) {
  if (!topPick) return null;
  const summary = summarize(topPick.whyRecommended ?? '');

  return (
    <section
      aria-labelledby="final-recommendation-heading"
      id="final-recommendation"
      className="scroll-mt-24 rounded-card border border-amber-200 bg-amber-50 p-6 text-center sm:p-8"
    >
      <Trophy size={32} className="mx-auto mb-3 text-amber-500" aria-hidden="true" />
      <h2 id="final-recommendation-heading" className="mb-2 text-card-title text-heading">
        {number}. Final Recommendation
      </h2>
      {summary && <p className="mx-auto mb-5 max-w-xl text-body">{summary}</p>}
      <div className="mx-auto max-w-xs">
        <AmazonAffiliateButton
          productName={topPick.product.name}
          url={topPick.product.productLink}
          onClick={() =>
            onAffiliateClick({
              guideId,
              productId: topPick.product.id,
              section: 'final_recommendation',
              marketplace: getAmazonMarketplace(topPick.product.productLink),
            })
          }
        >
          {`View ${topPick.product.name} on Amazon`}
        </AmazonAffiliateButton>
      </div>
    </section>
  );
}

export default FinalRecommendationSection;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide/FinalRecommendationSection.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/FinalRecommendationSection.jsx frontend/src/components/buying-guide/FinalRecommendationSection.test.jsx
git commit -m "feat(buying-guides): add FinalRecommendationSection component"
```

---

### Task 21: Fix the slug/id routing bug in the listing page and service

**Files:**
- Modify: `frontend/src/services/buyingGuideService.js`
- Modify: `frontend/src/pages/BuyingGuidesPage.jsx`
- Modify: `frontend/src/pages/BuyingGuidesPage.test.jsx` (create if it doesn't exist — check first)

**Interfaces:**
- Produces: `getBuyingGuideBySlug(slug)` replaces `getBuyingGuideById(id)` in `services/buyingGuideService.js` (same endpoint, correctly named — `id` was never actually an id).

- [ ] **Step 1: Check for an existing test file and read it**

Run: `ls frontend/src/pages/BuyingGuidesPage.test.jsx 2>/dev/null && cat frontend/src/pages/BuyingGuidesPage.test.jsx || echo "none"`

If a test file exists, add the new assertion into its existing structure. If not, create one matching the pattern below.

- [ ] **Step 2: Write the failing test**

Add/create in `BuyingGuidesPage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BuyingGuidesPage from './BuyingGuidesPage.jsx';
import * as buyingGuideService from '../services/buyingGuideService.js';
import * as settingsService from '../services/settingsService.js';

describe('BuyingGuidesPage', () => {
  beforeEach(() => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Disclosure.' });
  });

  it('links each guide card to its slug, not its numeric id', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuides').mockResolvedValue([
      { id: 42, slug: 'best-wireless-earbuds-under-100', title: 'Best Wireless Earbuds Under $100', excerpt: 'Excerpt', coverImageFilename: null },
    ]);

    render(
      <MemoryRouter>
        <BuyingGuidesPage />
      </MemoryRouter>
    );

    const link = await screen.findByRole('link', { name: /Best Wireless Earbuds Under \$100/ });
    expect(link).toHaveAttribute('href', '/buying-guides/best-wireless-earbuds-under-100');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/BuyingGuidesPage.test.jsx`
Expected: FAIL — link currently points at `/buying-guides/42`.

- [ ] **Step 4: Fix `buyingGuideService.js`**

```js
import api from './api.js';

export async function getBuyingGuides() {
  const response = await api.get('/public/buying-guides');
  return response.data.data;
}

export async function getBuyingGuideBySlug(slug) {
  const response = await api.get(`/public/buying-guides/${slug}`);
  return response.data.data;
}
```

- [ ] **Step 5: Fix `BuyingGuidesPage.jsx`'s link**

Change:

```jsx
                <Link
                  key={guide.id}
                  to={`/buying-guides/${guide.id}`}
```

to:

```jsx
                <Link
                  key={guide.id}
                  to={`/buying-guides/${guide.slug}`}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/BuyingGuidesPage.test.jsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/services/buyingGuideService.js frontend/src/pages/BuyingGuidesPage.jsx frontend/src/pages/BuyingGuidesPage.test.jsx
git commit -m "fix(buying-guides): link guide cards by slug instead of numeric id"
```

---

### Task 22: `PublishedBuyingGuidePage` — assemble the full page and wire the route

**Files:**
- Create: `frontend/src/pages/PublishedBuyingGuidePage.jsx`
- Test: `frontend/src/pages/PublishedBuyingGuidePage.test.jsx`
- Delete: `frontend/src/pages/BuyingGuideDetailPage.jsx`
- Delete: `frontend/src/pages/BuyingGuideDetailPage.test.jsx`
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: every component from Tasks 6–20, `getBuyingGuideBySlug` (Task 21), `getSettings`, `useDocumentHead` (Task 3), `trackEvent` (Task 4), `computeGuideSectionNumbers` (Task 2), `buildFaqJsonLd` (`utils/faqJsonLd.js`, existing, unchanged), `buildGuideUrl` (`utils/siteUrl.js`, existing), `uniqueSlug` (`utils/slugify.js`, existing), `getImageUrl`, `Navbar`, `Footer`, `LoadingSpinner`, `ErrorState`.
- Produces: the page rendered at `/buying-guides/:slug`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublishedBuyingGuidePage from './PublishedBuyingGuidePage.jsx';
import * as buyingGuideService from '../services/buyingGuideService.js';
import * as settingsService from '../services/settingsService.js';

function fullGuide(overrides = {}) {
  return {
    id: 3,
    title: 'Best Wireless Earbuds Under $100',
    slug: 'best-wireless-earbuds-under-100',
    excerpt: 'A curated guide to the best budget wireless earbuds.',
    introduction: '<p>Intro.</p>',
    coverImageFilename: null,
    categoryName: 'Electronics',
    seoTitle: null,
    seoDescription: null,
    createdAt: '2026-05-01T10:00:00',
    updatedAt: '2026-05-28T10:00:00',
    publishedAt: '2026-05-01T10:00:00',
    recommendedProducts: [],
    quickRecommendations: [
      {
        product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: 69.99, productLink: 'https://amazon.com/dp/B00A', rating: 4.5, reviewCount: 12850 },
        badgeName: 'Best Overall',
      },
    ],
    comparisonTable: null,
    topPick: {
      product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: 69.99, productLink: 'https://amazon.com/dp/B00A', rating: 4.5, reviewCount: 12850 },
      recommendationType: 'TOP_PICK',
      sectionLabel: 'Best Overall',
      whyRecommended: '<p>Great value.</p>',
      pros: [],
      cons: [],
      bestFor: [],
      badgeName: 'Best Overall',
    },
    runnerUps: [],
    faqs: [{ question: 'Is it worth it?', answer: 'Yes.' }],
    tocEntries: [
      { sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '' },
      { sectionKey: 'TOP_PICK', title: '', content: '' },
      { sectionKey: 'FAQS', title: '', content: '' },
    ],
    focusKeyword: null,
    canonicalUrl: null,
    visibility: 'PUBLIC',
    robotsIndex: true,
    robotsFollow: true,
    openGraphTitle: null,
    openGraphDescription: null,
    openGraphImageFilename: null,
    twitterCardType: 'summary_large_image',
    ...overrides,
  };
}

function renderAtSlug(slug) {
  return render(
    <MemoryRouter initialEntries={[`/buying-guides/${slug}`]}>
      <Routes>
        <Route path="/buying-guides/:slug" element={<PublishedBuyingGuidePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PublishedBuyingGuidePage', () => {
  beforeEach(() => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Disclosure.' });
  });

  it('shows a loading state, then the guide title as the page h1', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide());
    renderAtSlug('best-wireless-earbuds-under-100');

    expect(screen.getByRole('status')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { level: 1, name: 'Best Wireless Earbuds Under $100' })).toBeInTheDocument();
  });

  it('renders only sections with real data, correctly renumbered', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide());
    renderAtSlug('best-wireless-earbuds-under-100');

    expect(await screen.findByRole('heading', { name: /1\. Quick Recommendations/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /2\. Our Top Pick/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Product Comparison/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /3\. Frequently Asked Questions/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /4\. Final Recommendation/ })).toBeInTheDocument();
  });

  it('renders the breadcrumb with the real guide title', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide());
    renderAtSlug('best-wireless-earbuds-under-100');

    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText('Best Wireless Earbuds Under $100', { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });

  it('sets the document title and canonical URL from SEO fields, falling back to guide data', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide({ seoTitle: 'Custom SEO Title' }));
    renderAtSlug('best-wireless-earbuds-under-100');

    await waitFor(() => expect(document.title).toBe('Custom SEO Title'));
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toContain(
      '/buying-guides/best-wireless-earbuds-under-100'
    );
  });

  it('renders a FAQPage JSON-LD script matching the visible FAQs', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide());
    renderAtSlug('best-wireless-earbuds-under-100');

    await screen.findByRole('heading', { level: 1 });
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const faqSchema = scripts.map((s) => JSON.parse(s.textContent)).find((s) => s['@type'] === 'FAQPage');
    expect(faqSchema.mainEntity[0].name).toBe('Is it worth it?');
  });

  it('shows a not-found message when the guide is unavailable', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockRejectedValue({ message: 'Buying guide not found.' });
    renderAtSlug('missing-guide');

    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
  });

  it('hides an empty optional section instead of rendering a blank card', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide({ runnerUps: [] }));
    renderAtSlug('best-wireless-earbuds-under-100');

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('heading', { name: /Runner-Ups/ })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/PublishedBuyingGuidePage.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorState from '../components/ErrorState.jsx';
import BuyingGuideBreadcrumbs from '../components/buying-guide/BuyingGuideBreadcrumbs.jsx';
import BuyingGuideHero from '../components/buying-guide/BuyingGuideHero.jsx';
import GuideTableOfContents from '../components/buying-guide/GuideTableOfContents.jsx';
import QuickRecommendationsSection from '../components/buying-guide/QuickRecommendationsSection.jsx';
import ProductComparisonSection from '../components/buying-guide/ProductComparisonSection.jsx';
import TopPickSection from '../components/buying-guide/TopPickSection.jsx';
import RunnerUpsSection from '../components/buying-guide/RunnerUpsSection.jsx';
import BuyingGuideContentSection from '../components/buying-guide/BuyingGuideContentSection.jsx';
import BuyingGuideFaqSection from '../components/buying-guide/BuyingGuideFaqSection.jsx';
import FinalRecommendationSection from '../components/buying-guide/FinalRecommendationSection.jsx';
import AffiliateDisclosure from '../components/AffiliateDisclosure.jsx';
import { getBuyingGuideBySlug } from '../services/buyingGuideService.js';
import { getSettings } from '../services/settingsService.js';
import { useDocumentHead } from '../hooks/useDocumentHead.js';
import { trackEvent } from '../hooks/useAnalytics.js';
import { computeGuideSectionNumbers } from '../utils/computeGuideSectionNumbers.js';
import { buildFaqJsonLd } from '../utils/faqJsonLd.js';
import { buildGuideUrl, getSiteUrl } from '../utils/siteUrl.js';
import { getImageUrl } from '../utils/imageUrl.js';
import { uniqueSlug } from '../utils/slugify.js';

const STRUCTURAL_LABELS = {
  QUICK_RECOMMENDATIONS: 'Quick Recommendations',
  COMPARISON_TABLE: 'Product Comparison',
  TOP_PICK: 'Our Top Pick',
  RUNNER_UPS: 'Runner-Ups',
  FAQS: 'Frequently Asked Questions',
};

function buildJsonLd(guide) {
  const origin = getSiteUrl();
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Buying Guides', item: `${origin}/buying-guides` },
        { '@type': 'ListItem', position: 3, name: guide.title, item: buildGuideUrl(guide.slug) },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.excerpt,
      image: getImageUrl(guide.coverImageFilename) ?? undefined,
      datePublished: guide.publishedAt ?? guide.createdAt,
      dateModified: guide.updatedAt ?? guide.createdAt,
      author: { '@type': 'Organization', name: '2Go Findz' },
    },
  ];
  const faqSchema = buildFaqJsonLd(guide.faqs);
  if (faqSchema) schemas.push(faqSchema);
  return schemas;
}

function PublishedBuyingGuidePage() {
  const { slug } = useParams();
  const [settings, setSettings] = useState(null);
  const [guide, setGuide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const hasTrackedView = useRef(false);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    setGuide(null);
    hasTrackedView.current = false;
    getBuyingGuideBySlug(slug)
      .then(setGuide)
      .catch((err) => setError(err.message ?? 'Buying guide not found.'))
      .finally(() => setIsLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!guide || hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackEvent('guide_view', { guideId: guide.id });
  }, [guide]);

  const customSectionsWithAnchors = useMemo(() => {
    if (!guide) return [];
    const usedAnchors = new Set();
    return guide.tocEntries
      .filter((entry) => !entry.sectionKey && entry.title?.trim() && entry.content?.replace(/<[^>]*>/g, '').trim())
      .map((entry) => ({ title: entry.title, content: entry.content, anchorId: uniqueSlug(entry.title, usedAnchors) }));
  }, [guide]);

  const sectionNumbers = useMemo(() => {
    if (!guide) return {};
    return computeGuideSectionNumbers(guide.tocEntries, {
      hasQuickRecommendations: guide.quickRecommendations.length > 0,
      hasComparison: Boolean(guide.comparisonTable),
      hasTopPick: Boolean(guide.topPick),
      hasRunnerUps: guide.runnerUps.length > 0,
      hasBuyingGuideContent: customSectionsWithAnchors.length > 0,
      hasFaqs: guide.faqs.length > 0,
      hasFinalRecommendation: Boolean(guide.topPick),
    });
  }, [guide, customSectionsWithAnchors]);

  const tocItems = useMemo(() => {
    if (!guide) return [];
    const items = [];
    guide.tocEntries.forEach((entry) => {
      if (entry.sectionKey) {
        const number = sectionNumbers[entry.sectionKey];
        if (number) {
          const anchorId = entry.sectionKey === 'QUICK_RECOMMENDATIONS' ? 'quick-recommendations'
            : entry.sectionKey === 'COMPARISON_TABLE' ? 'product-comparison'
            : entry.sectionKey === 'TOP_PICK' ? 'top-pick'
            : entry.sectionKey === 'RUNNER_UPS' ? 'runner-ups'
            : 'faq';
          items.push({ id: entry.sectionKey, number, label: STRUCTURAL_LABELS[entry.sectionKey], anchorId });
        }
        return;
      }
      if (sectionNumbers.BUYING_GUIDE && !items.some((item) => item.id === 'BUYING_GUIDE')) {
        items.push({ id: 'BUYING_GUIDE', number: sectionNumbers.BUYING_GUIDE, label: 'Buying Guide', anchorId: 'buying-guide' });
      }
    });
    if (sectionNumbers.FINAL_RECOMMENDATION) {
      items.push({ id: 'FINAL_RECOMMENDATION', number: sectionNumbers.FINAL_RECOMMENDATION, label: 'Final Recommendation', anchorId: 'final-recommendation' });
    }
    return items;
  }, [guide, sectionNumbers]);

  useEffect(() => {
    if (tocItems.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveSectionId(visible.target.dataset.tocId);
      },
      { rootMargin: '-96px 0px -70% 0px' }
    );
    tocItems.forEach((item) => {
      const el = document.getElementById(item.anchorId);
      if (el) {
        el.dataset.tocId = item.id;
        observer.observe(el);
      }
    });
    return () => observer.disconnect();
  }, [tocItems]);

  const handleNavigate = useCallback((item) => {
    const el = document.getElementById(item.anchorId);
    if (!el) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${item.anchorId}`);
    trackEvent('toc_click', { guideId: guide?.id, section: item.id });
  }, [guide]);

  // useDocumentHead must run on every render, including the loading/error
  // ones below — calling a hook only after an early return would violate
  // the Rules of Hooks (a hook can't be conditionally skipped between
  // renders). Every value here is guide-guarded instead: when guide is
  // null the hook receives undefined for each field, and its existing
  // `if (title) {...}` -style guards (see Task 3) already no-op cleanly.
  const seoTitle = guide ? guide.seoTitle || guide.title : undefined;
  const seoDescription = guide ? guide.seoDescription || guide.excerpt : undefined;
  const canonicalUrl = guide ? guide.canonicalUrl || buildGuideUrl(guide.slug) : undefined;
  const ogImage = guide ? getImageUrl(guide.openGraphImageFilename || guide.coverImageFilename) : undefined;

  useDocumentHead({
    title: seoTitle,
    description: seoDescription,
    canonicalUrl,
    robots: guide ? `${guide.robotsIndex ? 'index' : 'noindex'},${guide.robotsFollow ? 'follow' : 'nofollow'}` : undefined,
    ogTitle: guide ? guide.openGraphTitle || seoTitle : undefined,
    ogDescription: guide ? guide.openGraphDescription || seoDescription : undefined,
    ogImage,
    ogType: guide ? 'article' : undefined,
    ogUrl: canonicalUrl,
    twitterCard: guide ? guide.twitterCardType || 'summary_large_image' : undefined,
    twitterTitle: guide ? guide.openGraphTitle || seoTitle : undefined,
    twitterDescription: guide ? guide.openGraphDescription || seoDescription : undefined,
    twitterImage: ogImage,
    jsonLd: guide ? buildJsonLd(guide) : undefined,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <LoadingSpinner label="Loading buying guide..." />
        </div>
        <Footer settings={settings} />
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <ErrorState message={error ?? 'Buying guide not found.'} />
        </div>
        <Footer settings={settings} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <BuyingGuideBreadcrumbs title={guide.title} />

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <BuyingGuideHero title={guide.title} excerpt={guide.excerpt} coverImageFilename={guide.coverImageFilename} updatedAt={guide.updatedAt} />
          <GuideTableOfContents items={tocItems} activeId={activeSectionId} onNavigate={handleNavigate} />
        </div>

        <div className="my-6">
          <AffiliateDisclosure text={settings?.affiliateDisclosure} />
        </div>

        <div className="space-y-10">
          <div id="quick-recommendations">
            <QuickRecommendationsSection
              quickRecommendations={guide.quickRecommendations}
              number={sectionNumbers.QUICK_RECOMMENDATIONS}
              guideId={guide.id}
              onAffiliateClick={(payload) => trackEvent('quick_pick_affiliate_click', payload)}
            />
          </div>
          <div id="product-comparison">
            <ProductComparisonSection
              comparisonTable={guide.comparisonTable}
              number={sectionNumbers.COMPARISON_TABLE}
              guideId={guide.id}
              onProductClick={(payload) => trackEvent('comparison_product_click', payload)}
            />
          </div>
          <div id="top-pick">
            <TopPickSection
              topPick={guide.topPick}
              number={sectionNumbers.TOP_PICK}
              guideId={guide.id}
              onAffiliateClick={(payload) => trackEvent('top_pick_affiliate_click', payload)}
            />
          </div>
          <div id="runner-ups">
            <RunnerUpsSection
              runnerUps={guide.runnerUps}
              number={sectionNumbers.RUNNER_UPS}
              guideId={guide.id}
              onAffiliateClick={(payload) => trackEvent('runner_up_affiliate_click', payload)}
            />
          </div>
          <div id="buying-guide">
            <BuyingGuideContentSection
              sections={customSectionsWithAnchors}
              number={sectionNumbers.BUYING_GUIDE}
              guideId={guide.id}
              onExpand={(payload) => trackEvent('buying_guide_expand', payload)}
            />
          </div>
          <div id="faq">
            <BuyingGuideFaqSection
              faqs={guide.faqs}
              number={sectionNumbers.FAQS}
              guideId={guide.id}
              onExpand={(payload) => trackEvent('faq_expand', payload)}
            />
          </div>
          <div id="final-recommendation">
            <FinalRecommendationSection
              topPick={guide.topPick}
              number={sectionNumbers.FINAL_RECOMMENDATION}
              guideId={guide.id}
              onAffiliateClick={(payload) => trackEvent('final_recommendation_click', payload)}
            />
          </div>
        </div>
      </main>
      <Footer settings={settings} />
    </div>
  );
}

export default PublishedBuyingGuidePage;
```

Note the `id="..."` wrapper `div`s around each section: since each Section component may render `null`, the wrapper div (not conditionally rendered) is what the `IntersectionObserver`/anchor targets — this guarantees the anchor element always exists in the DOM for TOC navigation even before data loads, and avoids every leaf Section component needing to know its own anchor id (single responsibility: Section components render content, the page owns anchor wiring). An empty wrapper div for a hidden section is harmless (zero height, not "content"), and does not violate "no blank cards" since it renders no visible card, just a scroll target.

- [ ] **Step 4: Delete the old page**

```bash
rm frontend/src/pages/BuyingGuideDetailPage.jsx frontend/src/pages/BuyingGuideDetailPage.test.jsx
```

- [ ] **Step 5: Wire the route in `App.jsx`**

Replace:

```jsx
import BuyingGuideDetailPage from './pages/BuyingGuideDetailPage.jsx';
```

with:

```jsx
import PublishedBuyingGuidePage from './pages/PublishedBuyingGuidePage.jsx';
```

Replace:

```jsx
                <Route path="/buying-guides/:id" element={<BuyingGuideDetailPage />} />
```

with:

```jsx
                <Route path="/buying-guides/:slug" element={<PublishedBuyingGuidePage />} />
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/PublishedBuyingGuidePage.test.jsx`
Expected: PASS.

- [ ] **Step 7: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS — confirms `App.test.jsx` (if it references routes) and every other suite still pass with `BuyingGuideDetailPage` gone.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/PublishedBuyingGuidePage.jsx frontend/src/pages/PublishedBuyingGuidePage.test.jsx frontend/src/App.jsx
git rm frontend/src/pages/BuyingGuideDetailPage.jsx frontend/src/pages/BuyingGuideDetailPage.test.jsx
git commit -m "feat(buying-guides): replace the broken public detail page with PublishedBuyingGuidePage"
```

---

### Task 23: Refactor `LivePreview.jsx` to reuse the extracted shared components

**Files:**
- Modify: `frontend/src/components/buying-guide-form/LivePreview.jsx`

**Interfaces:**
- Consumes: `RecommendationCard`, `ComparisonTable`, `BuyingGuideFaqAccordion`, `BuyingGuideContentCard`, `computeGuideSectionNumbers` (all from Tasks 2, 7–10).
- Produces: no change to `LivePreview`'s own exported props/behavior — this is a pure internal refactor. Its existing test suite (`LivePreview.test.jsx`) must pass unchanged with zero test edits.

This task has no new tests of its own — the existing `LivePreview.test.jsx` suite (unmodified) is the verification.

- [ ] **Step 1: Confirm the baseline passes before refactoring**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: PASS (baseline, before any changes in this task).

- [ ] **Step 2: Replace the admin-shaped comparison rendering with `ComparisonTable`**

`LivePreview.jsx` currently renders comparison from separate `comparisonSpecs`/`comparisonProducts` arrays (admin-editor shape), while `ComparisonTable` expects the public API's `{ specificationNames, rows }` shape. Adapt at the call site — build the adapted shape inline in `LivePreview.jsx` rather than changing `ComparisonTable`'s contract (which must stay matched to the real public API for Task 8/15's tests):

Replace the inline comparison-table JSX block (the `{comparisonSpecs.length > 0 && comparisonProducts.length > 0 && (...)}` block) with:

```jsx
      {comparisonSpecs.length > 0 && comparisonProducts.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.COMPARISON_TABLE}. Comparison Table
          </span>
          <ComparisonTable
            comparisonTable={{
              specificationNames: comparisonSpecs.map((spec) => spec.specificationName || 'Untitled Specification'),
              rows: comparisonProducts.map((product) => ({
                product,
                specificationValues: comparisonSpecs.map(
                  (spec) => spec.values.find((v) => v.productId === product.id)?.value ?? ''
                ),
              })),
            }}
          />
        </div>
      )}
```

Remove the now-unused local `renderComparisonCellValue` function (moved into `ComparisonTable.jsx` in Task 8).

- [ ] **Step 3: Replace `renderRecommendationCard` with `RecommendationCard`**

Adapt the admin's `recommendationSections` entries (which carry `pros`/`cons`/`bestFor` as `{clientId, content}[]`, not plain strings) into `RecommendationCard`'s expected shape at the call sites:

```jsx
function toRecommendationCardShape(section) {
  return {
    product: section.product,
    recommendationType: section.recommendationType,
    sectionLabel: section.sectionLabel,
    whyRecommended: section.whyRecommended,
    pros: section.pros.map((item) => item.content),
    cons: section.cons.map((item) => item.content),
    bestFor: section.bestFor.map((item) => item.content),
  };
}
```

Replace the `{topPick && (...)}` block's `renderRecommendationCard(topPick, null)` call with:

```jsx
      {topPick && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.TOP_PICK}. Our Top Pick
          </span>
          <RecommendationCard recommendation={toRecommendationCardShape(topPick)} rank={null} />
        </div>
      )}
```

And the runner-ups block's `.map((section, index) => renderRecommendationCard(section, index + 1))` with:

```jsx
      {runnerUps.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.RUNNER_UPS}. Runner-Ups
          </span>
          {runnerUps.map((section, index) => (
            <div key={section.clientId} className="mt-3 first:mt-0">
              <RecommendationCard recommendation={toRecommendationCardShape(section)} rank={index + 1} />
            </div>
          ))}
        </div>
      )}
```

Remove the now-unused `renderRecommendationCard` function.

- [ ] **Step 4: Replace `BuyingGuideSectionPreviewCard` with `BuyingGuideContentCard`**

Replace:

```jsx
          {customSectionsWithAnchors.map(({ entry, anchorId }, index) => (
            <BuyingGuideSectionPreviewCard key={entry.clientId} entry={entry} number={index + 1} anchorId={anchorId} />
          ))}
```

with:

```jsx
          {customSectionsWithAnchors.map(({ entry, anchorId }, index) => (
            <div key={entry.clientId} className={index > 0 ? 'mt-3' : ''}>
              <BuyingGuideContentCard
                title={entry.title || 'Untitled Section'}
                content={entry.content}
                anchorId={anchorId}
                number={index + 1}
              />
            </div>
          ))}
```

Remove the now-unused local `BuyingGuideSectionPreviewCard` function and its `CONTENT_PREVIEW_WORD_LIMIT` constant (superseded by `BuyingGuideContentCard`'s own internal limit).

- [ ] **Step 5: Replace `FaqAccordionPreview` with `BuyingGuideFaqAccordion`**

Replace:

```jsx
          <FaqAccordionPreview faqs={faqs} />
```

with:

```jsx
          <BuyingGuideFaqAccordion faqs={faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
```

(the admin's `faqs` carry a `clientId` the shared component doesn't need; mapping to the plain `{question, answer}` shape keeps `BuyingGuideFaqAccordion`'s contract identical to the public API's.)

Remove the now-unused local `FaqAccordionPreview` function and its `FAQ_PREVIEW_LIMIT` constant.

- [ ] **Step 6: Replace `computeSectionNumbers` with the shared util**

Remove the local `computeSectionNumbers` function definition entirely and import the shared one:

```jsx
import { computeGuideSectionNumbers } from '../../utils/computeGuideSectionNumbers.js';
```

Update its call site (the `hasFinalRecommendation` flag doesn't apply to the admin preview, since there is no Final Recommendation concept in the editor — pass `false`):

```jsx
  const sectionNumbers = computeGuideSectionNumbers(tocEntries, {
    hasQuickRecommendations: quickRecommendations.length > 0,
    hasComparison: comparisonSpecs.length > 0 && comparisonProducts.length > 0,
    hasTopPick: Boolean(topPick),
    hasBuyingGuideContent,
    hasRunnerUps: runnerUps.length > 0,
    hasFaqs: faqs.length > 0,
    hasFinalRecommendation: false,
  });
```

- [ ] **Step 7: Update imports**

Replace the top-of-file imports:

```jsx
import { useState } from 'react';
import { Award, Check, ChevronDown, Image as ImageIcon, Medal, Monitor, Smartphone, X } from 'lucide-react';
import AffiliateDisclosure from '../AffiliateDisclosure.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { STRUCTURAL_LABELS } from './TocBuilder.jsx';
import QuickPickBadge from './QuickPickBadge.jsx';
import { isSupportedAmazonUrl } from '../../utils/amazonLink.js';
import { wordCount } from './RichTextEditor.jsx';
```

with:

```jsx
import { useState } from 'react';
import { Image as ImageIcon, Monitor, Smartphone } from 'lucide-react';
import AffiliateDisclosure from '../AffiliateDisclosure.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { uniqueSlug } from '../../utils/slugify.js';
import { STRUCTURAL_LABELS } from './TocBuilder.jsx';
import QuickPickBadge from './QuickPickBadge.jsx';
import { isSupportedAmazonUrl } from '../../utils/amazonLink.js';
import { computeGuideSectionNumbers } from '../../utils/computeGuideSectionNumbers.js';
import ComparisonTable from '../buying-guide/ComparisonTable.jsx';
import RecommendationCard from '../buying-guide/RecommendationCard.jsx';
import BuyingGuideContentCard from '../buying-guide/BuyingGuideContentCard.jsx';
import BuyingGuideFaqAccordion from '../buying-guide/BuyingGuideFaqAccordion.jsx';
```

(`Award`, `Check`, `ChevronDown`, `Medal`, `X` are dropped since their only uses were inside the now-removed local functions; `isSupportedAmazonUrl` stays — still used directly in the Quick Recommendations block, which is unchanged by this task.)

- [ ] **Step 8: Run the existing LivePreview test suite unchanged**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: PASS — every test from before the refactor, with zero edits to the test file itself. If any test fails, the refactor changed observable behavior; fix the implementation (not the test) until it matches Step 1's baseline exactly.

- [ ] **Step 9: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS.

- [ ] **Step 10: Run lint and the production build**

Run: `cd frontend && npx eslint . && npm run build`
Expected: no new errors (pre-existing `react-refresh/only-export-components` warnings on `RichTextEditor.jsx`/`TocBuilder.jsx` are unrelated and unchanged); build succeeds.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/components/buying-guide-form/LivePreview.jsx
git commit -m "refactor(buying-guides): LivePreview reuses the shared public-page components"
```

---

## Final verification (after all tasks)

- [ ] Run the full frontend suite: `cd frontend && npx vitest run`
- [ ] Run frontend lint: `cd frontend && npx eslint .`
- [ ] Run the frontend production build: `cd frontend && npm run build`
- [ ] Run the full backend suite: `cd backend && mvn test`
- [ ] Manual browser verification per the design doc's testing plan: a fully-populated published guide, a sparse guide (missing comparison/runner-ups), an Unlisted guide (reachable by slug, absent from `/buying-guides` listing), a Draft/Private guide (not found), at desktop/tablet/mobile widths, keyboard-only navigation through TOC/FAQ/comparison table, and a console-error check.
- [ ] Invoke `superpowers:finishing-a-development-branch`.
