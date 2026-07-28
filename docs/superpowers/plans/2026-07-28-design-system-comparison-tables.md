# Design System Stage 4: Comparison Tables Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the `/compare` tool's table, the Comparisons detail page's comparison table, and the rest of that page's hand-rolled sections, using Stage 1–3's tokens and the `Button` component.

**Architecture:** Every task is a styling-only edit to an existing page — same data flow, same props, same behavior — except Task 2, which adds two small, well-motivated pieces of markup (a product thumbnail in each table header cell, a tier icon on `BEST` values) alongside its retokenization.

**Tech Stack:** React 18, Tailwind CSS 3.4 (Stage 1 tokens), `Button` component (Stage 2), Lucide React icons, Vitest + React Testing Library.

## Global Constraints

- No changes to `ComparisonsPage.jsx`, `BuyingGuidesPage.jsx`, or `BuyingGuideDetailPage.jsx` — already covered in Stage 3.
- No admin-page changes — Stage 5.
- No animation changes beyond what's already in place — Stage 6.
- No changes to the spec-row/tier data model — presentation only.
- "Icons instead of Yes/No text" has no boolean data anywhere in either table — dropped for the `/compare` table (same precedent as Stage 1 dropping star-ratings/bookmarks); partially satisfied for the Comparisons table via a `BEST`-tier icon, the one place with real categorical data.

---

### Task 1: Restyle the `/compare` tool table

**Files:**
- Modify: `frontend/src/pages/ComparePage.jsx`

**Interfaces:**
- Consumes: `Button` from Stage 2 (`frontend/src/components/Button.jsx`).
- Produces: nothing new.

`ComparePage.test.jsx` contains no class-name assertions — confirmed by inspection. Its `getAllByRole('link', { name: /view on amazon/i })` query (expects length 2) keeps passing once the CTA becomes a `Button`-rendered `<a>`, since `Button` renders `<a>` when given `href` and preserves the accessible name. No test changes needed.

- [ ] **Step 1: Add the sticky header and alternating/hover row styling**

In `frontend/src/pages/ComparePage.jsx`, replace:

```jsx
              <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
                <thead>
                  <tr>
```

with:

```jsx
              <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
                <thead className="sticky top-16 z-10 bg-white">
                  <tr>
```

Replace:

```jsx
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Name
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm font-semibold text-slate-900">
                        {product.name}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Category
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-700">
                        {product.categoryName}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Price
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm font-semibold text-slate-900">
                        ${Number(product.productPrice).toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Badges
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-700">
                        <div className="flex flex-wrap gap-1.5">
                          {product.trending && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              Trending
                            </span>
                          )}
                          {product.bestSeller && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                              Best Seller
                            </span>
                          )}
                          {!product.trending && !product.bestSeller && <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Description
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-600">
                        {product.description}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500"></th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3">
                        <a
                          href={product.productLink}
                          target="_blank"
                          rel="nofollow sponsored noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          View on Amazon
                        </a>
                      </td>
                    ))}
                  </tr>
                </tbody>
```

with:

```jsx
                <tbody className="divide-y divide-slate-100">
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Name
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm font-semibold text-slate-900">
                        {product.name}
                      </td>
                    ))}
                  </tr>
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Category
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-700">
                        {product.categoryName}
                      </td>
                    ))}
                  </tr>
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Price
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm font-semibold text-slate-900">
                        ${Number(product.productPrice).toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Badges
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-700">
                        <div className="flex flex-wrap gap-1.5">
                          {product.trending && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              Trending
                            </span>
                          )}
                          {product.bestSeller && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                              Best Seller
                            </span>
                          )}
                          {!product.trending && !product.bestSeller && <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Description
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-600">
                        {product.description}
                      </td>
                    ))}
                  </tr>
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500"></th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3">
                        <Button
                          variant="amazon"
                          href={product.productLink}
                          target="_blank"
                          rel="nofollow sponsored noopener noreferrer"
                        >
                          View on Amazon
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
```

- [ ] **Step 2: Add the Button import and retokenize the empty-state link**

At the top of `frontend/src/pages/ComparePage.jsx`, replace:

```jsx
import { X } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
```

with:

```jsx
import { X } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Button from '../components/Button.jsx';
```

Replace:

```jsx
              <Link to="/#catalog" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
                Browse products
              </Link>
```

with:

```jsx
              <Link to="/#catalog" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                Browse products
              </Link>
```

- [ ] **Step 3: Run the ComparePage test to verify it still passes**

Run: `cd frontend && npm test -- --run ComparePage`
Expected: PASS, unchanged (5 tests).

- [ ] **Step 4: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as before this task.

