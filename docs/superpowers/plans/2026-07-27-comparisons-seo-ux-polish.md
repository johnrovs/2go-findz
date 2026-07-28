# Comparisons Stage 4 (SEO + UX/Performance Polish) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SEO metadata (title/description/canonical/JSON-LD), a sticky section nav, an FAQ accordion, print-friendly styling, and image lazy-loading/memoization to the public Comparison pages built in Stage 3 — the final stage of the Comparisons feature.

**Architecture:** A small custom `useDocumentHead` hook (no new dependency) manages `<title>`/meta/canonical/JSON-LD tags directly via the DOM, cleaning up on unmount. `ComparisonDetailPage` and `ComparisonsPage` call it with page-specific values. The rest of this stage is incremental additions to the existing `ComparisonDetailPage.jsx`/`Navbar.jsx` from Stage 3.

**Tech Stack:** React 18, Vite, Tailwind CSS, Vitest, React Testing Library, lucide-react icons.

## Global Constraints

- No new npm dependency — `useDocumentHead` is a hand-written hook, not `react-helmet-async`.
- Open Graph tags are explicitly out of scope (client-JS-injected OG tags don't reach non-JS-executing social-preview bots — see the design spec for the full reasoning). Do not add `og:*` meta tags anywhere in this plan.
- No invented `schema.org` type for "comparison schema" — only `BreadcrumbList` (always) and `FAQPage` (when FAQs exist) are implemented.
- The sticky section nav links only to the three fixed regions (Comparison Table, Product Breakdown, FAQ) — never to dynamic `ComparisonSection` entries.
- FAQ collapse is the only region that gets accordion behavior — not a generic collapse-everything mechanism.
- Follow strict TDD for every step: write the failing test, run it and confirm it fails, implement the minimal code to pass, run it and confirm it passes, run the full frontend suite, then commit.
- Dark mode is out of scope for this entire feature (all 4 stages).

---

### Task 1: `useDocumentHead` hook

**Files:**
- Create: `frontend/src/hooks/useDocumentHead.js`
- Test: `frontend/src/hooks/useDocumentHead.test.js`

**Interfaces:**
- Produces: `useDocumentHead({ title, description, canonicalUrl, jsonLd })` — `jsonLd` is an array of plain objects (JSON-LD schema blocks) or `undefined`. Sets `document.title`, a `<meta name="description">`, a `<link rel="canonical">`, and one `<script type="application/ld+json">` per schema in `jsonLd`; removes everything it added and restores the prior title on unmount. Consumed by Task 2's `ComparisonDetailPage`/`ComparisonsPage`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/hooks/useDocumentHead.test.js`:

```js
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocumentHead } from './useDocumentHead.js';

function resetDocumentHead() {
  document.title = '';
  document
    .querySelectorAll('meta[name="description"], link[rel="canonical"], script[type="application/ld+json"]')
    .forEach((el) => el.remove());
}

describe('useDocumentHead', () => {
  afterEach(() => {
    resetDocumentHead();
  });

  it('sets the document title, description, and canonical URL', () => {
    renderHook(() =>
      useDocumentHead({
        title: 'Test Title',
        description: 'Test description.',
        canonicalUrl: 'https://example.com/test',
      })
    );

    expect(document.title).toBe('Test Title');
    expect(document.querySelector('meta[name="description"]').getAttribute('content')).toBe('Test description.');
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe('https://example.com/test');
  });

  it('injects a JSON-LD script tag for each schema provided', () => {
    renderHook(() =>
      useDocumentHead({
        title: 'Test',
        jsonLd: [{ '@type': 'BreadcrumbList' }, { '@type': 'FAQPage' }],
      })
    );

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(2);
    expect(JSON.parse(scripts[0].textContent)).toEqual({ '@type': 'BreadcrumbList' });
    expect(JSON.parse(scripts[1].textContent)).toEqual({ '@type': 'FAQPage' });
  });

  it('updates the title when props change', () => {
    const { rerender } = renderHook(({ title }) => useDocumentHead({ title }), {
      initialProps: { title: 'First' },
    });
    expect(document.title).toBe('First');

    rerender({ title: 'Second' });
    expect(document.title).toBe('Second');
  });

  it('removes injected tags and resets the title on unmount', () => {
    const { unmount } = renderHook(() =>
      useDocumentHead({
        title: 'Test',
        description: 'Test description.',
        canonicalUrl: 'https://example.com/test',
        jsonLd: [{ '@type': 'BreadcrumbList' }],
      })
    );

    unmount();

    expect(document.title).toBe('');
    expect(document.querySelector('meta[name="description"]')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- useDocumentHead.test.js`
Expected: FAIL — `useDocumentHead.js` does not exist yet.

- [ ] **Step 3: Create `useDocumentHead.js`**

```js
import { useEffect } from 'react';

export function useDocumentHead({ title, description, canonicalUrl, jsonLd }) {
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
      jsonLdTags.forEach((tag) => tag.remove());
    };
  }, [title, description, canonicalUrl, jsonLd]);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- useDocumentHead.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus these 4.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useDocumentHead.js frontend/src/hooks/useDocumentHead.test.js
git commit -m "feat: add useDocumentHead hook for per-page title/meta/JSON-LD"
```

---

### Task 2: SEO integration in `ComparisonsPage` and `ComparisonDetailPage`

**Files:**
- Modify: `frontend/src/pages/ComparisonsPage.jsx`
- Modify: `frontend/src/pages/ComparisonsPage.test.jsx`
- Modify: `frontend/src/pages/ComparisonDetailPage.jsx`
- Modify: `frontend/src/pages/ComparisonDetailPage.test.jsx`

**Interfaces:**
- Consumes: `useDocumentHead` (Task 1).
- Produces: `buildJsonLd(comparison)` (module-private helper in `ComparisonDetailPage.jsx`, not exported — returns `[]` for a null comparison, `[BreadcrumbList]` for one with no FAQs, `[BreadcrumbList, FAQPage]` when FAQs exist). Not consumed by any later task in this plan.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/pages/ComparisonsPage.test.jsx`, inside the existing `describe` block (after the "renders fetched comparison cards" test):

```jsx
  it('sets the page title', async () => {
    vi.spyOn(comparisonService, 'getComparisons').mockResolvedValue([]);
    renderPage();

    await screen.findByText('No comparisons yet');
    expect(document.title).toBe('Comparisons | 2Go Findz');
  });
```

Add to `frontend/src/pages/ComparisonDetailPage.test.jsx`, inside the existing `describe` block (after the "renders all populated sections" test):

```jsx
  it('sets the document title and injects JSON-LD for breadcrumb and FAQ', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    expect(document.title).toBe('Best Portable Blenders Compared | 2Go Findz');

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(2);
    const types = Array.from(scripts).map((script) => JSON.parse(script.textContent)['@type']);
    expect(types).toEqual(['BreadcrumbList', 'FAQPage']);
  });

  it('omits the FAQPage schema when there are no FAQs', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue({ ...fullComparison, faqs: [] });
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const types = Array.from(scripts).map((script) => JSON.parse(script.textContent)['@type']);
    expect(types).toEqual(['BreadcrumbList']);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ComparisonsPage.test.jsx ComparisonDetailPage.test.jsx`
Expected: FAIL — neither page calls `useDocumentHead` yet, so `document.title` stays at its default and no JSON-LD scripts are injected.

- [ ] **Step 3: Modify `ComparisonsPage.jsx`**

Add the import (alongside the other imports):

```jsx
import { useDocumentHead } from '../hooks/useDocumentHead.js';
```

Add this call inside the component, right after the `useState` declarations (before the first `useEffect`):

```jsx
  useDocumentHead({
    title: 'Comparisons | 2Go Findz',
    description: 'Side-by-side breakdowns to help you pick the right product.',
  });
```

- [ ] **Step 4: Modify `ComparisonDetailPage.jsx`**

Add imports (alongside the other imports):

```jsx
import { useMemo } from 'react';
import { useDocumentHead } from '../hooks/useDocumentHead.js';
```

(Combine with the existing `import { Fragment, useEffect, useState } from 'react';` line to read `import { Fragment, useEffect, useMemo, useState } from 'react';` instead of adding a second React import line.)

Add this helper function after the existing `splitLines` function:

```jsx
function buildJsonLd(comparison) {
  if (!comparison) return [];
  const origin = window.location.origin;
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Comparisons', item: `${origin}/comparisons` },
        { '@type': 'ListItem', position: 3, name: comparison.title, item: `${origin}/comparisons/${comparison.slug}` },
      ],
    },
  ];
  if (comparison.faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: comparison.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
  }
  return schemas;
}
```

Inside the component, add this right after the existing `useState` declarations (before the first `useEffect`):

```jsx
  const jsonLd = useMemo(() => buildJsonLd(comparison), [comparison]);
  useDocumentHead({
    title: comparison ? `${comparison.seoTitle || comparison.title} | 2Go Findz` : undefined,
    description: comparison ? comparison.seoDescription || comparison.description : undefined,
    canonicalUrl: comparison ? `${window.location.origin}/comparisons/${comparison.slug}` : undefined,
    jsonLd,
  });
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npm test -- ComparisonsPage.test.jsx ComparisonDetailPage.test.jsx`
Expected: PASS (4 + 6 tests respectively)

- [ ] **Step 6: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus these 3 new ones.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ComparisonsPage.jsx frontend/src/pages/ComparisonsPage.test.jsx \
        frontend/src/pages/ComparisonDetailPage.jsx frontend/src/pages/ComparisonDetailPage.test.jsx
git commit -m "feat: add SEO title/description/canonical/JSON-LD to Comparison pages"
```

