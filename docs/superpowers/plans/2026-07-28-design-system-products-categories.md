# Design System Stage 7: Products & Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retokenize the Products and Categories admin pages/forms (and three shared list-page controls they use) onto the design tokens established in Stages 1–6, with zero behavior change.

**Architecture:** Pure presentation changes — swap ad-hoc Tailwind classes (`slate-*`, `indigo-*`, `red-*`, `amber-*`, `emerald-*`, `rounded-md`) for the project's design tokens (`primary`, `danger`, `warning`, `success`, `muted`, `body`, `heading`, `surface-secondary`, `border`, `rounded-btn`, `rounded-search`, `text-page-heading`, `text-small`), plus one small additive `Button` API extension (a `to` prop for react-router navigation) so two pages' "Add" actions can use the shared `Button` component instead of hand-rolled button-styled links.

**Tech Stack:** React, react-router-dom v6, Tailwind CSS, Vitest, React Testing Library.

## Global Constraints

- Every text/number/select/textarea form input uses `border-border`, `rounded-btn`, `focus:border-primary`, `focus:outline-none`, `focus:ring-2`, `focus:ring-primary` (copied verbatim from `SearchInput`/`FilterDropdown`'s already-tokenized inputs).
- Every form label uses `text-small font-medium text-body`.
- Every field-level error uses `text-danger`; every form-level error banner uses `bg-danger/10 text-danger` (matches `ErrorState`'s existing pattern).
- Every page `<h1>` uses `text-page-heading text-heading` (matches `DashboardPage`, Stage 5).
- Icon-only row actions (Edit/Delete) are NOT converted to the `Button` component — `Button` has no icon-only compact size. They're retokenized in place: `text-muted`, `hover:bg-surface-secondary`, `hover:text-primary` (edit), `hover:text-danger` (delete).
- No change to any validation logic, field set, submit payload shape, search/filter/sort/pagination logic, or existing test assertions (all existing tests in scope query by role/label/text, never class name — verified during planning).
- `Button.jsx`'s existing `href`/no-prop behavior must not change — the new `to` prop is strictly additive.

---

### Task 1: Extend `Button` with a `to` prop for router navigation

**Files:**
- Modify: `frontend/src/components/Button.jsx`
- Test: `frontend/src/components/Button.test.jsx`

**Interfaces:**
- Produces: `<Button to="/some/path" variant="primary">Label</Button>` renders react-router's `<Link to="/some/path">` with the same computed `classes` string as the `href`/button paths. Later tasks (Task 3) consume this.

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/components/Button.test.jsx`. This file has no router context yet, so the new test needs its own `MemoryRouter` wrapper (don't wrap the whole file — the other tests render plain buttons/anchors and don't need one):

```jsx
import { MemoryRouter } from 'react-router-dom';
```

Add this import alongside the existing ones at the top of the file, then add this test inside the `describe('Button', ...)` block:

```jsx
  it('renders a react-router Link when given a to prop', () => {
    render(
      <MemoryRouter>
        <Button to="/admin/products/new">Add Product</Button>
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: 'Add Product' });
    expect(link).toHaveAttribute('href', '/admin/products/new');
    expect(link).toHaveClass('bg-primary', 'text-white');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run Button` (from `frontend/`)
Expected: FAIL — `to` prop is not implemented, so `Button` renders a plain `<button>` with no `href`, and `getByRole('link', ...)` finds nothing.

- [ ] **Step 3: Implement the `to` prop**

In `frontend/src/components/Button.jsx`, add the import and the new branch:

```jsx
import { Link } from 'react-router-dom';

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-btn text-btn transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const VARIANT_CLASSES = {
  primary: 'bg-primary text-white shadow-card hover:bg-primary-hover',
  secondary: 'bg-white text-primary border border-primary hover:bg-primary/5',
  amazon: 'bg-amazon text-[#111827] shadow-card hover:bg-amazon-hover',
  danger: 'bg-danger text-white shadow-card hover:bg-red-700',
};

const SIZE_CLASSES = {
  md: 'px-[28px] py-4',
  sm: 'px-4 py-2',
};

function Button({ variant = 'primary', size = 'md', href, to, className = '', children, ...rest }) {
  const classes = `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

export default Button;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run Button` (from `frontend/`)
Expected: PASS, all tests in `Button.test.jsx` including the new one.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Button.jsx frontend/src/components/Button.test.jsx
git commit -m "feat(admin): add Button to prop for react-router navigation"
```

---

### Task 2: Retokenize shared list controls — FilterDropdown, Pagination

**Files:**
- Modify: `frontend/src/components/FilterDropdown.jsx`
- Modify: `frontend/src/components/Pagination.jsx`

**Interfaces:**
- Consumes: nothing new. No prop or behavior changes to either component.

No test changes — `Pagination.test.jsx` has no class-name assertions (verified during planning), and `FilterDropdown` has no test file. Both files are small enough for a single direct-edit-and-verify task rather than a TDD loop (no new behavior to drive with a test).

- [ ] **Step 1: Edit `FilterDropdown.jsx`**

Change the `<select>`'s className from:

```jsx
className="rounded-md border border-border bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
```

to:

```jsx
className="rounded-btn border border-border bg-white px-3 py-2 text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
```

- [ ] **Step 2: Edit `Pagination.jsx`**

Change the previous-page button's className from:

```jsx
className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
```

to:

```jsx
className="rounded-btn p-2 text-muted hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
```

Change the page-number button's className from:

```jsx
className={`h-9 w-9 rounded-md text-sm font-medium transition ${
  pageNumber === page ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'
}`}
```

to:

```jsx
className={`h-9 w-9 rounded-btn text-sm font-medium transition ${
  pageNumber === page ? 'bg-primary text-white' : 'text-body hover:bg-surface-secondary'
}`}
```

Change the next-page button's className from:

```jsx
className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
```

to:

```jsx
className="rounded-btn p-2 text-muted hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
```

- [ ] **Step 3: Run the full test suite to confirm nothing broke**

Run: `npm test -- --run` (from `frontend/`)
Expected: PASS, 313/313 (same count as before this task — no tests added or removed).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/FilterDropdown.jsx frontend/src/components/Pagination.jsx
git commit -m "style(admin): retokenize FilterDropdown and Pagination"
```

---

### Task 3: Retokenize ProductsPage

**Files:**
- Modify: `frontend/src/pages/admin/ProductsPage.jsx`

**Interfaces:**
- Consumes: `Button`'s `to` prop from Task 1 (`import Button from '../../components/Button.jsx'`).

No test changes — `ProductsPage.test.jsx`'s "Add Product" link test (`getByRole('link', { name: 'Add Product' })` with `href="/admin/products/new"`) passes unchanged: react-router's `<Link to="/admin/products/new">` renders an `<a href="/admin/products/new">` inside the test's existing `MemoryRouter` wrapper regardless of whether `Link` is used directly or via `Button`. Verified during planning that no other assertion in this file touches class names.

- [ ] **Step 1: Add the `Button` import**

In `frontend/src/pages/admin/ProductsPage.jsx`, add alongside the existing imports:

```jsx
import Button from '../../components/Button.jsx';
```

- [ ] **Step 2: Replace the page heading and "Add Product" link**

Change:

```jsx
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Product
        </Link>
      </div>
```

to:

```jsx
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-page-heading text-heading">Products</h1>
        <Button to="/admin/products/new" size="sm">
          <Plus size={16} />
          Add Product
        </Button>
      </div>
```

`Link` from `react-router-dom` is no longer used for this element, but is still used below for the row-level Edit link — keep its import.

- [ ] **Step 3: Retokenize the row-level Edit and Delete icon buttons**

Change:

```jsx
          <Link
            to={`/admin/products/${row.id}`}
            aria-label={`Edit ${row.name}`}
            className="inline-flex rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.name}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
```

to:

```jsx
          <Link
            to={`/admin/products/${row.id}`}
            aria-label={`Edit ${row.name}`}
            className="inline-flex rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.name}`}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
          >
            <Trash2 size={16} />
          </button>
```

- [ ] **Step 4: Retokenize the status badges**

Change:

```jsx
          {row.trending && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Trending
            </span>
          )}
          {row.bestSeller && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              Best Seller
            </span>
          )}
          {!row.active && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Inactive
            </span>
          )}
