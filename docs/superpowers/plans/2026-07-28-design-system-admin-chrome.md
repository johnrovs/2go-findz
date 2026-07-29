# Design System Stage 6: Admin Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the shared admin chrome and primitives (`AdminLayout`, `AdminSidebar`, `AdminTopbar`, `DataTable`, `Modal`, `ConfirmDialog`, `ImageUploader`) with the design tokens from Stages 1–5, plus add a new `danger` `Button` variant for destructive confirmations.

**Architecture:** One `Button` extension task, then five independent styling-only tasks against existing components — same structure, same props, same behavior, only `className` values (and, for `ConfirmDialog`, the underlying element swapping from raw `<button>` to `<Button>`) change.

**Tech Stack:** React 18, Tailwind CSS 3.4 (Stage 1–5 tokens), Vitest + React Testing Library.

## Global Constraints

- No changes to any of the 8 admin pages' bespoke markup, the 4 form components, or `EntityPicker`/`ProductPicker` — Stage 7.
- No animation, sorting-logic, focus-trap-logic, or upload/validation-logic changes — presentation only.
- The admin sidebar switches from its current dark background to light, matching the rest of the site (decided during brainstorming — not staying as a deliberate dark-chrome element).

---

### Task 1: Add a `danger` variant to Button

**Files:**
- Modify: `frontend/src/components/Button.jsx`
- Modify: `frontend/src/components/Button.test.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Button` now accepts `variant="danger"` in addition to `primary`/`secondary`/`amazon`. Task 4 (`ConfirmDialog`) uses this.

- [ ] **Step 1: Write the failing test**

In `frontend/src/components/Button.test.jsx`, add this test after the existing `'applies amazon variant classes'` test:

```jsx
  it('applies danger variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-danger', 'text-white');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- --run Button`
Expected: FAIL — the rendered button has no `bg-danger` class (`VARIANT_CLASSES.danger` is `undefined`, so the class string contains the literal text `undefined`).

- [ ] **Step 3: Add the `danger` variant**

In `frontend/src/components/Button.jsx`, replace:

```jsx
const VARIANT_CLASSES = {
  primary: 'bg-primary text-white shadow-card hover:bg-primary-hover',
  secondary: 'bg-white text-primary border border-primary hover:bg-primary/5',
  amazon: 'bg-amazon text-[#111827] shadow-card hover:bg-amazon-hover',
};
```

with:

```jsx
const VARIANT_CLASSES = {
  primary: 'bg-primary text-white shadow-card hover:bg-primary-hover',
  secondary: 'bg-white text-primary border border-primary hover:bg-primary/5',
  amazon: 'bg-amazon text-[#111827] shadow-card hover:bg-amazon-hover',
  danger: 'bg-danger text-white shadow-card hover:bg-red-700',
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run Button`
Expected: PASS, 8 tests (7 existing + 1 new).

- [ ] **Step 5: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/Button.jsx frontend/src/components/Button.test.jsx
git commit -m "feat(design-system): add danger variant to Button"
```

---

### Task 2: Restyle AdminLayout, AdminSidebar, AdminTopbar

**Files:**
- Modify: `frontend/src/layouts/AdminLayout.jsx`
- Modify: `frontend/src/components/AdminSidebar.jsx`
- Modify: `frontend/src/components/AdminTopbar.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new.

`AdminLayout.test.jsx` is the only test covering any of these three files, and its assertions are all text/role-based (confirmed by inspection) — no test changes needed. `AdminSidebar.jsx` and `AdminTopbar.jsx` have no dedicated test files.

- [ ] **Step 1: Update `AdminLayout.jsx`**

Replace:

```jsx
    <div className="flex min-h-screen bg-slate-50">
```

with:

```jsx
    <div className="flex min-h-screen bg-surface-secondary">
```

- [ ] **Step 2: Update `AdminSidebar.jsx`**

Replace:

```jsx
    <nav aria-label="Main navigation" className="flex h-full flex-col bg-slate-900 px-3 py-6 text-slate-200">
```

with:

```jsx
    <nav aria-label="Main navigation" className="flex h-full flex-col border-r border-slate-200 bg-white px-3 py-6">
```