- [ ] **Step 5: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/pages/ComparePage.jsx
git commit -m "feat(design-system): restyle /compare table with sticky header and design tokens"
```

---

### Task 2: Restyle the Comparisons detail-page table

**Files:**
- Modify: `frontend/src/pages/ComparisonDetailPage.jsx`
- Modify: `frontend/src/pages/ComparisonDetailPage.test.jsx`

**Interfaces:**
- Consumes: nothing new from Task 1 (separate page).
- Produces: nothing new — Task 3 restyles the rest of the same file, working from this task's committed state.

Adding a product thumbnail image to each table header cell means the existing `getByAltText('BlendJet 2')` query in the "lazy-loads product breakdown images" test now matches two images (the new table thumbnail and the existing Product Breakdown image), which throws on a `getBy*` query expecting exactly one match. This step fixes that test alongside the implementation, and adds two new tests for the thumbnail and the tier icon.

- [ ] **Step 1: Write the new/updated failing tests**

In `frontend/src/pages/ComparisonDetailPage.test.jsx`, replace:

```jsx
  it('lazy-loads product breakdown images', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    expect(screen.getByAltText('BlendJet 2')).toHaveAttribute('loading', 'lazy');
  });
```

with:

```jsx
  it('lazy-loads product breakdown images', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    const blendJetImages = screen.getAllByAltText('BlendJet 2');
    expect(blendJetImages.length).toBeGreaterThan(0);
    blendJetImages.forEach((image) => expect(image).toHaveAttribute('loading', 'lazy'));
  });

  it('renders a product thumbnail in each comparison table header cell', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    const table = await screen.findByRole('table');
    const headerImages = within(table).getAllByRole('img');
    expect(headerImages).toHaveLength(2);
  });

  it('shows a check icon next to BEST-tier spec values', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    const bestCell = await screen.findByText('16 oz');
    expect(bestCell.querySelector('svg')).toBeInTheDocument();

    const goodCell = screen.getByText('20 oz');
    expect(goodCell.querySelector('svg')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npm test -- --run ComparisonDetailPage`
Expected: the two new tests FAIL (no thumbnail images, no icon yet); "lazy-loads product breakdown images" passes trivially since `getAllByAltText` still only finds the one existing image at this point.

- [ ] **Step 3: Add the sticky header, product thumbnails, alternating/hover rows, and tier icon**

In `frontend/src/pages/ComparisonDetailPage.jsx`, add the `Check` icon to the existing Lucide import:

```jsx
import { ChevronDown } from 'lucide-react';
```

becomes:

```jsx
import { ChevronDown, Check } from 'lucide-react';
```

Replace the table's `<thead>`:

```jsx
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
```

with:

```jsx
                    <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
                      <thead className="sticky top-[104px] z-10 bg-white">
                        <tr>
                          <th scope="col" className="w-40 p-3 text-sm font-medium text-slate-500"></th>
                          {comparison.products.map((cp) => (
                            <th key={cp.id} scope="col" className="p-3 text-sm font-semibold text-slate-900">
                              <img
                                src={getImageUrl(cp.product.imageFileName)}
                                alt={cp.product.name}
                                loading="lazy"
                                className="mx-auto mb-1 h-10 w-10 rounded-image object-cover"
                              />
                              {cp.product.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
```

Replace the group-label row and spec-value cell rendering:

```jsx
                      <tbody className="divide-y divide-slate-100">
                        {groupedSpecRows.map((group) => (
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
```

with:

```jsx
                      <tbody className="divide-y divide-slate-100">
                        {groupedSpecRows.map((group) => (
                          <Fragment key={group.groupLabel}>
                            <tr>
                              <th
                                colSpan={comparison.products.length + 1}
                                scope="colgroup"
                                className="bg-surface-secondary p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                              >
                                {group.groupLabel}
                              </th>
                            </tr>
                            {group.rows.map((row) => (
                              <tr key={row.id} className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                                <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                                  {row.rowLabel}
                                </th>
                                {comparison.products.map((cp) => {
                                  const value = row.values.find((v) => v.productId === cp.product.id);
                                  return (
                                    <td key={cp.id} className={`p-3 text-sm ${tierClassName(value?.tier)}`}>
                                      {value?.tier === 'BEST' && (
                                        <Check size={14} className="mr-1 inline-block text-emerald-700" />
                                      )}
                                      {value?.value ?? '—'}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --run ComparisonDetailPage`
Expected: PASS, all tests including the two new ones (13 tests total).

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 1, plus 2 (the two new tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/pages/ComparisonDetailPage.jsx frontend/src/pages/ComparisonDetailPage.test.jsx
git commit -m "feat(design-system): restyle Comparisons table with sticky header, product thumbnails, and tier icons"
```

Note: the `sticky top-[104px]` value is an estimate (Navbar ≈64px + the page's existing sticky section-nav ≈40px). Task 4's live smoke check verifies this against the real rendered page and corrects it if the header doesn't sit flush below the section-nav.

---

### Task 3: Restyle the rest of ComparisonDetailPage

**Files:**
- Modify: `frontend/src/pages/ComparisonDetailPage.jsx`

**Interfaces:**
- Consumes: `Button` from Stage 2.
- Produces: nothing new — this is the last restyle task.

None of `ComparisonDetailPage.test.jsx`'s assertions (behavior/text/role-based, confirmed in Task 2's review) are affected by this task's purely cosmetic changes to the hero, sticky nav, product breakdown cards, sections, FAQ, or related-comparisons cards. No further test changes needed beyond what Task 2 already made.

- [ ] **Step 1: Restyle the hero and add the Button import**

Replace:

```jsx
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
```

with:

```jsx
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import Button from '../components/Button.jsx';
```

Replace:

```jsx
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
```

with:

```jsx
              {getImageUrl(comparison.coverImageFilename) && (
                <img
                  src={getImageUrl(comparison.coverImageFilename)}
                  alt={comparison.title}
                  className="mb-6 aspect-video w-full rounded-image object-cover"
                />
              )}
              <p className="mb-2 text-sm font-medium text-primary">{comparison.categoryName}</p>
              <h1 className="mb-4 text-page-heading text-heading">{comparison.title}</h1>
              <p className="mb-2 text-body">{comparison.description}</p>
              <p className="text-small text-muted">
                Last updated{' '}
                {new Date(comparison.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
```

- [ ] **Step 2: Restyle the sticky section nav**

Replace:

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

with:

```jsx
              <nav
                aria-label="Comparison sections"
                className="sticky top-16 z-20 -mx-4 mt-8 border-b border-slate-200 bg-white/90 px-4 py-2 shadow-navbar backdrop-blur print:hidden sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
              >
                <ul className="mx-auto flex max-w-5xl gap-4 overflow-x-auto text-body">
                  {comparison.specRows.length > 0 && (
                    <li>
                      <a href="#comparison-table" className="hover:text-primary">
                        Comparison Table
                      </a>
                    </li>
                  )}
                  <li>
                    <a href="#product-breakdown" className="hover:text-primary">
                      Product Breakdown
                    </a>
                  </li>
                  {comparison.faqs.length > 0 && (
                    <li>
                      <a href="#faq" className="hover:text-primary">
                        FAQ
                      </a>
                    </li>
                  )}
                </ul>
              </nav>
```

- [ ] **Step 3: Restyle the Product Breakdown cards**

Replace:

```jsx
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
                          loading="lazy"
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
                        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 print:hidden"
                      >
                        View on Amazon
                      </a>
                    </div>
                  ))}
```

with:

```jsx
                  {comparison.products.map((cp) => (
                    <div
                      key={cp.id}
                      className="rounded-card border border-slate-200 p-6 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
                    >
                      {cp.badge && (
                        <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {cp.badge}
                        </span>
                      )}
                      <div className="mb-4 flex items-center gap-4">
                        <img
                          src={getImageUrl(cp.product.imageFileName)}
                          alt={cp.product.name}
                          loading="lazy"
                          className="h-20 w-20 rounded-image object-cover"
                        />
                        <div>
                          <h3 className="text-card-title text-heading">{cp.product.name}</h3>
                          {cp.editorsScore !== null && cp.editorsScore !== undefined && (
                            <span className="text-small text-body">{cp.editorsScore.toFixed(1)} / 10</span>
                          )}
                        </div>
                      </div>
                      <p className="mb-3 text-small text-body">{cp.recommendation}</p>
                      <dl className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="font-medium text-muted">Best For</dt>
                          <dd className="text-body">{cp.bestFor}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-muted">Strength</dt>
                          <dd className="text-body">{cp.mainStrength}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-muted">Weakness</dt>
                          <dd className="text-body">{cp.mainWeakness}</dd>
                        </div>
                      </dl>
                      {cp.pros && cp.cons && (
                        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <h4 className="mb-1 text-sm font-semibold text-success">Pros</h4>
                            <ul className="list-inside list-disc text-small text-body">
                              {splitLines(cp.pros).map((line, index) => (
                                <li key={index}>{line}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="mb-1 text-sm font-semibold text-danger">Cons</h4>
                            <ul className="list-inside list-disc text-small text-body">
                              {splitLines(cp.cons).map((line, index) => (
                                <li key={index}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      <Button
                        variant="amazon"
                        href={cp.product.productLink}
                        target="_blank"
                        rel="nofollow sponsored noopener noreferrer"
                        className="print:hidden"
                      >
                        View on Amazon
                      </Button>
                    </div>
                  ))}
```

- [ ] **Step 4: Restyle custom sections and the FAQ accordion**

Replace:

```jsx
                  {comparison.sections.map((section) => (
                    <div key={section.id}>
                      <h3 className="mb-2 text-xl font-semibold text-slate-900">{section.heading}</h3>
                      <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{section.body}</p>
                    </div>
                  ))}
```

with:

```jsx
                  {comparison.sections.map((section) => (
                    <div key={section.id}>
                      <h3 className="mb-2 text-card-title text-heading">{section.heading}</h3>
                      <p className="whitespace-pre-line text-body">{section.body}</p>
                    </div>
                  ))}
```

Replace:

```jsx
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
```

with:

```jsx
                        <div key={faq.id} className="border-b border-border pb-4">
                          <button
                            type="button"
                            onClick={() => toggleFaq(faq.id)}
                            aria-expanded={isExpanded}
                            className="flex w-full items-center justify-between text-left text-card-title text-heading"
                          >
                            {faq.question}
                            <ChevronDown
                              size={18}
                              className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </button>
                          {isExpanded && <p className="mt-2 text-small text-body">{faq.answer}</p>}
                        </div>
```

- [ ] **Step 5: Restyle the Related Comparisons cards**

Replace:

```jsx
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
```

with:

```jsx
                      <Link
                        key={related.id}
                        to={`/comparisons/${related.slug}`}
                        className="group flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover"
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
                          <h4 className="text-sm font-semibold text-heading">{related.title}</h4>
                        </div>
                      </Link>
```

- [ ] **Step 6: Run the ComparisonDetailPage test to verify it still passes**

Run: `cd frontend && npm test -- --run ComparisonDetailPage`
Expected: PASS, all 13 tests (same count as end of Task 2).

- [ ] **Step 7: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 2.

- [ ] **Step 8: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/pages/ComparisonDetailPage.jsx
git commit -m "feat(design-system): restyle ComparisonDetailPage hero, breakdown cards, sections, FAQ, and related comparisons"
```

---

### Task 4: Final verification

**Files:** none (verification only, except a possible one-line fix to the sticky offset from Task 2).

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: nothing for later tasks — this is the stage's closing gate. Stage 5 (Admin Dashboard) starts from here.

- [ ] **Step 1: Run the full frontend test suite**

Run: `cd frontend && npm test -- --run`
Expected: all tests pass.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors or warnings.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds (pre-existing chunk-size warning only).

- [ ] **Step 4: Live smoke check**

Restart the frontend dev server if it was already running (rules out stale-HMR state), then in a browser:

1. `/compare` with 2+ products selected: confirm the table header (with product images) sticks to the top when you scroll the page down, positioned just below the Navbar; confirm alternating row backgrounds and hover highlighting; confirm "View on Amazon" is amazon-orange.
2. A Comparisons detail page with a populated spec table: confirm each table header cell shows a small product thumbnail above the name; confirm the table header sticks below both the Navbar and the sticky section-nav as you scroll — if there's a visible gap or overlap, adjust the `top-[104px]` value from Task 2 to match the actual measured offset (inspect the section-nav's rendered height in devtools, or binary-search the value visually), then re-run Steps 1–3 and commit the fix as `fix(design-system): correct Comparisons table sticky header offset`.
3. Confirm a `BEST`-tier spec value shows the check icon; confirm `GOOD`/`STANDARD` values don't.
4. Confirm the hero, Product Breakdown cards (rounded/shadow/hover-lift), custom sections, FAQ accordion, and Related Comparisons cards all reflect the new typography and color tokens.
5. Print-preview the Comparisons detail page (browser print dialog or `window.print()`) and confirm the Amazon CTA buttons and sticky section-nav still hide correctly (pre-existing `print:hidden` classes, unaffected by this stage — just confirm the `Button`-rendered CTA still carries `print:hidden`).

- [ ] **Step 5: Report results**

If all checks pass (or only the sticky-offset value needed correcting), this stage is complete. If the smoke check surfaces any other real bug, fix it, re-run Steps 1–3, and commit the fix with an appropriate message before considering the stage done.

---

This closes out Stage 4 of the 6-stage UI/UX redesign (Comparison Tables). Stage 5 (Admin Dashboard) applies the design system to the Sidebar, Topbar, DataTable, admin forms, and dashboard analytics.