```

to:

```jsx
          {row.trending && (
            <span className="rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-medium text-warning">
              Trending
            </span>
          )}
          {row.bestSeller && (
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              Best Seller
            </span>
          )}
          {!row.active && (
            <span className="rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-muted">
              Inactive
            </span>
          )}
```

- [ ] **Step 5: Run the ProductsPage tests**

Run: `npm test -- --run ProductsPage` (from `frontend/`)
Expected: PASS, all 7 tests in `ProductsPage.test.jsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/ProductsPage.jsx
git commit -m "style(admin): retokenize ProductsPage"
```

---

### Task 4: Retokenize CategoriesPage

**Files:**
- Modify: `frontend/src/pages/admin/CategoriesPage.jsx`

**Interfaces:**
- Consumes: `Button` (no `to` prop needed here — "Add Category" opens a `Modal` via `onClick`, it's not a route).

No test changes — verified during planning that `CategoriesPage.test.jsx` queries by role/label/text only.

- [ ] **Step 1: Add the `Button` import**

In `frontend/src/pages/admin/CategoriesPage.jsx`, add alongside the existing imports:

```jsx
import Button from '../../components/Button.jsx';
```

- [ ] **Step 2: Replace the page heading and "Add Category" button**

Change:

```jsx
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Product Categories</h1>
        <button
          type="button"
          onClick={() => setModalState({ category: null })}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>