Replace:

```jsx
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
                }`
              }
```

with:

```jsx
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-body hover:bg-slate-100'
                }`
              }
```

Replace:

```jsx
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
```

with:

```jsx
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-body hover:bg-slate-100"
```

- [ ] **Step 3: Update `AdminTopbar.jsx`**

Replace:

```jsx
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
```

with:

```jsx
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-navbar md:px-6">
```

Replace:

```jsx
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          {breadcrumbs.join(' / ')}
        </nav>
      </div>
      <span className="text-sm font-medium text-slate-700">{user?.fullName}</span>
```

with:

```jsx
        <nav aria-label="Breadcrumb" className="text-small text-muted">
          {breadcrumbs.join(' / ')}
        </nav>
      </div>
      <span className="text-small font-medium text-heading">{user?.fullName}</span>
```

- [ ] **Step 4: Run the AdminLayout test to verify it still passes**

Run: `npm test -- --run AdminLayout`
Expected: PASS, unchanged (4 tests).

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 1.

- [ ] **Step 6: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/layouts/AdminLayout.jsx frontend/src/components/AdminSidebar.jsx frontend/src/components/AdminTopbar.jsx
git commit -m "feat(design-system): restyle AdminLayout, AdminSidebar, and AdminTopbar with design tokens"
```

---

### Task 3: Restyle DataTable

**Files:**
- Modify: `frontend/src/components/DataTable.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new.

`DataTable.test.jsx` contains no class-name assertions — confirmed by inspection (all queries are text/role/attribute-based). No test changes needed.

- [ ] **Step 1: Update `DataTable.jsx`**

Replace:

```jsx
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => {
              const isSorted = sortKey === column.key;
              const ariaSort = isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortable ? ariaSort : undefined}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column.key)}
                      className="flex items-center gap-1 hover:text-slate-700"
                    >
                      {column.label}
                      {isSorted &&
                        (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-sm text-slate-700">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
```

with:

```jsx
    <div className="overflow-x-auto rounded-card border border-slate-200 bg-white shadow-card">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-surface-secondary">
          <tr>
            {columns.map((column) => {
              const isSorted = sortKey === column.key;
              const ariaSort = isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none';
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={column.sortable ? ariaSort : undefined}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column.key)}
                      className="flex items-center gap-1 hover:text-primary"
                    >
                      {column.label}
                      {isSorted &&
                        (sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 text-sm text-body">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
```

- [ ] **Step 2: Run the DataTable test to verify it still passes**

Run: `npm test -- --run DataTable`
Expected: PASS, unchanged (6 tests).

- [ ] **Step 3: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 2.

- [ ] **Step 4: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/DataTable.jsx
git commit -m "feat(design-system): restyle DataTable with design tokens"
```

---

### Task 4: Restyle Modal and ConfirmDialog

**Files:**
- Modify: `frontend/src/components/Modal.jsx`
- Modify: `frontend/src/components/ConfirmDialog.jsx`
- Modify: `frontend/src/components/ConfirmDialog.test.jsx`

**Interfaces:**
- Consumes: `Button` (with the `danger` variant) from Task 1.
- Produces: nothing new.

`Modal.test.jsx` contains no class-name assertions — no changes needed. `ConfirmDialog.test.jsx` has one test that asserts the old inline destructive class directly (`toHaveClass('bg-red-600')`) — this needs updating to the new `danger` Button variant's class (`bg-danger`).

- [ ] **Step 1: Update the failing ConfirmDialog test assertion**

In `frontend/src/components/ConfirmDialog.test.jsx`, replace:

```jsx
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-red-600');
```

with:

```jsx
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-danger');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- --run ConfirmDialog`
Expected: FAIL — the confirm button still has `bg-red-600`, not `bg-danger`, until Step 4 below.

- [ ] **Step 3: Update `Modal.jsx`**

Replace:

```jsx
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 id="modal-title" className="mb-4 shrink-0 text-lg font-semibold text-slate-900">
```

with:

```jsx
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-card bg-white p-6 shadow-dropdown"
      >
        <h2 id="modal-title" className="mb-4 shrink-0 text-card-title text-heading">
```

- [ ] **Step 4: Update `ConfirmDialog.jsx`**

Full file:

```jsx
import Modal from './Modal.jsx';
import Button from './Button.jsx';

function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} role="alertdialog">
      <p className="text-body">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant={isDestructive ? 'danger' : 'primary'} size="sm" onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Please wait...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
```

Note: `Cancel` stays first in the DOM (as it was before), which `Modal`'s focus-trap relies on to focus it by default — `ConfirmDialog.test.jsx`'s `'focuses the cancel button by default'` test depends on this order and is otherwise unaffected by this task.

- [ ] **Step 5: Run the ConfirmDialog test to verify it passes**

Run: `npm test -- --run ConfirmDialog`
Expected: PASS, all 6 tests.

- [ ] **Step 6: Run the Modal test to verify it still passes**

Run: `npm test -- --run "src/components/Modal.test.jsx"`
Expected: PASS, unchanged (6 tests).

- [ ] **Step 7: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 3.

- [ ] **Step 8: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/Modal.jsx frontend/src/components/ConfirmDialog.jsx frontend/src/components/ConfirmDialog.test.jsx
git commit -m "feat(design-system): restyle Modal and ConfirmDialog, using the new danger Button variant"
```

---

### Task 5: Restyle ImageUploader

**Files:**
- Modify: `frontend/src/components/ImageUploader.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this is the last restyle task.

`ImageUploader.test.jsx` contains no class-name assertions — confirmed by inspection (queries by alt text, label text, and error message text). No test changes needed.

- [ ] **Step 1: Update `ImageUploader.jsx`**

Replace:

```jsx
      <span className="mb-1 block text-sm font-medium text-slate-700">Product Image</span>
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {previewUrl ? (
            <img src={previewUrl} alt="Product preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-slate-300" />
          )}
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Upload size={16} />
            {isUploading ? 'Uploading...' : 'Upload Image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
```

with:

```jsx
      <span className="mb-1 block text-small font-medium text-body">Product Image</span>
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-card border border-border bg-surface-secondary">
          {previewUrl ? (
            <img src={previewUrl} alt="Product preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-slate-300" />
          )}
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-border px-4 py-2 text-sm font-medium text-body hover:bg-slate-50">
            <Upload size={16} />
            {isUploading ? 'Uploading...' : 'Upload Image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
```

- [ ] **Step 2: Run the ImageUploader test to verify it still passes**

Run: `npm test -- --run ImageUploader`
Expected: PASS, unchanged (6 tests).

- [ ] **Step 3: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 4.

- [ ] **Step 4: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/ImageUploader.jsx
git commit -m "feat(design-system): restyle ImageUploader with design tokens"
```

---

### Task 6: Final verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: nothing for later tasks — this is the stage's closing gate. Stage 7 (page-specific admin content) starts from here.

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

Log in as admin, restart the frontend dev server if it was already running, and confirm:

1. The sidebar is now light (white background, border), with the active nav item shown as a light-blue-tinted row and blue text.
2. The topbar has a subtle bottom shadow, breadcrumb and profile name read clearly.
3. Any admin list page (e.g. Products) shows the DataTable with a light gray header row, rounded corners, and a card shadow.
4. Trigger a delete confirmation (e.g. delete a product) — confirm the dialog has rounded corners and a stronger shadow, the Cancel button is a secondary-style button, and the destructive Confirm button is red (`danger` variant) and receives focus by default.
5. Open a product form and confirm the image uploader's preview box and "Upload Image" button reflect the new tokens.

- [ ] **Step 5: Report results**

If all checks pass, this stage is complete — no further commit needed (Tasks 1–5 already committed their own work). If the smoke check surfaces a real bug, fix it, re-run Steps 1–3, and commit the fix with an appropriate message before considering the stage done.

---

This closes out Stage 6 of the redesign (Admin Chrome). Stage 7 (page-specific admin content) applies the design system to the remaining bespoke markup across the 8 admin pages, the 4 form components, and `EntityPicker`/`ProductPicker`.
