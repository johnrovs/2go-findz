# Design System Stage 8: Pickers & Buying Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retokenize `EntityPicker` (and, by inheritance, `ProductPicker`/`ComparisonPicker`) and the Buying Guides admin pages/form onto the design tokens established in Stages 1–7, with zero behavior change.

**Architecture:** Pure presentation changes — swap ad-hoc Tailwind classes (`slate-*`, `indigo-*`, `red-*`, `emerald-*`, `rounded-md`) for the project's design tokens, reusing the exact same mappings validated in Stage 7 (`primary`, `danger`, `success`, `muted`, `body`, `heading`, `surface-secondary`, `border`, `rounded-btn`, `text-page-heading`, `text-small`, and the `Button` component including its Stage-7-added `to` prop).

**Tech Stack:** React, react-router-dom v6, Tailwind CSS, Vitest, React Testing Library.

## Global Constraints

- Every text/textarea form input uses `border-border`, `rounded-btn`, `focus:border-primary`, `focus:outline-none`, `focus:ring-2`, `focus:ring-primary`.
- Every form label uses `text-small font-medium text-body`.
- Every field-level error uses `text-danger`; every form-level error banner uses `bg-danger/10 text-danger`.
- Every page `<h1>` uses `text-page-heading text-heading`.
- Icon-only row/list actions are NOT converted to the `Button` component — retokenized in place: `text-muted`, `hover:bg-surface-secondary`, plus `hover:text-primary` for "edit"/"move" actions or `hover:text-danger` for "delete"/"remove" actions.
- No change to any validation logic, field set, submit payload shape, search/debounce/reorder logic, or existing test assertions (all existing tests in scope query by role/label/text, never class name — verified during planning).

---

### Task 1: Retokenize EntityPicker

**Files:**
- Modify: `frontend/src/components/EntityPicker.jsx`

**Interfaces:**
- Consumes: nothing new. No prop or behavior changes.
- Produces: retokenized styling inherited for free by `ProductPicker.jsx` and `ComparisonPicker.jsx` (both unstyled wrappers around this component) — no changes needed to either wrapper file.

No test changes — `EntityPicker.test.jsx` queries by role/label/text only (verified during planning). This is a direct-edit-and-verify task, not TDD, since no new behavior is being driven.

- [ ] **Step 1: Retokenize the label and search input**

Change:

```jsx
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {isSearching && <p className="mt-1 text-sm text-slate-400">Searching...</p>}
```

to:

```jsx
      <label htmlFor={inputId} className="mb-1 block text-small font-medium text-body">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {isSearching && <p className="mt-1 text-sm text-muted">Searching...</p>}
```

- [ ] **Step 2: Retokenize the results dropdown**

Change:

```jsx
        <ul className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleAdd(item)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {getItemLabel(item)}
              </button>
            </li>
          ))}
        </ul>
```

to:

```jsx
        <ul className="mt-1 rounded-btn border border-border bg-white shadow-card">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleAdd(item)}
                className="block w-full px-3 py-2 text-left text-sm text-body hover:bg-surface-secondary"
              >
                {getItemLabel(item)}
              </button>
            </li>
          ))}
        </ul>
```

- [ ] **Step 3: Retokenize the selected-items list and its icon buttons**

Change:

```jsx
      <ul className="mt-3 space-y-2">
        {selectedItems.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
          >
            <span className="text-sm text-slate-700">{getItemLabel(item)}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                aria-label={`Move ${getItemLabel(item)} up`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === selectedItems.length - 1}
                aria-label={`Move ${getItemLabel(item)} down`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={`Remove ${getItemLabel(item)}`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
```

to:

```jsx
      <ul className="mt-3 space-y-2">
        {selectedItems.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-btn border border-border px-3 py-2"
          >
            <span className="text-sm text-body">{getItemLabel(item)}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                aria-label={`Move ${getItemLabel(item)} up`}
                className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === selectedItems.length - 1}
                aria-label={`Move ${getItemLabel(item)} down`}
                className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={`Remove ${getItemLabel(item)}`}
                className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
              >
                <X size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
```

- [ ] **Step 4: Run the EntityPicker tests**

