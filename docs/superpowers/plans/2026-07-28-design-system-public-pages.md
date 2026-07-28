# Design System Stage 3: Public Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retokenize the remaining public-facing pages and components Stage 2 didn't touch — the shared filter/browse components, Homepage section rhythm, the Comparisons/Buying Guides list pages, and Buying Guide detail-page typography — using Stage 1's tokens.

**Architecture:** Every task is a styling-only edit to an existing component or page — same JSX structure, same props, same behavior, only `className` values change. No new components are created in this stage.

**Tech Stack:** React 18, Tailwind CSS 3.4 (Stage 1 tokens), Vitest + React Testing Library.

## Global Constraints

- No structural changes to Buying Guide content (no TOC, no pros/cons callout boxes) — the content model is a single free-text field; adding structure is a backend change, out of scope.
- No changes to the `/compare` tool or the Comparisons detail page's comparison table — Stage 4.
- No admin-page changes — Stage 5.
- Vertical section spacing becomes `py-24` (96px) everywhere in this stage's scope, replacing the current `py-16 sm:py-20` (and HomePage's `py-10` social-links section) — Tailwind's default `24` spacing step is already exactly 6rem/96px, no new token needed.
- None of this stage's test files contain class-name assertions (confirmed during design) — no test files need modification.

---

### Task 1: Restyle shared filter/browse components

**Files:**
- Modify: `frontend/src/components/CategoryCard.jsx`
- Modify: `frontend/src/components/SearchInput.jsx`
- Modify: `frontend/src/components/ProductFilters.jsx`
- Modify: `frontend/src/components/FilterDropdown.jsx`
- Modify: `frontend/src/components/Pagination.jsx`

**Interfaces:**
- Consumes: Stage 1 tokens (`rounded-card`, `shadow-card`, `shadow-card-hover`, `rounded-search`, `text-card-title`, `text-body`, colors `primary`, `border`, `muted`, `heading`).
- Produces: nothing new — these are leaf components already consumed by `HomePage` and `CatalogPage` (Task 2/3 don't need to change how they're called).

None of these five components have a test file with class-name assertions — confirmed by inspection (`CategoryCard.test.jsx`, `SearchInput.test.jsx`, `ProductFilters.test.jsx`, `FilterDropdown.test.jsx`, `Pagination.test.jsx` all query by role/text only). No test changes needed; run each existing test file after editing to confirm it still passes unchanged.

- [ ] **Step 1: Update `CategoryCard.jsx`**

Full file:

```jsx
import { motion } from 'framer-motion';

function CategoryCard({ category, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick(category.id)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3 }}
      className="rounded-card border border-slate-200 bg-white px-6 py-8 text-center shadow-card transition hover:-translate-y-1 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <span className="text-card-title text-heading">{category.productCategoryName}</span>
    </motion.button>
  );
}

export default CategoryCard;
```

- [ ] **Step 2: Run the CategoryCard test to verify it still passes**

Run: `cd frontend && npm test -- --run CategoryCard`
Expected: PASS, unchanged.

- [ ] **Step 3: Update `SearchInput.jsx`**

In `frontend/src/components/SearchInput.jsx`, replace:

```jsx
      <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search products"
        className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
```

with:

```jsx
      <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search products"
        className="w-full rounded-search border border-border py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
```

- [ ] **Step 4: Run the SearchInput test to verify it still passes**

Run: `npm test -- --run SearchInput`
Expected: PASS, unchanged.

- [ ] **Step 5: Update `ProductFilters.jsx`**

In `frontend/src/components/ProductFilters.jsx`, replace:

```jsx
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === quickFilter.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
```

with:

```jsx
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === quickFilter.value ? 'bg-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
```

- [ ] **Step 6: Run the ProductFilters test to verify it still passes**

Run: `npm test -- --run ProductFilters`
Expected: PASS, unchanged.

- [ ] **Step 7: Update `FilterDropdown.jsx`**

Full file:

```jsx
function FilterDropdown({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-body">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-border bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default FilterDropdown;
```

- [ ] **Step 8: Run the FilterDropdown test to verify it still passes**

Run: `npm test -- --run FilterDropdown`
Expected: PASS, unchanged.