---

### Task 3: Sticky section nav + FAQ accordion

**Files:**
- Modify: `frontend/src/pages/ComparisonDetailPage.jsx`
- Modify: `frontend/src/pages/ComparisonDetailPage.test.jsx`

**Interfaces:**
- Produces: `id="comparison-table"`, `id="product-breakdown"`, `id="faq"` anchor targets on the detail page; FAQ answers are hidden until their question is clicked. Not consumed by any later task in this plan.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/pages/ComparisonDetailPage.test.jsx`, inside the existing `describe` block (after the "omits the comparison table, sections, FAQ..." test):

```jsx
  it('renders a sticky section nav with links to the fixed regions', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    const nav = screen.getByRole('navigation', { name: 'Comparison sections' });
    expect(within(nav).getByRole('link', { name: 'Comparison Table' })).toHaveAttribute(
      'href',
      '#comparison-table'
    );
    expect(within(nav).getByRole('link', { name: 'Product Breakdown' })).toHaveAttribute(
      'href',
      '#product-breakdown'
    );
    expect(within(nav).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#faq');
  });

  it('omits the Comparison Table and FAQ nav links when those regions are empty', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue({
      ...fullComparison,
      specRows: [],
      faqs: [],
    });
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    const nav = screen.getByRole('navigation', { name: 'Comparison sections' });
    expect(within(nav).queryByRole('link', { name: 'Comparison Table' })).not.toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Product Breakdown' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'FAQ' })).not.toBeInTheDocument();
  });

  it('hides FAQ answers until their question is clicked', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Which is better?');
    expect(screen.queryByText('It depends on your budget.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Which is better?' }));
    expect(screen.getByText('It depends on your budget.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Which is better?' }));
    expect(screen.queryByText('It depends on your budget.')).not.toBeInTheDocument();
  });