Run: `npm test -- --run EntityPicker` (from `frontend/`)
Expected: PASS, all 5 tests in `EntityPicker.test.jsx`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/EntityPicker.jsx
git commit -m "style(admin): retokenize EntityPicker"
```

---

### Task 2: Retokenize BuyingGuidesPage

**Files:**
- Modify: `frontend/src/pages/admin/BuyingGuidesPage.jsx`

**Interfaces:**
- Consumes: `Button`'s `to` prop (`import Button from '../../components/Button.jsx'`), added in Stage 7.

No test changes — verified during planning that `BuyingGuidesPage.test.jsx` queries by role/label/text only, and react-router's `<Link to="/admin/buying-guides/new">` renders the same `<a href>` whether used directly or via `Button`.

- [ ] **Step 1: Add the `Button` import**

In `frontend/src/pages/admin/BuyingGuidesPage.jsx`, add alongside the existing imports:

```jsx
import Button from '../../components/Button.jsx';
```

- [ ] **Step 2: Replace the page heading and "Add Guide" link**

Change:

```jsx
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Buying Guides</h1>
        <Link
          to="/admin/buying-guides/new"
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Guide
        </Link>
      </div>
```

to:

```jsx
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-page-heading text-heading">Buying Guides</h1>
        <Button to="/admin/buying-guides/new" size="sm">
          <Plus size={16} />
          Add Guide
        </Button>
      </div>
```

`Link` from `react-router-dom` is still used below for the row-level Edit link — keep its import.

- [ ] **Step 3: Retokenize the row-level Edit and Delete icon buttons**

Change:

```jsx
          <Link
            to={`/admin/buying-guides/${row.id}`}
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
            to={`/admin/buying-guides/${row.id}`}
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
            row.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {row.active ? 'Published' : 'Draft'}
        </span>
```

to:

```jsx
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.active ? 'bg-success/10 text-success' : 'bg-surface-secondary text-muted'
          }`}
        >
          {row.active ? 'Published' : 'Draft'}
        </span>
```

- [ ] **Step 5: Run the BuyingGuidesPage tests**

Run: `npm test -- --run BuyingGuidesPage` (from `frontend/`)
Expected: PASS, all 3 tests in `BuyingGuidesPage.test.jsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/BuyingGuidesPage.jsx
git commit -m "style(admin): retokenize BuyingGuidesPage"
```

---

### Task 3: Retokenize BuyingGuideForm and BuyingGuideFormPage

**Files:**
- Modify: `frontend/src/components/BuyingGuideForm.jsx`
- Modify: `frontend/src/pages/admin/BuyingGuideFormPage.jsx`

**Interfaces:**
- Consumes: `Button` component (`variant="secondary"` for Cancel, default `variant="primary"` with `type="submit"` for Submit). The embedded `<ProductPicker>` needs no direct edits — it already renders with the Task 1 styling.

No test changes — verified during planning that `BuyingGuideForm.test.jsx` and `BuyingGuideFormPage.test.jsx` query by role/label/text only, and the submit/cancel button role names (`'Add Guide'`, `'Save Changes'`) are preserved as `Button` children.

- [ ] **Step 1: Add the `Button` import to `BuyingGuideForm.jsx`**

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

- [ ] **Step 3: Retokenize the Title field**

Change:

```jsx
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
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
          value={title}
          onChange={(event) => setTitle(event.target.value)}
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

- [ ] **Step 4: Retokenize the Excerpt field**

Change:

```jsx
        <label htmlFor="excerpt" className="mb-1 block text-sm font-medium text-slate-700">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          rows={2}
          maxLength={500}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.excerpt)}
          aria-describedby={fieldErrors.excerpt ? 'excerpt-error' : undefined}
        />
        {fieldErrors.excerpt && (
          <p id="excerpt-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.excerpt}
          </p>
        )}
```

to:

```jsx
        <label htmlFor="excerpt" className="mb-1 block text-small font-medium text-body">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          rows={2}
          maxLength={500}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.excerpt)}
          aria-describedby={fieldErrors.excerpt ? 'excerpt-error' : undefined}
        />
        {fieldErrors.excerpt && (
          <p id="excerpt-error" className="mt-1 text-sm text-danger">
            {fieldErrors.excerpt}
          </p>
        )}
