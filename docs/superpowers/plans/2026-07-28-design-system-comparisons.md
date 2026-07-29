# Design System Stage 9: Comparisons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retokenize `ComparisonsPage`, `ComparisonForm` (shell + 5 of its 6 tabs), and `ComparisonFormPage` onto the design tokens established in Stages 1–8, with zero behavior change.

**Architecture:** Pure presentation changes — swap ad-hoc Tailwind classes (`slate-*`, `indigo-*`, `red-*`, `emerald-*`, `rounded-md`) for the project's design tokens, reusing the exact mappings validated in Stages 7–8. `RelatedTab.jsx` needs no task: it only composes `ProductPicker`/`ComparisonPicker`, already fixed via `EntityPicker` in Stage 8.

**Tech Stack:** React, react-router-dom v6, Tailwind CSS, Vitest, React Testing Library.

## Global Constraints

- Every text/number/select/textarea form input uses `border-border`, `rounded-btn`, `focus:border-primary`, `focus:outline-none`, `focus:ring-2`, `focus:ring-primary`.
- Every form label uses `text-small font-medium text-body` (or, for the smaller per-item field labels already using `text-xs`, keep `text-xs` but retokenize the color to `text-body` — do not change the size, only the color and boldness class stays `font-medium`).
- Every field-level error uses `text-danger`; every form-level error banner uses `bg-danger/10 text-danger`.
- Every page `<h1>` uses `text-page-heading text-heading`.
- Icon-only row/list actions are NOT converted to the `Button` component — retokenized in place: `text-muted`, `hover:bg-surface-secondary`, plus `hover:text-primary` for "edit"/"move" actions or `hover:text-danger` for "delete"/"remove" actions.
- Ad-hoc `bg-indigo-600` "Add X" buttons (Add Row, Add Section, Add FAQ) become `<Button variant="primary" size="sm">`.
- No change to any validation logic, tab-switching logic, drag/reorder logic, submit payload shape, or existing test assertions (all existing tests in scope query by role/label/text, never class name — verified during planning).

---

### Task 1: Retokenize ComparisonsPage

**Files:**
- Modify: `frontend/src/pages/admin/ComparisonsPage.jsx`

**Interfaces:**
- Consumes: `Button`'s `to` prop (`import Button from '../../components/Button.jsx'`), added in Stage 7.

No test changes — verified during planning that `ComparisonsPage.test.jsx` queries by role/label/text only.

- [ ] **Step 1: Add the `Button` import**

```jsx
import Button from '../../components/Button.jsx';
```

- [ ] **Step 2: Replace the page heading and "Add Comparison" link**

Change:

```jsx
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Comparisons</h1>
        <Link
          to="/admin/comparisons/new"
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Comparison
        </Link>
      </div>
```

to:

```jsx
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-page-heading text-heading">Comparisons</h1>
        <Button to="/admin/comparisons/new" size="sm">
          <Plus size={16} />
          Add Comparison
        </Button>
      </div>
```

`Link` from `react-router-dom` is still used below for the row-level Edit link — keep its import.

- [ ] **Step 3: Retokenize the row-level Edit and Delete icon buttons**

Change:

```jsx
          <Link
            to={`/admin/comparisons/${row.id}`}
            aria-label={`Edit ${row.title}`}
            className="inline-flex rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.title}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
```

to:

```jsx
          <Link
            to={`/admin/comparisons/${row.id}`}
            aria-label={`Edit ${row.title}`}
            className="inline-flex rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.title}`}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
          >
            <Trash2 size={16} />
          </button>
```

- [ ] **Step 4: Retokenize the Published/Draft status badge**

Change:

```jsx
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {row.published ? 'Published' : 'Draft'}
        </span>
```

to:

```jsx
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.published ? 'bg-success/10 text-success' : 'bg-surface-secondary text-muted'
          }`}
        >
          {row.published ? 'Published' : 'Draft'}
        </span>
```

- [ ] **Step 5: Run the ComparisonsPage tests**

Run: `npm test -- --run ComparisonsPage` (from `frontend/`)
Expected: PASS, all 3 tests in `ComparisonsPage.test.jsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/ComparisonsPage.jsx
git commit -m "style(admin): retokenize ComparisonsPage"
```

---

### Task 2: Retokenize the ComparisonForm shell and ComparisonFormPage

