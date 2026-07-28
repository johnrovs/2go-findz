# Comparisons Stage 3 (Public Page Rendering) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the public-facing frontend for Comparisons: a list page (`/comparisons`) and a slug-based detail page (`/comparisons/:slug`) rendering the full nested content model, plus nav links.

**Architecture:** Two new public pages following the exact structural precedent of `BuyingGuidesPage`/`BuyingGuideDetailPage` (`Navbar`/`Footer`/`SectionHeading`/`LoadingSpinner`/`ErrorState`/`EmptyState` reused unmodified). The detail page maps the source doc's 12 named sections onto 7 actual regions matching Stage 1's real data model — several source-doc sections (Quick Winner Summary, Best For Badges, Pros & Cons, Amazon CTA) collapse into one Product Cards region; three more (Real World Performance, Things To Know, Final Recommendation) collapse into the flexible `ComparisonSection` region.

**Tech Stack:** React, Vite, Tailwind CSS, React Router DOM, Vitest, React Testing Library.

## Global Constraints

- Reuse `Navbar`/`Footer`/`SectionHeading`/`LoadingSpinner`/`ErrorState`/`EmptyState`/`ProductGrid` unmodified — no new primitives, matching every prior public-page stage this session.
- Every region backed by an empty list is omitted entirely — no empty headings or placeholder text.
- Amazon CTA links always use `target="_blank"` and `rel="nofollow sponsored noopener noreferrer"`, with the exact copy "View on Amazon" already used everywhere else on the site — never "Buy Now" or "Purchase Here".
- Follow strict TDD for every step: write the failing test, run it and confirm it fails, implement the minimal code to pass, run it and confirm it passes, run the full frontend suite, then commit.
- Dark mode is out of scope for this entire feature (all 4 stages).
- SEO meta tags/JSON-LD, sticky navigation, print-friendly styling, and image lazy-loading/memoization performance work are out of scope for this stage (Stage 4).

---

### Task 1: Public `comparisonService.js` + `ComparisonsPage` (list)

**Files:**
- Create: `frontend/src/services/comparisonService.js`
- Create: `frontend/src/pages/ComparisonsPage.jsx`
- Test: `frontend/src/pages/ComparisonsPage.test.jsx`