```

to:

```jsx
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-page-heading text-heading">Product Categories</h1>
        <Button onClick={() => setModalState({ category: null })} size="sm">
          <Plus size={16} />
          Add Category
        </Button>
      </div>
```

- [ ] **Step 3: Retokenize the row-level Edit and Delete icon buttons**

Change:

```jsx
          <button
            type="button"
            onClick={() => setModalState({ category: row })}
            aria-label={`Edit ${row.productCategoryName}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.productCategoryName}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
```

to:

```jsx
          <button
            type="button"
            onClick={() => setModalState({ category: row })}
            aria-label={`Edit ${row.productCategoryName}`}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.productCategoryName}`}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
          >
            <Trash2 size={16} />
          </button>
```

- [ ] **Step 4: Retokenize the search input**

Change:

```jsx
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search categories..."
          aria-label="Search categories"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
```

to:

```jsx
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search categories..."
          aria-label="Search categories"
          className="w-full max-w-sm rounded-search border border-border px-3 py-2 text-sm text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
```

- [ ] **Step 5: Run the CategoriesPage tests**

Run: `npm test -- --run CategoriesPage` (from `frontend/`)
Expected: PASS, all 9 tests in `CategoriesPage.test.jsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/CategoriesPage.jsx
git commit -m "style(admin): retokenize CategoriesPage"
```

---

### Task 5: Retokenize ProductForm and ProductFormPage

**Files:**
- Modify: `frontend/src/components/ProductForm.jsx`
- Modify: `frontend/src/pages/admin/ProductFormPage.jsx`

**Interfaces:**
- Consumes: `Button` component (`variant="secondary"` for Cancel, default `variant="primary"` with `type="submit"` for Submit).

No test changes — verified during planning that `ProductForm.test.jsx` and `ProductFormPage.test.jsx` query by role/label/text only, and the submit/cancel button role names (`'Add Product'`, `'Save Changes'`) are preserved as `Button` children.

- [ ] **Step 1: Add the `Button` import to `ProductForm.jsx`**

```jsx
import Button from './Button.jsx';
```

- [ ] **Step 2: Retokenize the form-level error banner**

Change:

```jsx
      {formError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}