- [ ] **Step 9: Update `Pagination.jsx`**

In `frontend/src/components/Pagination.jsx`, replace:

```jsx
          className={`h-9 w-9 rounded-md text-sm font-medium transition ${
            pageNumber === page ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
```

with:

```jsx
          className={`h-9 w-9 rounded-md text-sm font-medium transition ${
            pageNumber === page ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
```

- [ ] **Step 10: Run the Pagination test to verify it still passes**

Run: `npm test -- --run Pagination`
Expected: PASS, unchanged.

- [ ] **Step 11: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as before this task (no tests added or removed).

- [ ] **Step 12: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/CategoryCard.jsx frontend/src/components/SearchInput.jsx frontend/src/components/ProductFilters.jsx frontend/src/components/FilterDropdown.jsx frontend/src/components/Pagination.jsx
git commit -m "feat(design-system): restyle shared filter/browse components with design tokens"
```

---

### Task 2: Restyle CatalogPage (Trending, Best Sellers, Categories)

**Files:**
- Modify: `frontend/src/components/CatalogPage.jsx`
- Modify: `frontend/src/pages/CategoriesPage.jsx`

**Interfaces:**
- Consumes: Task 1's retokenized `SearchInput`/`ProductFilters`/`Pagination`/`CategoryCard` (already imported by these files — no import changes needed, just inherits their new look).
- Produces: nothing new. `TrendingPage.jsx` and `BestSellersPage.jsx` need no changes — they only pass `title`/`description`/`initialFilter` props to `CatalogPage`, which this task updates internally.

Neither `CatalogPage.test.jsx` nor any test for `TrendingPage`/`BestSellersPage`/`CategoriesPage` contains class-name assertions — no test changes needed.

- [ ] **Step 1: Update `CatalogPage.jsx`**

In `frontend/src/components/CatalogPage.jsx`, replace:

```jsx
      <section className="scroll-mt-20 bg-slate-50 py-16 sm:py-20">
```

with:

```jsx
      <section className="scroll-mt-20 bg-surface-secondary py-24">
```

- [ ] **Step 2: Run the CatalogPage, TrendingPage, and BestSellersPage tests to verify they still pass**

Run: `npm test -- --run CatalogPage TrendingPage BestSellersPage`
Expected: PASS, unchanged.

- [ ] **Step 3: Update `CategoriesPage.jsx`**

In `frontend/src/pages/CategoriesPage.jsx`, replace:

```jsx
      {categories.length > 0 && (
        <section className="py-16 sm:py-20">
```

with:

```jsx
      {categories.length > 0 && (
        <section className="py-24">
```

- [ ] **Step 4: Run the CategoriesPage test to verify it still passes**

Run: `npm test -- --run CategoriesPage`
Expected: PASS, unchanged.

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 1.

- [ ] **Step 6: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/CatalogPage.jsx frontend/src/pages/CategoriesPage.jsx
git commit -m "feat(design-system): restyle CatalogPage with design tokens and 96px section rhythm"
```

---

### Task 3: Restyle HomePage

**Files:**
- Modify: `frontend/src/pages/HomePage.jsx`

**Interfaces:**
- Consumes: nothing new from earlier tasks (uses already-restyled `HeroSection`/`SectionHeading`/`ProductGrid`/`CategoryCard`/`ProductFilters`/`SearchInput`/`Pagination` as-is).
- Produces: nothing new.

`HomePage.test.jsx` contains no class-name assertions — no test changes needed.

- [ ] **Step 1: Update section backgrounds and spacing in `HomePage.jsx`**

Replace each of the following blocks (all currently in `frontend/src/pages/HomePage.jsx`):

```jsx
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SocialLinks settings={settings} />
        </div>
      </section>
```

with:

```jsx
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SocialLinks settings={settings} />
        </div>
      </section>
```

```jsx
      {featured.products.length > 0 && (
        <section className="bg-slate-50 py-16 sm:py-20">
```

with:

```jsx
      {featured.products.length > 0 && (
        <section className="bg-surface-secondary py-24">
```

```jsx
      {trending.products.length > 0 && (
        <section className="py-16 sm:py-20">
```

with:

```jsx
      {trending.products.length > 0 && (
        <section className="py-24">
```

```jsx
      {bestSellers.products.length > 0 && (
        <section className="bg-slate-50 py-16 sm:py-20">
```

with:

```jsx
      {bestSellers.products.length > 0 && (
        <section className="bg-surface-secondary py-24">
```

```jsx
      {categories.length > 0 && (
        <section className="py-16 sm:py-20">
```

with:

```jsx
      {categories.length > 0 && (
        <section className="py-24">
```

```jsx
      <section id="catalog" className="scroll-mt-20 bg-slate-50 py-16 sm:py-20">
```

with:

```jsx
      <section id="catalog" className="scroll-mt-20 bg-surface-secondary py-24">
```

```jsx
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <SectionHeading title="Why Shop with 2Go Findz" />
```

with:

```jsx
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <SectionHeading title="Why Shop with 2Go Findz" />
```

```jsx
      <section className="bg-indigo-50 py-16 sm:py-20">
```

with:

```jsx
      <section className="bg-surface-secondary py-24">
```

- [ ] **Step 2: Update the "Why Shop" item typography**

Replace:

```jsx
                <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
```

with:

```jsx
                <h3 className="text-card-title text-heading">{item.title}</h3>
                <p className="mt-2 text-small text-body">{item.description}</p>
```

- [ ] **Step 3: Run the HomePage test to verify it still passes**

Run: `npm test -- --run HomePage`
Expected: PASS, unchanged.

- [ ] **Step 4: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 2.

- [ ] **Step 5: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/pages/HomePage.jsx
git commit -m "feat(design-system): restyle HomePage with design tokens and 96px section rhythm"
```

---

### Task 4: Restyle Comparisons and Buying Guides list pages

**Files:**
- Modify: `frontend/src/pages/ComparisonsPage.jsx`
- Modify: `frontend/src/pages/BuyingGuidesPage.jsx`

**Interfaces:**
- Consumes: nothing new from earlier tasks.
- Produces: nothing new.

Neither `ComparisonsPage.test.jsx` nor `BuyingGuidesPage.test.jsx` contains class-name assertions — no test changes needed.

- [ ] **Step 1: Update `ComparisonsPage.jsx`**

Replace:

```jsx
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Comparisons"
            description="Side-by-side breakdowns to help you pick the right product."
          />
```

with:

```jsx
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Comparisons"
            description="Side-by-side breakdowns to help you pick the right product."
          />
```

Replace:

```jsx
                <Link
                  key={comparison.id}
                  to={`/comparisons/${comparison.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
```

with:

```jsx
                <Link
                  key={comparison.id}
                  to={`/comparisons/${comparison.slug}`}
                  className="group flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover"
                >
```

Replace:

```jsx
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-base font-semibold text-slate-900">{comparison.title}</h3>
                    <p className="line-clamp-2 text-sm text-slate-600">{comparison.description}</p>
                  </div>
```

with:

```jsx
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-card-title text-heading">{comparison.title}</h3>
                    <p className="line-clamp-2 text-small text-body">{comparison.description}</p>
                  </div>
```

- [ ] **Step 2: Run the ComparisonsPage test to verify it still passes**

Run: `npm test -- --run "src/pages/ComparisonsPage.test.jsx"`
Expected: PASS, unchanged.

- [ ] **Step 3: Update `BuyingGuidesPage.jsx`**

Replace:

```jsx
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Buying Guides" description="Curated advice to help you choose the right products." />
```

with:

```jsx
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Buying Guides" description="Curated advice to help you choose the right products." />
```

Replace:

```jsx
                <Link
                  key={guide.id}
                  to={`/buying-guides/${guide.id}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
```

with:

```jsx
                <Link
                  key={guide.id}
                  to={`/buying-guides/${guide.id}`}
                  className="group flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover"
                >
```

Replace:

```jsx
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-base font-semibold text-slate-900">{guide.title}</h3>
                    <p className="line-clamp-2 text-sm text-slate-600">{guide.excerpt}</p>
                  </div>
```

with:

```jsx
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-card-title text-heading">{guide.title}</h3>
                    <p className="line-clamp-2 text-small text-body">{guide.excerpt}</p>
                  </div>
```

- [ ] **Step 4: Run the BuyingGuidesPage test to verify it still passes**

Run: `npm test -- --run "src/pages/BuyingGuidesPage.test.jsx"`
Expected: PASS, unchanged.

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 3.

- [ ] **Step 6: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/pages/ComparisonsPage.jsx frontend/src/pages/BuyingGuidesPage.jsx
git commit -m "feat(design-system): restyle Comparisons and Buying Guides list pages with design tokens"
```

---

### Task 5: Restyle BuyingGuideDetailPage

**Files:**
- Modify: `frontend/src/pages/BuyingGuideDetailPage.jsx`

**Interfaces:**
- Consumes: nothing new from earlier tasks.
- Produces: nothing new — this is the last restyle task.

`BuyingGuideDetailPage.test.jsx` contains no class-name assertions — no test changes needed.

- [ ] **Step 1: Update `BuyingGuideDetailPage.jsx`**

Replace:

```jsx
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {isLoading && <LoadingSpinner label="Loading buying guide..." />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && guide && (
            <>
              {getImageUrl(guide.coverImageFilename) && (
                <img
                  src={getImageUrl(guide.coverImageFilename)}
                  alt={guide.title}
                  className="mb-6 aspect-video w-full rounded-xl object-cover"
                />
              )}
              <h1 className="mb-4 text-3xl font-bold text-slate-900">{guide.title}</h1>
              <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{guide.content}</p>
            </>
          )}
        </div>
```

with:

```jsx
      <section className="py-24">
        <div className="mx-auto max-w-reading px-4 sm:px-6 lg:px-8">
          {isLoading && <LoadingSpinner label="Loading buying guide..." />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && guide && (
            <>
              {getImageUrl(guide.coverImageFilename) && (
                <img
                  src={getImageUrl(guide.coverImageFilename)}
                  alt={guide.title}
                  className="mb-6 aspect-video w-full rounded-image object-cover"
                />
              )}
              <h1 className="mb-4 text-page-heading text-heading">{guide.title}</h1>
              <p className="whitespace-pre-line text-body">{guide.content}</p>
            </>
          )}
        </div>
```

- [ ] **Step 2: Run the BuyingGuideDetailPage test to verify it still passes**

Run: `npm test -- --run BuyingGuideDetailPage`
Expected: PASS, unchanged.

- [ ] **Step 3: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 4.

- [ ] **Step 4: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/pages/BuyingGuideDetailPage.jsx
git commit -m "feat(design-system): restyle BuyingGuideDetailPage with magazine-style typography"
```

---

### Task 6: Final verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: nothing for later tasks — this is the stage's closing gate. Stage 4 (Comparison Tables) starts from the pages this task confirms are working.

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

Restart the frontend dev server if it was already running (rules out any stale-HMR state), then in a browser:

1. Homepage: confirm all sections have visibly consistent, generous vertical spacing; alternating backgrounds are neutral gray (`surface-secondary`), not indigo-tinted; "Why Shop" items use the card-title/body typography.
2. Trending, Best Sellers, and Categories pages: confirm the same catalog section background/spacing, and that search/filter/pagination controls show primary-blue active states.
3. Category cards: confirm rounded corners, shadow-lift on hover, `text-card-title`.
4. `/comparisons` and `/buying-guides` list pages: confirm their cards now match `ProductCard`'s rounded/shadow treatment.
5. Open a Buying Guide detail page: confirm the narrower reading-width column, larger Space Grotesk title, and comfortable body-text line height.

- [ ] **Step 5: Report results**

If all checks pass, this stage is complete — no further commit needed (Tasks 1–5 already committed their own work). If the smoke check surfaces a real bug, fix it, re-run Steps 1–3, and commit the fix with an appropriate message before considering the stage done.

---

This closes out Stage 3 of the 6-stage UI/UX redesign (Public Pages). Stage 4 (Comparison Tables) applies the design system to the `/compare` tool and the Comparisons detail page's comparison table: sticky header/image, alternating rows, tier icons, hover highlighting.