**Interfaces:**
- Produces: `getComparisons()`, `getComparisonBySlug(slug)` in `comparisonService.js` (public, distinct file from Stage 2's admin `adminComparisonService.js`) — consumed by this task and Task 2.
- Produces: `ComparisonsPage()` (default export, no props) at `frontend/src/pages/ComparisonsPage.jsx` — **public**, distinct from the admin `pages/admin/ComparisonsPage.jsx` from Stage 2 (different directory, no collision, same alias-on-import pattern already used for Buying Guides). Used by Task 3 (route wiring).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/pages/ComparisonsPage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonsPage from './ComparisonsPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as comparisonService from '../services/comparisonService.js';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';

const comparison = {
  id: 1,
  slug: 'best-portable-blenders-compared',
  title: 'Best Portable Blenders Compared',
  description: 'Compare features, strengths, weaknesses, and find the best portable blender for your needs.',
  coverImageFilename: null,
  categoryName: 'Kitchen',
  createdAt: '2026-07-20T10:00:00',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <CompareProvider>
        <ComparisonsPage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('ComparisonsPage (public)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
  });

  it('renders fetched comparison cards', async () => {
    vi.spyOn(comparisonService, 'getComparisons').mockResolvedValue([comparison]);
    renderPage();

    expect(await screen.findByText('Best Portable Blenders Compared')).toBeInTheDocument();
    expect(screen.getByText(comparison.description)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Best Portable Blenders Compared/ })).toHaveAttribute(
      'href',
      '/comparisons/best-portable-blenders-compared'
    );
  });

  it('shows an empty state when there are no comparisons', async () => {
    vi.spyOn(comparisonService, 'getComparisons').mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No comparisons yet')).toBeInTheDocument();
  });

  it('shows an error state when fetching fails', async () => {
    vi.spyOn(comparisonService, 'getComparisons').mockRejectedValue({
      message: 'Network error. Please try again.',
    });
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- src/pages/ComparisonsPage.test.jsx`
Expected: FAIL — neither `comparisonService.js` nor `frontend/src/pages/ComparisonsPage.jsx` exists yet.

- [ ] **Step 3: Write `comparisonService.js`**

```js
import api from './api.js';

export async function getComparisons() {
  const response = await api.get('/public/comparisons');
  return response.data.data;
}

export async function getComparisonBySlug(slug) {
  const response = await api.get(`/public/comparisons/${slug}`);
  return response.data.data;
}
```

- [ ] **Step 4: Write `pages/ComparisonsPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { getComparisons } from '../services/comparisonService.js';
import { getSettings } from '../services/settingsService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function ComparisonsPage() {
  const [settings, setSettings] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    getComparisons()
      .then(setComparisons)
      .catch((err) => setError(err.message ?? 'Failed to load comparisons.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Comparisons"
            description="Side-by-side breakdowns to help you pick the right product."
          />

          {isLoading && <LoadingSpinner label="Loading comparisons..." />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && comparisons.length === 0 && (
            <EmptyState title="No comparisons yet" description="Check back soon for curated product comparisons." />
          )}
          {!isLoading && !error && comparisons.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {comparisons.map((comparison) => (
                <Link
                  key={comparison.id}
                  to={`/comparisons/${comparison.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="aspect-video overflow-hidden bg-slate-100">
                    {getImageUrl(comparison.coverImageFilename) ? (
                      <img
                        src={getImageUrl(comparison.coverImageFilename)}
                        alt={comparison.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                        No image available
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-base font-semibold text-slate-900">{comparison.title}</h3>
                    <p className="line-clamp-2 text-sm text-slate-600">{comparison.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer settings={settings} />
    </div>
  );
}

export default ComparisonsPage;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npm test -- src/pages/ComparisonsPage.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/comparisonService.js frontend/src/pages/ComparisonsPage.jsx \
        frontend/src/pages/ComparisonsPage.test.jsx
git commit -m "feat: add public ComparisonsPage list"
```

---

### Task 2: Public `ComparisonDetailPage` (7 regions)

**Files:**
- Create: `frontend/src/pages/ComparisonDetailPage.jsx`
- Test: `frontend/src/pages/ComparisonDetailPage.test.jsx`

**Interfaces:**
- Consumes: `getComparisonBySlug` (Task 1's `comparisonService.js`), `ProductGrid`/`SectionHeading`/`Navbar`/`Footer` (existing).
- Produces: `ComparisonDetailPage()` (default export, no props, reads `:slug` from the route — not `:id`, matching Stage 1's slug-based public API). Used by Task 3 (route wiring).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/pages/ComparisonDetailPage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonDetailPage from './ComparisonDetailPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as comparisonService from '../services/comparisonService.js';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';

const fullComparison = {
  id: 1,
  title: 'Best Portable Blenders Compared',
  slug: 'best-portable-blenders-compared',
  description: 'Compare features and find the best portable blender for your needs.',
  coverImageFilename: null,
  categoryName: 'Kitchen',
  seoTitle: null,
  seoDescription: null,
  createdAt: '2026-07-20T10:00:00',
  products: [
    {
      id: 101,
      product: {
        id: 10,
        name: 'BlendJet 2',
        imageFileName: null,
        productLink: 'https://amazon.com/dp/blendjet2',
      },
      badge: 'Best Overall',
      recommendation: 'Great all-around portable blender.',
      bestFor: 'Daily smoothies',
      mainStrength: 'Portability',
      mainWeakness: 'Battery life',
      pros: 'Compact\nEasy to clean',
      cons: 'Small capacity',
      editorsScore: 8.5,
    },
    {
      id: 102,
      product: {
        id: 20,
        name: 'Hamilton Beach Portable',
        imageFileName: null,
        productLink: 'https://amazon.com/dp/hamiltonbeach',
      },
      badge: null,
      recommendation: 'Solid budget pick.',
      bestFor: 'Budget shoppers',
      mainStrength: 'Price',
      mainWeakness: 'Noise',
      pros: null,
      cons: null,
      editorsScore: null,
    },
  ],
  specRows: [
    {
      id: 201,
      groupLabel: 'Performance',
      rowLabel: 'Capacity',
      values: [
        { productId: 10, value: '16 oz', tier: 'BEST' },
        { productId: 20, value: '20 oz', tier: 'GOOD' },
      ],
    },
  ],
  sections: [{ id: 301, heading: 'Buying Tips', body: 'Consider your daily usage before buying.' }],
  faqs: [{ id: 401, question: 'Which is better?', answer: 'It depends on your budget.' }],
  relatedComparisons: [
    { id: 2, title: 'Best Countertop Blenders', slug: 'best-countertop-blenders', coverImageFilename: null },
  ],
  relatedProducts: [
    {
      id: 30,
      name: 'Nutribullet Pro',
      categoryName: 'Kitchen',
      imageFileName: null,
      productLink: 'https://amazon.com/dp/nutribullet',
      trending: false,
      bestSeller: false,
    },
  ],
};

function renderPage(initialEntries = ['/comparisons/best-portable-blenders-compared']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <Routes>
          <Route path="/comparisons/:slug" element={<ComparisonDetailPage />} />
        </Routes>
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('ComparisonDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
  });

  it('renders all populated sections', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('16 oz')).toBeInTheDocument();
    expect(screen.getByText('BlendJet 2')).toBeInTheDocument();
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
    expect(screen.getByText('Compact')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View on Amazon' })).toHaveLength(2);
    expect(screen.getByText('Buying Tips')).toBeInTheDocument();
    expect(screen.getByText('Which is better?')).toBeInTheDocument();
    expect(screen.getByText('Best Countertop Blenders')).toBeInTheDocument();
    expect(screen.getByText('Nutribullet Pro')).toBeInTheDocument();
  });

  it('applies tier-based styling to spec table cells', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    expect(await screen.findByText('16 oz')).toHaveClass('bg-emerald-50');
    expect(screen.getByText('20 oz')).toHaveClass('bg-amber-50');
  });

  it('omits the comparison table, sections, FAQ, and related regions when their data is empty', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue({
      ...fullComparison,
      specRows: [],
      sections: [],
      faqs: [],
      relatedComparisons: [],
      relatedProducts: [],
    });
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 })
    ).toBeInTheDocument();
    expect(screen.queryByText('Comparison Table')).not.toBeInTheDocument();
    expect(screen.queryByText('Buying Tips')).not.toBeInTheDocument();
    expect(screen.queryByText('Frequently Asked Questions')).not.toBeInTheDocument();
    expect(screen.queryByText('Related Comparisons')).not.toBeInTheDocument();
    expect(screen.queryByText('Related Products')).not.toBeInTheDocument();
  });

  it('shows an error state when the comparison is not found', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockRejectedValue({
      message: 'Comparison not found.',
    });
    renderPage();

    expect(await screen.findByText('Comparison not found.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- src/pages/ComparisonDetailPage.test.jsx`
Expected: FAIL — `ComparisonDetailPage.jsx` does not exist yet.

- [ ] **Step 3: Write `pages/ComparisonDetailPage.jsx`**

```jsx
import { Fragment, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { getComparisonBySlug } from '../services/comparisonService.js';
import { getSettings } from '../services/settingsService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function groupSpecRows(specRows) {
  const groups = [];
  for (const row of specRows) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.groupLabel === row.groupLabel) {
      lastGroup.rows.push(row);
    } else {
      groups.push({ groupLabel: row.groupLabel, rows: [row] });
    }
  }
  return groups;
}

function tierClassName(tier) {
  if (tier === 'BEST') return 'bg-emerald-50 text-emerald-800 font-semibold';
  if (tier === 'GOOD') return 'bg-amber-50 text-amber-800';
  return 'text-slate-700';
}

function splitLines(text) {
  return text.split('\n').filter((line) => line.trim());
}

function ComparisonDetailPage() {
  const { slug } = useParams();
  const [settings, setSettings] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    getComparisonBySlug(slug)
      .then(setComparison)
      .catch((err) => setError(err.message ?? 'Comparison not found.'))
      .finally(() => setIsLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {isLoading && <LoadingSpinner label="Loading comparison..." />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && comparison && (
            <>
              {getImageUrl(comparison.coverImageFilename) && (
                <img
                  src={getImageUrl(comparison.coverImageFilename)}
                  alt={comparison.title}
                  className="mb-6 aspect-video w-full rounded-xl object-cover"
                />
              )}
              <p className="mb-2 text-sm font-medium text-indigo-600">{comparison.categoryName}</p>
              <h1 className="mb-4 text-3xl font-bold text-slate-900">{comparison.title}</h1>
              <p className="mb-2 text-base leading-relaxed text-slate-700">{comparison.description}</p>
              <p className="text-xs text-slate-400">
                Last updated{' '}
                {new Date(comparison.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>

              {comparison.specRows.length > 0 && (
                <div className="mt-12">
                  <SectionHeading title="Comparison Table" />
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
                      <thead>
                        <tr>
                          <th scope="col" className="w-40 p-3 text-sm font-medium text-slate-500"></th>
                          {comparison.products.map((cp) => (
                            <th key={cp.id} scope="col" className="p-3 text-sm font-semibold text-slate-900">
                              {cp.product.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupSpecRows(comparison.specRows).map((group) => (
                          <Fragment key={group.groupLabel}>
                            <tr>
                              <th
                                colSpan={comparison.products.length + 1}
                                scope="colgroup"
                                className="bg-slate-50 p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                              >
                                {group.groupLabel}
                              </th>
                            </tr>
                            {group.rows.map((row) => (
                              <tr key={row.id}>
                                <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                                  {row.rowLabel}
                                </th>
                                {comparison.products.map((cp) => {
                                  const value = row.values.find((v) => v.productId === cp.product.id);
                                  return (
                                    <td key={cp.id} className={`p-3 text-sm ${tierClassName(value?.tier)}`}>
                                      {value?.value ?? '—'}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-12">
                <SectionHeading title="Product Breakdown" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {comparison.products.map((cp) => (
                    <div key={cp.id} className="rounded-xl border border-slate-200 p-6">
                      {cp.badge && (
                        <span className="mb-3 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {cp.badge}
                        </span>
                      )}
                      <div className="mb-4 flex items-center gap-4">
                        <img
                          src={getImageUrl(cp.product.imageFileName)}
                          alt={cp.product.name}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{cp.product.name}</h3>
                          {cp.editorsScore !== null && cp.editorsScore !== undefined && (
                            <span className="text-sm font-medium text-slate-600">
                              {cp.editorsScore.toFixed(1)} / 10
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mb-3 text-sm text-slate-700">{cp.recommendation}</p>
                      <dl className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="font-medium text-slate-500">Best For</dt>
                          <dd className="text-slate-700">{cp.bestFor}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-500">Strength</dt>
                          <dd className="text-slate-700">{cp.mainStrength}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-500">Weakness</dt>
                          <dd className="text-slate-700">{cp.mainWeakness}</dd>
                        </div>
                      </dl>
                      {cp.pros && cp.cons && (
                        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <h4 className="mb-1 text-sm font-semibold text-emerald-700">Pros</h4>
                            <ul className="list-inside list-disc text-sm text-slate-700">
                              {splitLines(cp.pros).map((line, index) => (
                                <li key={index}>{line}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="mb-1 text-sm font-semibold text-red-700">Cons</h4>
                            <ul className="list-inside list-disc text-sm text-slate-700">
                              {splitLines(cp.cons).map((line, index) => (
                                <li key={index}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      <a
                        href={cp.product.productLink}
                        target="_blank"
                        rel="nofollow sponsored noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        View on Amazon
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {comparison.sections.length > 0 && (
                <div className="mt-12 space-y-6">
                  {comparison.sections.map((section) => (
                    <div key={section.id}>
                      <h3 className="mb-2 text-xl font-semibold text-slate-900">{section.heading}</h3>
                      <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{section.body}</p>
                    </div>
                  ))}
                </div>
              )}

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

              {comparison.relatedComparisons.length > 0 && (
                <div className="mt-12">
                  <SectionHeading title="Related Comparisons" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {comparison.relatedComparisons.map((related) => (
                      <Link
                        key={related.id}
                        to={`/comparisons/${related.slug}`}
                        className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                      >
                        <div className="aspect-video overflow-hidden bg-slate-100">
                          {getImageUrl(related.coverImageFilename) ? (
                            <img
                              src={getImageUrl(related.coverImageFilename)}
                              alt={related.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                              No image available
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="text-sm font-semibold text-slate-900">{related.title}</h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!isLoading && !error && comparison && comparison.relatedProducts.length > 0 && (
          <div className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Related Products" />
            <ProductGrid products={comparison.relatedProducts} isLoading={false} error={null} />
          </div>
        )}
      </section>
      <Footer settings={settings} />
    </div>
  );
}

export default ComparisonDetailPage;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- src/pages/ComparisonDetailPage.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ComparisonDetailPage.jsx frontend/src/pages/ComparisonDetailPage.test.jsx
git commit -m "feat: add public ComparisonDetailPage"
```

---

### Task 3: Wire public routes and `Navbar`/`MobileMenu` links

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Navbar.jsx`
- Modify: `frontend/src/components/Navbar.test.jsx`
- Modify: `frontend/src/components/MobileMenu.jsx`
- Modify: `frontend/src/components/MobileMenu.test.jsx`

**Interfaces:**
- Consumes: public `ComparisonsPage` (Task 1), `ComparisonDetailPage` (Task 2).
- Produces: `/comparisons`, `/comparisons/:slug` public routes; "Comparisons" links in both nav surfaces. This is the final integration task for Stage 3 — no dedicated new test file beyond the `Navbar.test.jsx`/`MobileMenu.test.jsx` additions below, matching how routing wiring was handled in every prior stage.

- [ ] **Step 1: Write the failing test additions**

In `Navbar.test.jsx`, add this test (after the existing "renders the Buying Guides link..." test):

```jsx
  it('renders the Comparisons link between Buying Guides and Best Sellers', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Comparisons' })).toHaveAttribute('href', '/comparisons');
  });
```

In `MobileMenu.test.jsx`, add this test (after the existing "renders the Buying Guides link" test):

```jsx
  it('renders the Comparisons link', () => {
    renderMenu();
    expect(screen.getByRole('link', { name: 'Comparisons' })).toHaveAttribute('href', '/comparisons');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- Navbar.test.jsx MobileMenu.test.jsx`
Expected: FAIL — no "Comparisons" link exists in either component yet.

- [ ] **Step 3: Modify `App.jsx`**

Add the imports (alongside the other public page imports) and the two routes (after `/buying-guides/:id`, before `/login`):

```jsx
import PublicComparisonsPage from './pages/ComparisonsPage.jsx';
import ComparisonDetailPage from './pages/ComparisonDetailPage.jsx';
```

```jsx
                <Route path="/buying-guides/:id" element={<BuyingGuideDetailPage />} />
                <Route path="/comparisons" element={<PublicComparisonsPage />} />
                <Route path="/comparisons/:slug" element={<ComparisonDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
```

- [ ] **Step 4: Modify `Navbar.jsx`**

Add a new `NavLink` for "Comparisons" between the "Buying Guides" `NavLink` and the "Best Sellers" `NavLink`:

```jsx
            <NavLink to="/comparisons" className={navLinkClassName}>
              Comparisons
            </NavLink>
```

- [ ] **Step 5: Modify `MobileMenu.jsx`**

Add `{ to: '/comparisons', label: 'Comparisons' }` to `NAV_ITEMS`, positioned after the `/buying-guides` entry and before the `/best-sellers` entry:

```jsx
const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/trending', label: 'Trending' },
  { to: '/categories', label: 'Categories' },
  { to: '/compare', label: 'Compare' },
  { to: '/buying-guides', label: 'Buying Guides' },
  { to: '/comparisons', label: 'Comparisons' },
  { to: '/best-sellers', label: 'Best Sellers' },
];
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd frontend && npm test -- Navbar.test.jsx MobileMenu.test.jsx`
Expected: PASS (10 + 9 tests respectively)

- [ ] **Step 7: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 1 through 2.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/Navbar.jsx frontend/src/components/Navbar.test.jsx \
        frontend/src/components/MobileMenu.jsx frontend/src/components/MobileMenu.test.jsx
git commit -m "feat: wire public comparison routes and navbar links"
```

---

### Task 4: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1-3
- Produces: nothing further downstream — this stage's final gate.

- [ ] **Step 1: Run the entire frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 1 through 3.

- [ ] **Step 2: Run frontend lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings). Apply the established pattern from prior stages if something unanticipated is flagged: fix the real issue directly, never suppress preemptively.

- [ ] **Step 3: Run the frontend production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manual smoke check against the live backend**

Requires the backend dev server running (Stage 1's public comparison endpoints) and real published comparison data (Stage 2's admin UI, or data already created during that stage's smoke check). Restart the backend first if it was already running before this stage's work and hasn't been restarted since Stage 1/2 — though since Stage 3 is frontend-only, no schema/backend changes exist to make this necessary here; a running Stage-1 backend is sufficient as-is.

Using the frontend dev server (`npm run dev`) and a browser: confirm the public `/comparisons` list page renders the published comparison created during Stage 2's smoke check, linking to its detail page by slug; confirm the detail page renders the hero, product cards (with badge, recommendation, pros/cons, editor's score, and a working "View on Amazon" link), and the comparison table with the spec row rendered under its group label; confirm visiting a draft or unknown slug shows the not-found error state; confirm the "Comparisons" link appears in both the desktop navbar and mobile menu.

- [ ] **Step 5: Commit (if the smoke check surfaced any fixes)**

If Step 4 found nothing to fix, there is nothing to commit for this task — Task 3's commit is the final commit of this stage. If it did surface a small fix, apply it, re-run Steps 1-3, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Comparisons public page manual smoke check"
```

---

## Stage 3 Completion

After Task 4, use the `superpowers:finishing-a-development-branch` skill: run the full frontend suite one more time, then present the merge/push/keep-local choice — matching how every prior stage in this project ended.

Stage 4 (SEO + UX/performance polish) remains as a separate plan, starting fresh with brainstorming once this stage is merged/pushed.