```

Add these imports to the top of `frontend/src/pages/ComparisonDetailPage.test.jsx` (alongside the existing ones):

```jsx
import userEvent from '@testing-library/user-event';
```

and change the `@testing-library/react` import line from:

```jsx
import { render, screen } from '@testing-library/react';
```

to:

```jsx
import { render, screen, within } from '@testing-library/react';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ComparisonDetailPage.test.jsx`
Expected: FAIL — no sticky nav exists yet, and FAQ answers currently render unconditionally.

- [ ] **Step 3: Modify `ComparisonDetailPage.jsx`**

Add the import (alongside the other lucide-react-style imports; this project doesn't currently import any lucide-react icons in this file, so add a new import line):

```jsx
import { ChevronDown } from 'lucide-react';
```

Add this state and handler inside the component, after the `jsonLd`/`useDocumentHead` calls from Task 2:

```jsx
  const [expandedFaqIds, setExpandedFaqIds] = useState(() => new Set());

  function toggleFaq(id) {
    setExpandedFaqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }
```

Insert the sticky section nav right after the "Last updated" paragraph and before the Comparison Table's conditional block:

```jsx
              <nav
                aria-label="Comparison sections"
                className="sticky top-16 z-20 -mx-4 mt-8 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur print:hidden sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
              >
                <ul className="mx-auto flex max-w-5xl gap-4 overflow-x-auto text-sm font-medium text-slate-600">
                  {comparison.specRows.length > 0 && (
                    <li>
                      <a href="#comparison-table" className="hover:text-indigo-600">
                        Comparison Table
                      </a>
                    </li>
                  )}
                  <li>
                    <a href="#product-breakdown" className="hover:text-indigo-600">
                      Product Breakdown
                    </a>
                  </li>
                  {comparison.faqs.length > 0 && (
                    <li>
                      <a href="#faq" className="hover:text-indigo-600">
                        FAQ
                      </a>
                    </li>
                  )}
                </ul>
              </nav>