```

- [ ] **Step 5: Retokenize the Content field**

Change:

```jsx
        <label htmlFor="content" className="mb-1 block text-sm font-medium text-slate-700">
          Content
        </label>
        <textarea
          id="content"
          rows={8}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.content)}
          aria-describedby={fieldErrors.content ? 'content-error' : undefined}
        />
        {fieldErrors.content && (
          <p id="content-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.content}
          </p>
        )}
```

to:

```jsx
        <label htmlFor="content" className="mb-1 block text-small font-medium text-body">
          Content
        </label>
        <textarea
          id="content"
          rows={8}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.content)}
          aria-describedby={fieldErrors.content ? 'content-error' : undefined}
        />
        {fieldErrors.content && (
          <p id="content-error" className="mt-1 text-sm text-danger">
            {fieldErrors.content}
          </p>
        )}
```

- [ ] **Step 6: Retokenize the Active checkbox label**

Change:

```jsx
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
```

to:

```jsx
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
```

- [ ] **Step 7: Replace the Cancel/Submit buttons with `Button`**

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
          {isSubmitting ? 'Saving...' : guide ? 'Save Changes' : 'Add Guide'}
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
          {isSubmitting ? 'Saving...' : guide ? 'Save Changes' : 'Add Guide'}
        </Button>
      </div>
```

- [ ] **Step 8: Run the BuyingGuideForm tests**

Run: `npm test -- --run BuyingGuideForm` (from `frontend/`)
Expected: PASS, all 4 tests in `BuyingGuideForm.test.jsx`.

- [ ] **Step 9: Retokenize `BuyingGuideFormPage.jsx`'s heading**

Change:

```jsx
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {isEditMode ? 'Edit Buying Guide' : 'Add Buying Guide'}
      </h1>
```

to:

```jsx
      <h1 className="mb-6 text-page-heading text-heading">
        {isEditMode ? 'Edit Buying Guide' : 'Add Buying Guide'}
      </h1>
```

- [ ] **Step 10: Run the BuyingGuideFormPage tests**

Run: `npm test -- --run BuyingGuideFormPage` (from `frontend/`)
Expected: PASS, all 3 tests in `BuyingGuideFormPage.test.jsx`.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/components/BuyingGuideForm.jsx frontend/src/pages/admin/BuyingGuideFormPage.jsx
git commit -m "style(admin): retokenize BuyingGuideForm and BuyingGuideFormPage"
```

---

### Task 4: Full-suite verification and visual check

**Files:** none (verification only)

**Interfaces:** none — this task consumes the finished output of Tasks 1–3 and produces nothing for later tasks.

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run` (from `frontend/`)
Expected: PASS, 314/314 (same count as the Stage 7 baseline — no tests added or removed in this stage). If a single unrelated failure appears in the ComparisonDetailPage/CompareBar area, this is a known test-order-dependent flake seen in prior stages (not caused by this stage's changes) — re-run the suite once and confirm it passes clean before proceeding.

- [ ] **Step 2: Visual check with chrome-devtools MCP**

With the frontend dev server running (`npm run dev` from `frontend/`, if not already up), use the chrome-devtools MCP tools to:
- Navigate to `/admin/buying-guides` and take a screenshot — confirm the blue "Add Guide" button, page heading, and green Published / neutral Draft badges render correctly.
- Click an existing row's Edit action (or "Add Guide") and screenshot `BuyingGuideFormPage` — confirm form field borders, focus states, the embedded Product Picker's retokenized search box/results/selected-list, and the Cancel/Save buttons.
- Type a search term into the Product Picker's search box and confirm the retokenized results dropdown appears correctly styled; add a product and confirm the retokenized selected-item row with its up/down/remove icons renders correctly.

If anything looks visually wrong (unexpected colors, broken layout), fix it before proceeding — this is the final check before the stage is considered done.

- [ ] **Step 3: No commit needed**

This task is verification-only; nothing to commit unless Step 2 uncovers a fix, in which case commit that fix with an appropriate message before finishing.