**Files:**
- Modify: `frontend/src/components/ComparisonForm.jsx`
- Modify: `frontend/src/pages/admin/ComparisonFormPage.jsx`

**Interfaces:**
- Consumes: `Button` component (`variant="secondary"` for Cancel, default `variant="primary"` with `type="submit"` for Submit).
- Produces: nothing new for later tasks — Tasks 3–6 retokenize the tab content components, which are unaffected by this task's changes to the shell around them.

No test changes — verified during planning that `ComparisonForm.test.jsx` (11 tests, the only coverage for all 6 tabs) and `ComparisonFormPage.test.jsx` query by role/label/text only.

- [ ] **Step 1: Add the `Button` import to `ComparisonForm.jsx`**

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

- [ ] **Step 3: Retokenize the tab switcher**

Change:

```jsx
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex flex-wrap gap-1" aria-label="Comparison form sections">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'true' : undefined}
              className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tabHasError(tab.key, fieldErrors) && (
                <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>
      </div>
```

to:

```jsx
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex flex-wrap gap-1" aria-label="Comparison form sections">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'true' : undefined}
              className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted hover:text-body'
              }`}
            >
              {tab.label}
              {tabHasError(tab.key, fieldErrors) && (
                <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-danger" aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>
      </div>
```

- [ ] **Step 4: Replace the Cancel/Submit buttons with `Button`**

Change:

```jsx
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
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
          {isSubmitting ? 'Saving...' : comparison ? 'Save Changes' : 'Add Comparison'}
        </button>
      </div>
```

to:

```jsx
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : comparison ? 'Save Changes' : 'Add Comparison'}
        </Button>
      </div>
```

- [ ] **Step 5: Run the ComparisonForm tests**

Run: `npm test -- --run ComparisonForm` (from `frontend/`)
Expected: PASS, all 11 tests in `ComparisonForm.test.jsx`. (This run also exercises `ComparisonFormPage.test.jsx` since both match the pattern — confirm both pass.)

- [ ] **Step 6: Retokenize `ComparisonFormPage.jsx`'s heading**

Change:

```jsx
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {isEditMode ? 'Edit Comparison' : 'Add Comparison'}
      </h1>
```

to:

```jsx
      <h1 className="mb-6 text-page-heading text-heading">
        {isEditMode ? 'Edit Comparison' : 'Add Comparison'}
      </h1>
```

- [ ] **Step 7: Run the ComparisonFormPage tests**

Run: `npm test -- --run ComparisonFormPage` (from `frontend/`)
Expected: PASS, both tests in `ComparisonFormPage.test.jsx`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ComparisonForm.jsx frontend/src/pages/admin/ComparisonFormPage.jsx
git commit -m "style(admin): retokenize ComparisonForm shell and ComparisonFormPage"
```

---

### Task 3: Retokenize BasicInfoTab

**Files:**
- Modify: `frontend/src/components/comparison-form/BasicInfoTab.jsx`

**Interfaces:**
- Consumes: nothing new. No prop or behavior changes.

No dedicated test file for this component — it's exercised through `ComparisonForm.test.jsx` (Task 2). Run that suite after this task's edits to confirm nothing broke.

- [ ] **Step 1: Retokenize the Title field**

Change:

```jsx
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          maxLength={200}
          value={values.title}
          onChange={(event) => onChange('title', event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'title-error' : undefined}
        />
        {fieldErrors.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.title}
          </p>
        )}
```

to:

```jsx
        <label htmlFor="title" className="mb-1 block text-small font-medium text-body">
          Title
        </label>
        <input
          id="title"
          type="text"
          maxLength={200}
          value={values.title}
          onChange={(event) => onChange('title', event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'title-error' : undefined}
        />
        {fieldErrors.title && (
          <p id="title-error" className="mt-1 text-sm text-danger">
            {fieldErrors.title}
          </p>
        )}
```

- [ ] **Step 2: Retokenize the URL Slug field**

Change:

```jsx
        <label htmlFor="slug" className="mb-1 block text-sm font-medium text-slate-700">
          URL Slug (optional)
        </label>
        <input
          id="slug"
          type="text"
          maxLength={220}
          value={values.slug}
          onChange={(event) => onChange('slug', event.target.value)}
          placeholder="Leave blank to auto-generate from the title"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.slug)}
          aria-describedby={fieldErrors.slug ? 'slug-error' : undefined}
        />
        {fieldErrors.slug && (
          <p id="slug-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.slug}
          </p>
        )}
```

to:

```jsx
        <label htmlFor="slug" className="mb-1 block text-small font-medium text-body">
          URL Slug (optional)
        </label>
        <input
          id="slug"
          type="text"
          maxLength={220}
          value={values.slug}
          onChange={(event) => onChange('slug', event.target.value)}
          placeholder="Leave blank to auto-generate from the title"
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.slug)}
          aria-describedby={fieldErrors.slug ? 'slug-error' : undefined}
        />
        {fieldErrors.slug && (
          <p id="slug-error" className="mt-1 text-sm text-danger">
            {fieldErrors.slug}
          </p>
        )}
```

- [ ] **Step 3: Retokenize the Description field**

Change:

```jsx
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          maxLength={500}
          value={values.description}
          onChange={(event) => onChange('description', event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 'description-error' : undefined}
        />
        {fieldErrors.description && (
          <p id="description-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.description}
          </p>
        )}
```

to:

```jsx
        <label htmlFor="description" className="mb-1 block text-small font-medium text-body">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          maxLength={500}
          value={values.description}
          onChange={(event) => onChange('description', event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 'description-error' : undefined}
        />
        {fieldErrors.description && (
          <p id="description-error" className="mt-1 text-sm text-danger">
            {fieldErrors.description}
          </p>
        )}
```

- [ ] **Step 4: Retokenize the Category field**

Change:

```jsx
        <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="categoryId"
          value={values.categoryId}
          onChange={(event) => onChange('categoryId', event.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <p id="categoryId-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.categoryId}
          </p>
        )}
```

to:

```jsx
        <label htmlFor="categoryId" className="mb-1 block text-small font-medium text-body">
          Category
        </label>
        <select
          id="categoryId"
          value={values.categoryId}
          onChange={(event) => onChange('categoryId', event.target.value)}
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
```

- [ ] **Step 5: Retokenize the SEO Title and SEO Description fields**

Change:

```jsx
        <label htmlFor="seoTitle" className="mb-1 block text-sm font-medium text-slate-700">
          SEO Title (optional)
        </label>
        <input
          id="seoTitle"
          type="text"
          maxLength={200}
          value={values.seoTitle}
          onChange={(event) => onChange('seoTitle', event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="seoDescription" className="mb-1 block text-sm font-medium text-slate-700">
          SEO Description (optional)
        </label>
        <textarea
          id="seoDescription"
          rows={2}
          maxLength={300}
          value={values.seoDescription}
          onChange={(event) => onChange('seoDescription', event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
```

to:

```jsx
        <label htmlFor="seoTitle" className="mb-1 block text-small font-medium text-body">
          SEO Title (optional)
        </label>
        <input
          id="seoTitle"
          type="text"
          maxLength={200}
          value={values.seoTitle}
          onChange={(event) => onChange('seoTitle', event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="seoDescription" className="mb-1 block text-small font-medium text-body">
          SEO Description (optional)
        </label>
        <textarea
          id="seoDescription"
          rows={2}
          maxLength={300}
          value={values.seoDescription}
          onChange={(event) => onChange('seoDescription', event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
```

- [ ] **Step 6: Retokenize the Published checkbox label**

Change:

```jsx
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.published}
            onChange={(event) => onChange('published', event.target.checked)}
          />
          Published
        </label>
```

to:

```jsx
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input
            type="checkbox"
            checked={values.published}
            onChange={(event) => onChange('published', event.target.checked)}
          />
          Published
        </label>
```

- [ ] **Step 7: Run the ComparisonForm tests**

Run: `npm test -- --run ComparisonForm` (from `frontend/`)
Expected: PASS, all 11 tests in `ComparisonForm.test.jsx`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/comparison-form/BasicInfoTab.jsx
git commit -m "style(admin): retokenize BasicInfoTab"
```

---

### Task 4: Retokenize ProductsTab

**Files:**
- Modify: `frontend/src/components/comparison-form/ProductsTab.jsx`

**Interfaces:**
- Consumes: nothing new. No prop or behavior changes.

No dedicated test file — exercised through `ComparisonForm.test.jsx`.

- [ ] **Step 1: Retokenize the product search input, "Searching..." text, and results dropdown**

Change:

```jsx
      <label htmlFor="productSearch" className="mb-1 block text-sm font-medium text-slate-700">
        Compared Products
      </label>
      <input
        id="productSearch"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products to add..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {isSearching && <p className="mt-1 text-sm text-slate-400">Searching...</p>}
      {!isSearching && results.length > 0 && (
        <ul className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => handleAdd(product)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {fieldErrors.products && <p className="mt-1 text-sm text-red-600">{fieldErrors.products}</p>}
```

to:

```jsx
      <label htmlFor="productSearch" className="mb-1 block text-small font-medium text-body">
        Compared Products
      </label>
      <input
        id="productSearch"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products to add..."
        className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {isSearching && <p className="mt-1 text-sm text-muted">Searching...</p>}
      {!isSearching && results.length > 0 && (
        <ul className="mt-1 rounded-btn border border-border bg-white shadow-card">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => handleAdd(product)}
                className="block w-full px-3 py-2 text-left text-sm text-body hover:bg-surface-secondary"
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {fieldErrors.products && <p className="mt-1 text-sm text-danger">{fieldErrors.products}</p>}
```

- [ ] **Step 2: Retokenize the selected-product card header and its icon buttons**

Change:

```jsx
          <li key={product.productId} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">{product.name}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move ${product.name} up`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === products.length - 1}
                  aria-label={`Move ${product.name} down`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(product.productId)}
                  aria-label={`Remove ${product.name}`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
```

to:

```jsx
          <li key={product.productId} className="rounded-btn border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-heading">{product.name}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move ${product.name} up`}
                  className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === products.length - 1}
                  aria-label={`Move ${product.name} down`}
                  className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(product.productId)}
                  aria-label={`Remove ${product.name}`}
                  className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
```

- [ ] **Step 3: Retokenize the 8-field grid**

Apply this exact substitution to all eight fields (Badge, Editor's Score, Recommendation, Best For, Main Strength, Main Weakness, Pros, Cons): label className `"mb-1 block text-xs font-medium text-slate-700"` → `"mb-1 block text-xs font-medium text-body"`; input/textarea className `"w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"` → `"w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"`.

Concretely:

```jsx
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`badge-${product.productId}`} className="mb-1 block text-xs font-medium text-body">
                  Badge
                </label>
                <input
                  id={`badge-${product.productId}`}
                  type="text"
                  value={product.badge}
                  onChange={(event) => handleFieldChange(index, 'badge', event.target.value)}
                  className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor={`editorsScore-${product.productId}`} className="mb-1 block text-xs font-medium text-body">
                  Editor's Score
                </label>
                <input
                  id={`editorsScore-${product.productId}`}
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={product.editorsScore}
                  onChange={(event) => handleFieldChange(index, 'editorsScore', event.target.value)}
                  className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`recommendation-${product.productId}`} className="mb-1 block text-xs font-medium text-body">
                  Recommendation
                </label>
                <input
                  id={`recommendation-${product.productId}`}
                  type="text"
                  value={product.recommendation}
                  onChange={(event) => handleFieldChange(index, 'recommendation', event.target.value)}
                  className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor={`bestFor-${product.productId}`} className="mb-1 block text-xs font-medium text-body">
                  Best For
                </label>
                <input
                  id={`bestFor-${product.productId}`}
                  type="text"
                  value={product.bestFor}
                  onChange={(event) => handleFieldChange(index, 'bestFor', event.target.value)}
                  className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor={`mainStrength-${product.productId}`} className="mb-1 block text-xs font-medium text-body">
                  Main Strength
                </label>
                <input
                  id={`mainStrength-${product.productId}`}
                  type="text"
                  value={product.mainStrength}
                  onChange={(event) => handleFieldChange(index, 'mainStrength', event.target.value)}
                  className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor={`mainWeakness-${product.productId}`} className="mb-1 block text-xs font-medium text-body">
                  Main Weakness
                </label>
                <input
                  id={`mainWeakness-${product.productId}`}
                  type="text"
                  value={product.mainWeakness}
                  onChange={(event) => handleFieldChange(index, 'mainWeakness', event.target.value)}
                  className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor={`pros-${product.productId}`} className="mb-1 block text-xs font-medium text-body">
                  Pros
                </label>
                <textarea
                  id={`pros-${product.productId}`}
                  rows={2}
                  value={product.pros}
                  onChange={(event) => handleFieldChange(index, 'pros', event.target.value)}
                  className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor={`cons-${product.productId}`} className="mb-1 block text-xs font-medium text-body">
                  Cons
                </label>
                <textarea
                  id={`cons-${product.productId}`}
                  rows={2}
                  value={product.cons}
                  onChange={(event) => handleFieldChange(index, 'cons', event.target.value)}
                  className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            {fieldErrors[`product-${index}-prosCons`] && (
              <p className="mt-2 text-sm text-danger">{fieldErrors[`product-${index}-prosCons`]}</p>
            )}
```

- [ ] **Step 4: Run the ComparisonForm tests**

Run: `npm test -- --run ComparisonForm` (from `frontend/`)
Expected: PASS, all 11 tests in `ComparisonForm.test.jsx`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/comparison-form/ProductsTab.jsx
git commit -m "style(admin): retokenize ProductsTab"
```

---

### Task 5: Retokenize SpecTableTab

**Files:**
- Modify: `frontend/src/components/comparison-form/SpecTableTab.jsx`

**Interfaces:**
- Consumes: `Button` component (`variant="primary"`, `size="sm"`, for "Add Row").

No dedicated test file — exercised through `ComparisonForm.test.jsx`.

- [ ] **Step 1: Add the `Button` import**

```jsx
import Button from '../Button.jsx';
```

- [ ] **Step 2: Retokenize the "add products first" placeholder and "Add Row" button**

Change:

```jsx
  if (products.length === 0) {
    return <p className="text-sm text-slate-500">Add products in the Products tab before building the spec table.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAddRow}
        className="mb-4 flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        <Plus size={16} />
        Add Row
      </button>
```

to:

```jsx
  if (products.length === 0) {
    return <p className="text-sm text-muted">Add products in the Products tab before building the spec table.</p>;
  }

  return (
    <div>
      <Button type="button" variant="primary" size="sm" onClick={handleAddRow} className="mb-4">
        <Plus size={16} />
        Add Row
      </Button>
```

- [ ] **Step 3: Retokenize the row card, Group Label, Row Label, and remove button**

Change:

```jsx
          <div key={rowIndex} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`groupLabel-${rowIndex}`} className="mb-1 block text-xs font-medium text-slate-700">
                    Group Label
                  </label>
                  <input
                    id={`groupLabel-${rowIndex}`}
                    type="text"
                    value={row.groupLabel}
                    onChange={(event) => handleRowFieldChange(rowIndex, 'groupLabel', event.target.value)}
                    placeholder="e.g. Performance"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor={`rowLabel-${rowIndex}`} className="mb-1 block text-xs font-medium text-slate-700">
                    Row Label
                  </label>
                  <input
                    id={`rowLabel-${rowIndex}`}
                    type="text"
                    value={row.rowLabel}
                    onChange={(event) => handleRowFieldChange(rowIndex, 'rowLabel', event.target.value)}
                    placeholder="e.g. Battery Life"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveRow(rowIndex)}
                aria-label={`Remove row ${row.rowLabel || rowIndex + 1}`}
                className="mt-6 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
```

to:

```jsx
          <div key={rowIndex} className="rounded-btn border border-border p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`groupLabel-${rowIndex}`} className="mb-1 block text-xs font-medium text-body">
                    Group Label
                  </label>
                  <input
                    id={`groupLabel-${rowIndex}`}
                    type="text"
                    value={row.groupLabel}
                    onChange={(event) => handleRowFieldChange(rowIndex, 'groupLabel', event.target.value)}
                    placeholder="e.g. Performance"
                    className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor={`rowLabel-${rowIndex}`} className="mb-1 block text-xs font-medium text-body">
                    Row Label
                  </label>
                  <input
                    id={`rowLabel-${rowIndex}`}
                    type="text"
                    value={row.rowLabel}
                    onChange={(event) => handleRowFieldChange(rowIndex, 'rowLabel', event.target.value)}
                    placeholder="e.g. Battery Life"
                    className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveRow(rowIndex)}
                aria-label={`Remove row ${row.rowLabel || rowIndex + 1}`}
                className="mt-6 rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
              >
                <Trash2 size={16} />
              </button>
            </div>
```

- [ ] **Step 4: Retokenize the per-product value input and tier select**

Change:

```jsx
                    <div className="flex-1">
                      <label
                        htmlFor={`value-${rowIndex}-${product.productId}`}
                        className="mb-1 block text-xs font-medium text-slate-700"
                      >
                        {product.name}
                      </label>
                      <input
                        id={`value-${rowIndex}-${product.productId}`}
                        type="text"
                        value={value.value}
                        onChange={(event) =>
                          handleValueChange(rowIndex, product.productId, 'value', event.target.value)
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <select
                      aria-label={`${product.name} tier`}
                      value={value.tier}
                      onChange={(event) => handleValueChange(rowIndex, product.productId, 'tier', event.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
```

to:

```jsx
                    <div className="flex-1">
                      <label
                        htmlFor={`value-${rowIndex}-${product.productId}`}
                        className="mb-1 block text-xs font-medium text-body"
                      >
                        {product.name}
                      </label>
                      <input
                        id={`value-${rowIndex}-${product.productId}`}
                        type="text"
                        value={value.value}
                        onChange={(event) =>
                          handleValueChange(rowIndex, product.productId, 'value', event.target.value)
                        }
                        className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <select
                      aria-label={`${product.name} tier`}
                      value={value.tier}
                      onChange={(event) => handleValueChange(rowIndex, product.productId, 'tier', event.target.value)}
                      className="rounded-btn border border-border bg-white px-2 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    >
```

- [ ] **Step 5: Run the ComparisonForm tests**

Run: `npm test -- --run ComparisonForm` (from `frontend/`)
Expected: PASS, all 11 tests in `ComparisonForm.test.jsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/comparison-form/SpecTableTab.jsx
git commit -m "style(admin): retokenize SpecTableTab"
```

---

### Task 6: Retokenize SectionsTab and FaqTab

**Files:**
- Modify: `frontend/src/components/comparison-form/SectionsTab.jsx`
- Modify: `frontend/src/components/comparison-form/FaqTab.jsx`

**Interfaces:**
- Consumes: `Button` component (`variant="primary"`, `size="sm"`, for "Add Section"/"Add FAQ").

No dedicated test files for either — exercised through `ComparisonForm.test.jsx`. These two files are structurally identical repeated-item editors, so this task applies the same edit pattern to both.

- [ ] **Step 1: Add the `Button` import to `SectionsTab.jsx`**

```jsx
import Button from '../Button.jsx';
```

- [ ] **Step 2: Retokenize the "Add Section" button in `SectionsTab.jsx`**

Change:

```jsx
      <button
        type="button"
        onClick={handleAdd}
        className="mb-4 flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        <Plus size={16} />
        Add Section
      </button>
```

to:

```jsx
      <Button type="button" variant="primary" size="sm" onClick={handleAdd} className="mb-4">
        <Plus size={16} />
        Add Section
      </Button>
```

- [ ] **Step 3: Retokenize the section card, reorder/remove buttons, and fields in `SectionsTab.jsx`**

Change:

```jsx
          <div key={index} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Section {index + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move section ${index + 1} up`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === sections.length - 1}
                  aria-label={`Move section ${index + 1} down`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove section ${index + 1}`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor={`heading-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Heading
              </label>
              <input
                id={`heading-${index}`}
                type="text"
                value={section.heading}
                onChange={(event) => handleFieldChange(index, 'heading', event.target.value)}
                placeholder="e.g. Buying Tips"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={`body-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Body
              </label>
              <textarea
                id={`body-${index}`}
                rows={4}
                value={section.body}
                onChange={(event) => handleFieldChange(index, 'body', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
```

to:

```jsx
          <div key={index} className="rounded-btn border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-heading">Section {index + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move section ${index + 1} up`}
                  className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === sections.length - 1}
                  aria-label={`Move section ${index + 1} down`}
                  className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove section ${index + 1}`}
                  className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor={`heading-${index}`} className="mb-1 block text-xs font-medium text-body">
                Heading
              </label>
              <input
                id={`heading-${index}`}
                type="text"
                value={section.heading}
                onChange={(event) => handleFieldChange(index, 'heading', event.target.value)}
                placeholder="e.g. Buying Tips"
                className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor={`body-${index}`} className="mb-1 block text-xs font-medium text-body">
                Body
              </label>
              <textarea
                id={`body-${index}`}
                rows={4}
                value={section.body}
                onChange={(event) => handleFieldChange(index, 'body', event.target.value)}
                className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
```

- [ ] **Step 4: Add the `Button` import to `FaqTab.jsx`**

```jsx
import Button from '../Button.jsx';
```

- [ ] **Step 5: Retokenize the "Add FAQ" button in `FaqTab.jsx`**

Change:

```jsx
      <button
        type="button"
        onClick={handleAdd}
        className="mb-4 flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        <Plus size={16} />
        Add FAQ
      </button>
```

to:

```jsx
      <Button type="button" variant="primary" size="sm" onClick={handleAdd} className="mb-4">
        <Plus size={16} />
        Add FAQ
      </Button>
```

- [ ] **Step 6: Retokenize the FAQ card, reorder/remove buttons, and fields in `FaqTab.jsx`**

Change:

```jsx
          <div key={index} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">FAQ {index + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move FAQ ${index + 1} up`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === faqs.length - 1}
                  aria-label={`Move FAQ ${index + 1} down`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove FAQ ${index + 1}`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor={`question-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Question
              </label>
              <input
                id={`question-${index}`}
                type="text"
                value={faq.question}
                onChange={(event) => handleFieldChange(index, 'question', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={`answer-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Answer
              </label>
              <textarea
                id={`answer-${index}`}
                rows={3}
                value={faq.answer}
                onChange={(event) => handleFieldChange(index, 'answer', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
```

to:

```jsx
          <div key={index} className="rounded-btn border border-border p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-heading">FAQ {index + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move FAQ ${index + 1} up`}
                  className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === faqs.length - 1}
                  aria-label={`Move FAQ ${index + 1} down`}
                  className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove FAQ ${index + 1}`}
                  className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor={`question-${index}`} className="mb-1 block text-xs font-medium text-body">
                Question
              </label>
              <input
                id={`question-${index}`}
                type="text"
                value={faq.question}
                onChange={(event) => handleFieldChange(index, 'question', event.target.value)}
                className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label htmlFor={`answer-${index}`} className="mb-1 block text-xs font-medium text-body">
                Answer
              </label>
              <textarea
                id={`answer-${index}`}
                rows={3}
                value={faq.answer}
                onChange={(event) => handleFieldChange(index, 'answer', event.target.value)}
                className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
```

- [ ] **Step 7: Run the ComparisonForm tests**

Run: `npm test -- --run ComparisonForm` (from `frontend/`)
Expected: PASS, all 11 tests in `ComparisonForm.test.jsx`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/comparison-form/SectionsTab.jsx frontend/src/components/comparison-form/FaqTab.jsx
git commit -m "style(admin): retokenize SectionsTab and FaqTab"
```

---

### Task 7: Full-suite verification and visual check

**Files:** none (verification only)

**Interfaces:** none — this task consumes the finished output of Tasks 1–6 and produces nothing for later tasks.

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run` (from `frontend/`)
Expected: PASS, 314/314 (same count as the Stage 8 baseline — no tests added or removed in this stage). If a single unrelated failure appears in the ComparisonDetailPage/CompareBar area, this is a known test-order-dependent flake seen in prior stages (not caused by this stage's changes) — re-run the suite once and confirm it passes clean before proceeding.

- [ ] **Step 2: Visual check with chrome-devtools MCP**

With the frontend dev server running (`npm run dev` from `frontend/`, if not already up), use the chrome-devtools MCP tools to:
- Navigate to `/admin/comparisons` and take a screenshot — confirm the blue "Add Comparison" button, page heading, and Published/Draft badges render correctly.
- Click an existing row's Edit action (or "Add Comparison") and screenshot `ComparisonFormPage` — confirm the page heading and the tab switcher's active/inactive states (blue underline + blue text on the active tab, gray on inactive ones).
- Click through each of the 6 tabs (Basic Info, Products, Spec Table, Sections, FAQ, Related) and screenshot each — confirm field borders/focus states, the "Add Row"/"Add Section"/"Add FAQ" buttons render as blue `Button` components, reorder/remove icon buttons are styled correctly, and the Spec Table's tier `<select>` renders correctly.
- On the Products tab, type a search term and confirm the retokenized results dropdown and selected-product cards render correctly.
- Confirm the Cancel/Save buttons at the bottom of the form render correctly.

If anything looks visually wrong (unexpected colors, broken layout), fix it before proceeding — this is the final check before the stage is considered done.

- [ ] **Step 3: No commit needed**

This task is verification-only; nothing to commit unless Step 2 uncovers a fix, in which case commit that fix with an appropriate message before finishing.