```

Add `id="comparison-table" scroll-mt-24` to the Comparison Table's wrapping `<div className="mt-12">`, changing:

```jsx
              {comparison.specRows.length > 0 && (
                <div className="mt-12">
                  <SectionHeading title="Comparison Table" />
```

to:

```jsx
              {comparison.specRows.length > 0 && (
                <div id="comparison-table" className="mt-12 scroll-mt-24">
                  <SectionHeading title="Comparison Table" />
```

Add `id="product-breakdown" scroll-mt-24` to the Product Breakdown wrapping `<div className="mt-12">`, changing:

```jsx
              <div className="mt-12">
                <SectionHeading title="Product Breakdown" />
```

to:

```jsx
              <div id="product-breakdown" className="mt-12 scroll-mt-24">
                <SectionHeading title="Product Breakdown" />
```

Add `id="faq" scroll-mt-24` to the FAQ wrapping `<div className="mt-12">` and replace its contents with the accordion version, changing:

```jsx
              {comparison.faqs.length > 0 && (
                <div className="mt-12">
                  <SectionHeading title="Frequently Asked Questions" />
                  <div className="space-y-4">
                    {comparison.faqs.map((faq) => (
                      <div key={faq.id}>
                        <h3 className="mb-1 text-base font-semibold text-slate-900">{faq.question}</h3>
                        <p className="text-sm text-slate-700">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
```

to:

```jsx
              {comparison.faqs.length > 0 && (
                <div id="faq" className="mt-12 scroll-mt-24">
                  <SectionHeading title="Frequently Asked Questions" />
                  <div className="space-y-4">
                    {comparison.faqs.map((faq) => {
                      const isExpanded = expandedFaqIds.has(faq.id);
                      return (
                        <div key={faq.id} className="border-b border-slate-200 pb-4">
                          <button
                            type="button"
                            onClick={() => toggleFaq(faq.id)}
                            aria-expanded={isExpanded}
                            className="flex w-full items-center justify-between text-left text-base font-semibold text-slate-900"
                          >
                            {faq.question}
                            <ChevronDown
                              size={18}
                              className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {isExpanded && <p className="mt-2 text-sm text-slate-700">{faq.answer}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- ComparisonDetailPage.test.jsx`
Expected: PASS (9 tests)

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus these 3 new ones.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/ComparisonDetailPage.jsx frontend/src/pages/ComparisonDetailPage.test.jsx
git commit -m "feat: add sticky section nav and FAQ accordion to ComparisonDetailPage"
```

---

### Task 4: Print-friendly styling + performance polish

**Files:**
- Modify: `frontend/src/components/Navbar.jsx`
- Modify: `frontend/src/components/Navbar.test.jsx`
- Modify: `frontend/src/pages/ComparisonDetailPage.jsx`
- Modify: `frontend/src/pages/ComparisonDetailPage.test.jsx`

**Interfaces:**
- Produces: `print:hidden` on `Navbar`'s header, the sticky section nav (already added in Task 3), and every "View on Amazon" CTA on the detail page; `print:overflow-visible` on the comparison table's scroll wrapper; `loading="lazy"` on Product Breakdown card images; `groupSpecRows` computation memoized. This is the final content task of Stage 4 — no dedicated new test file, verified via the additions below plus Task 5's full-suite run.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/components/Navbar.test.jsx`, inside the existing `describe` block (after the "renders the Comparisons link..." test):

```jsx
  it('hides the header when printing', () => {
    renderNavbar();
    expect(screen.getByRole('banner')).toHaveClass('print:hidden');
  });
```

Add to `frontend/src/pages/ComparisonDetailPage.test.jsx`, inside the existing `describe` block (after the "hides FAQ answers until their question is clicked" test):

```jsx
  it('applies print-friendly styling to the Amazon CTA and comparison table', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    expect(screen.getAllByRole('link', { name: 'View on Amazon' })[0]).toHaveClass('print:hidden');
    expect(screen.getByRole('table').parentElement).toHaveClass('print:overflow-visible');
  });

  it('lazy-loads product breakdown images', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    expect(screen.getByAltText('BlendJet 2')).toHaveAttribute('loading', 'lazy');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- Navbar.test.jsx ComparisonDetailPage.test.jsx`
Expected: FAIL — none of the print/lazy-loading classes or attributes exist yet.

- [ ] **Step 3: Modify `Navbar.jsx`**

Change:

```jsx
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
```

to:

```jsx
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
```

- [ ] **Step 4: Modify `ComparisonDetailPage.jsx`**

Add the memoized spec-row grouping right after the `jsonLd`/`useDocumentHead`/`expandedFaqIds` declarations from Tasks 2-3:

```jsx
  const groupedSpecRows = useMemo(() => groupSpecRows(comparison?.specRows ?? []), [comparison]);
```

Replace the inline call in the Comparison Table's `<tbody>`, changing:

```jsx
                      <tbody className="divide-y divide-slate-100">
                        {groupSpecRows(comparison.specRows).map((group) => (
```

to:

```jsx
                      <tbody className="divide-y divide-slate-100">
                        {groupedSpecRows.map((group) => (
```

Add `print:overflow-visible` to the table's scroll wrapper, changing:

```jsx
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
```

to:

```jsx
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
```

Add `loading="lazy"` to the Product Breakdown card image, changing:

```jsx
                        <img
                          src={getImageUrl(cp.product.imageFileName)}
                          alt={cp.product.name}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
```

to:

```jsx
                        <img
                          src={getImageUrl(cp.product.imageFileName)}
                          alt={cp.product.name}
                          loading="lazy"
                          className="h-20 w-20 rounded-lg object-cover"
                        />
```

Add `print:hidden` to the Amazon CTA, changing:

```jsx
                        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        View on Amazon
```

to:

```jsx
                        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 print:hidden"
                      >
                        View on Amazon
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npm test -- Navbar.test.jsx ComparisonDetailPage.test.jsx`
Expected: PASS (11 + 11 tests respectively)

- [ ] **Step 6: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus these 3 new ones.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Navbar.jsx frontend/src/components/Navbar.test.jsx \
        frontend/src/pages/ComparisonDetailPage.jsx frontend/src/pages/ComparisonDetailPage.test.jsx
git commit -m "feat: add print-friendly styling and performance polish to Comparison pages"
```

---

### Task 5: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1-4
- Produces: nothing further downstream — this is the final task of the entire 4-stage Comparisons feature.

- [ ] **Step 1: Run the entire frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 1 through 4.

- [ ] **Step 2: Run frontend lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings). Fix any real issue directly; never suppress preemptively.

- [ ] **Step 3: Run the frontend production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manual smoke check against the live backend**

Requires the backend dev server running (no backend changes in this stage, so no restart needed) and the "Best Portable Blenders Compared" comparison created during Stage 2's smoke check.

Using the frontend dev server (`npm run dev`) and a browser: confirm the document title changes to "Best Portable Blenders Compared | 2Go Findz" when viewing the detail page (visible in the browser tab); view page source / dev tools to confirm a `<meta name="description">`, `<link rel="canonical">`, and JSON-LD `<script>` tags are present; confirm the sticky section nav appears below the main navbar and its links jump to the correct regions; confirm clicking an FAQ question expands its answer and clicking again collapses it; confirm using the browser's print preview hides the navbar, the sticky section nav, and the Amazon CTA buttons, and that the comparison table isn't clipped; confirm the list page's title is "Comparisons | 2Go Findz".

- [ ] **Step 5: Commit (if the smoke check surfaced any fixes)**

If Step 4 found nothing to fix, there is nothing to commit for this task — Task 4's commit is the final commit of this stage. If it did surface a small fix, apply it, re-run Steps 1-3, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Comparisons SEO/UX polish manual smoke check"
```

---

## Stage 4 Completion — Feature Complete

After Task 5, use the `superpowers:finishing-a-development-branch` skill: run the full frontend suite one more time, then present the merge/push/keep-local choice.

This closes out the entire 4-stage Comparisons feature (backend → admin UI → public pages → SEO/UX polish), the last of the 4 stages originally decomposed from the user's requirements document at the start of this engagement.