```

to:

```jsx
      {formError && (
        <p role="alert" className="mb-4 rounded-btn bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}
```

- [ ] **Step 3: Retokenize every label/input/error group**

Apply this exact substitution to all five field groups (`name`, `categoryId`, `description`, `productPrice`, `productLink`):
- Label className `"mb-1 block text-sm font-medium text-slate-700"` → `"mb-1 block text-small font-medium text-body"`
- Input/select/textarea className: replace `border-slate-300` with `border-border`, `rounded-md` with `rounded-btn` (only `productPrice`'s input and the others already start `w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900` or `bg-white px-3 py-2 text-slate-900` for the select — keep `text-slate-900` as-is, it's not part of this stage's token set for raw input text and changing it isn't required by the spec), `focus:border-indigo-500` with `focus:border-primary`, `focus:ring-indigo-500` with `focus:ring-primary`
- Error `<p>` className `"mt-1 text-sm text-red-600"` → `"mt-1 text-sm text-danger"`

Concretely, the five groups become:

```jsx
      <div className="mb-4">
        <label htmlFor="name" className="mb-1 block text-small font-medium text-body">
          Product Name
        </label>
        <input
          id="name"
          type="text"
          maxLength={200}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
        />
        {fieldErrors.name && (
          <p id="name-error" className="mt-1 text-sm text-danger">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="categoryId" className="mb-1 block text-small font-medium text-body">
          Category
        </label>
        <select
          id="categoryId"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="w-full rounded-btn border border-border bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.categoryId)}
          aria-describedby={fieldErrors.categoryId ? 'categoryId-error' : undefined}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.productCategoryName}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <p id="categoryId-error" className="mt-1 text-sm text-danger">
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="mb-1 block text-small font-medium text-body">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 'description-error' : undefined}
        />
        {fieldErrors.description && (
          <p id="description-error" className="mt-1 text-sm text-danger">
            {fieldErrors.description}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="productPrice" className="mb-1 block text-small font-medium text-body">
          Price ($)
        </label>
        <input
          id="productPrice"
          type="number"
          step="0.01"
          min="0"
          value={productPrice}
          onChange={(event) => setProductPrice(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.productPrice)}
          aria-describedby={fieldErrors.productPrice ? 'productPrice-error' : undefined}
        />
        {fieldErrors.productPrice && (
          <p id="productPrice-error" className="mt-1 text-sm text-danger">
            {fieldErrors.productPrice}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="productLink" className="mb-1 block text-small font-medium text-body">
          Amazon Affiliate Link
        </label>
        <input
          id="productLink"
          type="text"
          value={productLink}
          onChange={(event) => setProductLink(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.productLink)}
          aria-describedby={fieldErrors.productLink ? 'productLink-error' : undefined}
        />
        {fieldErrors.productLink && (
          <p id="productLink-error" className="mt-1 text-sm text-danger">
            {fieldErrors.productLink}
          </p>
        )}
      </div>
```

- [ ] **Step 4: Retokenize the checkbox labels**

Change:

```jsx
      <div className="mb-6 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={trending} onChange={(event) => setTrending(event.target.checked)} />
          Trending
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={(event) => setBestSeller(event.target.checked)}
          />
          Best Seller
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
      </div>
```

to:

```jsx
      <div className="mb-6 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input type="checkbox" checked={trending} onChange={(event) => setTrending(event.target.checked)} />
          Trending
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={(event) => setBestSeller(event.target.checked)}
          />
          Best Seller
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
      </div>
```

- [ ] **Step 5: Replace the Cancel/Submit buttons with `Button`**

Change:

```jsx
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
        </button>
      </div>
```

to:

```jsx
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
        </Button>
      </div>
```

- [ ] **Step 6: Run the ProductForm tests**

Run: `npm test -- --run ProductForm` (from `frontend/`)
Expected: PASS, all 5 tests in `ProductForm.test.jsx`.

- [ ] **Step 7: Retokenize `ProductFormPage.jsx`'s heading**

Change:

```jsx
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Product' : 'Add Product'}</h1>
```

to:

```jsx
      <h1 className="mb-6 text-page-heading text-heading">{isEditMode ? 'Edit Product' : 'Add Product'}</h1>
```

- [ ] **Step 8: Run the ProductFormPage tests**

Run: `npm test -- --run ProductFormPage` (from `frontend/`)
Expected: PASS, all 4 tests in `ProductFormPage.test.jsx`.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/ProductForm.jsx frontend/src/pages/admin/ProductFormPage.jsx
git commit -m "style(admin): retokenize ProductForm and ProductFormPage"
```

---

### Task 6: Retokenize CategoryForm

**Files:**
- Modify: `frontend/src/components/CategoryForm.jsx`

**Interfaces:**
- Consumes: `Button` component, same usage as Task 5.

No test changes — verified during planning that `CategoryForm.test.jsx` queries by role/label/text only.

- [ ] **Step 1: Add the `Button` import**

```jsx
import Button from './Button.jsx';
```

- [ ] **Step 2: Retokenize the form-level error banner, labels, inputs, and errors**

Change:

```jsx
      {formError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="mb-4">
        <label htmlFor="productCategoryName" className="mb-1 block text-sm font-medium text-slate-700">
          Category Name
        </label>
        <input
          id="productCategoryName"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.productCategoryName)}
          aria-describedby={fieldErrors.productCategoryName ? 'productCategoryName-error' : undefined}
        />
        {fieldErrors.productCategoryName && (
          <p id="productCategoryName-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.productCategoryName}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="commissionRate" className="mb-1 block text-sm font-medium text-slate-700">
          Commission Rate (%)
        </label>
        <input
          id="commissionRate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={commissionRate}
          onChange={(event) => setCommissionRate(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.commissionRate)}
          aria-describedby={fieldErrors.commissionRate ? 'commissionRate-error' : undefined}
        />
        {fieldErrors.commissionRate && (
          <p id="commissionRate-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.commissionRate}
          </p>
        )}
      </div>
```

to:

```jsx
      {formError && (
        <p role="alert" className="mb-4 rounded-btn bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="mb-4">
        <label htmlFor="productCategoryName" className="mb-1 block text-small font-medium text-body">
          Category Name
        </label>
        <input
          id="productCategoryName"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.productCategoryName)}
          aria-describedby={fieldErrors.productCategoryName ? 'productCategoryName-error' : undefined}
        />
        {fieldErrors.productCategoryName && (
          <p id="productCategoryName-error" className="mt-1 text-sm text-danger">
            {fieldErrors.productCategoryName}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="commissionRate" className="mb-1 block text-small font-medium text-body">
          Commission Rate (%)
        </label>
        <input
          id="commissionRate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={commissionRate}
          onChange={(event) => setCommissionRate(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.commissionRate)}
          aria-describedby={fieldErrors.commissionRate ? 'commissionRate-error' : undefined}
        />
        {fieldErrors.commissionRate && (
          <p id="commissionRate-error" className="mt-1 text-sm text-danger">
            {fieldErrors.commissionRate}
          </p>
        )}
      </div>
```

- [ ] **Step 3: Replace the Cancel/Submit buttons with `Button`**

Change:

```jsx
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : category ? 'Save Changes' : 'Add Category'}
        </button>
      </div>
```

to:

```jsx
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : category ? 'Save Changes' : 'Add Category'}
        </Button>
      </div>
```

- [ ] **Step 4: Run the CategoryForm tests**

Run: `npm test -- --run CategoryForm` (from `frontend/`)
Expected: PASS, all 5 tests in `CategoryForm.test.jsx`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CategoryForm.jsx
git commit -m "style(admin): retokenize CategoryForm"
```

---

### Task 7: Full-suite verification and visual check

**Files:** none (verification only)

**Interfaces:** none — this task consumes the finished output of Tasks 1–6 and produces nothing for later tasks.

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run` (from `frontend/`)
Expected: PASS, 314/314 (313 baseline + 1 new `Button` `to`-prop test from Task 1). If a single unrelated failure appears in the ComparisonDetailPage/CompareBar area, this is a known test-order-dependent flake seen in prior stages (not caused by this stage's changes) — re-run the suite once and confirm it passes clean before proceeding.

- [ ] **Step 2: Visual check with chrome-devtools MCP**

Start the frontend dev server if not already running (`npm run dev` from `frontend/`, in the background), then use the chrome-devtools MCP tools to:
- Navigate to `/admin/products` and take a screenshot — confirm the blue "Add Product" button, blue table header (unchanged from the earlier direct DataTable fix), retokenized Trending/Best Seller/Inactive badges, and page heading render correctly at the new larger `text-page-heading` size.
- Click into "Add Product" (or an existing row's Edit action) and take a screenshot of `ProductFormPage` — confirm form field borders, focus states, and the Cancel/Save buttons render correctly.
- Navigate to `/admin/categories`, take a screenshot, then open "Add Category" and screenshot the modal — confirm the same field/button styling.

If anything looks visually wrong (unexpected colors, broken layout), fix it before proceeding — this is the final check before the stage is considered done.

- [ ] **Step 3: No commit needed**

This task is verification-only; nothing to commit unless Step 2 uncovers a fix, in which case commit that fix with an appropriate message before finishing.
