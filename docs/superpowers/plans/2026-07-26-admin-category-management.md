# Frontend Admin Stage 1: Category Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `CategoriesPage` placeholder with full CRUD for product categories, and establish three reusable admin primitives (`Modal`, `ConfirmDialog`, `DataTable`) that the upcoming Product Management sub-stage will reuse.

**Architecture:** `CategoriesPage` fetches the full category list once (re-fetched on sort change or after a mutation), filters it client-side by name as the user types, and renders it through a generic `DataTable`. Create/Edit uses `CategoryForm` inside a generic `Modal`; Delete uses `ConfirmDialog` (built on `Modal`). All network access goes through a new `adminCategoryService.js` built on the existing shared `api` Axios instance.

**Tech Stack:** Same as prior stages — React JS/JSX, Vite, Tailwind, React Router DOM, Axios, Lucide React, Vitest + React Testing Library. No new dependencies.

## Global Constraints

- Full design detail: `docs/superpowers/specs/2026-07-26-admin-category-management-design.md`. Master spec: `docs/PROJECT_SPEC.md` §"5. Product Category Management".
- Plain JS/JSX (no TypeScript), fixed folder structure (`components/`, `pages/admin/`, `services/`).
- All backend calls go through the existing shared `api` Axios instance (`frontend/src/services/api.js`) — never direct `axios`/`fetch`. Its response interceptor already normalizes errors to `{ message, fieldErrors }` via `normalizeError`.
- Toasts use the existing `useToast()` hook (`frontend/src/hooks/useToast.js`) → `{ showToast(message, type = 'success') }`; valid types are `'success'` and `'error'`.
- Color palette matches prior stages: primary actions `indigo-600`/`indigo-700`, destructive actions `red-600`/`red-700`, neutrals `slate`.
- No backend changes in this stage. The admin category list endpoint (`GET /api/admin/categories?sortBy=&direction=`) returns the full unpaginated list — category search is implemented client-side, filtering the already-fetched array.
- `CategoryRequest` body shape: `{ productCategoryName: string, commissionRate: number }`. `CategoryResponse` shape: `{ id, productCategoryName, commissionRate, createdAt, updatedAt }`.
- TDD throughout: write the failing test, confirm RED, implement, confirm GREEN, run the full suite, commit — every task.
- Accessible by default: labeled form inputs, `aria-invalid`/`aria-describedby` on validation errors, focus-trapped modals, `aria-sort` on sortable table headers, cancel is the default-focused action in any confirmation dialog.
- Never commit `.env`.

---

### Task 1: `Modal` — generic reusable dialog

**Files:**
- Create: `frontend/src/components/Modal.jsx`
- Test: `frontend/src/components/Modal.test.jsx`

**Interfaces:**
- Produces: `Modal({ isOpen, onClose, title, children, role = 'dialog' })` (default export). Renders `null` when `isOpen` is falsy. Traps focus inside the dialog while open (Tab/Shift+Tab wrap), focuses the first focusable descendant on open, restores focus to the previously focused element on close, and calls `onClose` on `Escape` or backdrop click. Every later task that needs a dialog (`ConfirmDialog` in Task 2, and `CategoriesPage`'s create/edit dialog in Task 6) wraps this component.

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Modal from './Modal.jsx';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders the title and children when open', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog', { name: 'Test Modal' })).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Modal isOpen onClose={onClose} title="Test Modal">
        <p>Content</p>
      </Modal>
    );
    await user.click(container.querySelector('[aria-hidden="true"]'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal isOpen onClose={onClose} title="Test Modal">
        <button>Focusable</button>
      </Modal>
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('focuses the first focusable element when opened', async () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Test Modal">
        <button>First</button>
        <button>Second</button>
      </Modal>
    );
    await waitFor(() => expect(screen.getByText('First')).toHaveFocus());
  });

  it('supports overriding the dialog role', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Test Modal" role="alertdialog">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByRole('alertdialog', { name: 'Test Modal' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- Modal.test.jsx`
Expected: FAIL — `Modal.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

function Modal({ isOpen, onClose, title, children, role = 'dialog' }) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const dialogNode = dialogRef.current;
    const firstFocusable = dialogNode.querySelector(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const elements = dialogNode.querySelectorAll(FOCUSABLE_SELECTOR);
      if (elements.length === 0) return;
      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role={role}
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-lg"
      >
        <h2 id="modal-title" className="mb-4 text-lg font-semibold text-slate-900">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

export default Modal;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- Modal.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Modal.jsx frontend/src/components/Modal.test.jsx
git commit -m "feat: add reusable Modal component with focus trapping"
```

---

### Task 2: `ConfirmDialog` — generic confirmation dialog

**Files:**
- Create: `frontend/src/components/ConfirmDialog.jsx`
- Test: `frontend/src/components/ConfirmDialog.test.jsx`

**Interfaces:**
- Consumes: `Modal` from Task 1, exact signature `Modal({ isOpen, onClose, title, children, role })`.
- Produces: `ConfirmDialog({ isOpen, title, message, confirmLabel = 'Confirm', isDestructive = false, isLoading = false, onConfirm, onCancel })` (default export). Used by `CategoriesPage` (Task 6) for delete confirmation.

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog.jsx';

describe('ConfirmDialog', () => {
  it('renders the title and message when open', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete Category"
        message="This cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('alertdialog', { name: 'Delete Category' })).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog
        isOpen
        title="Delete Category"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog isOpen title="Delete Category" message="msg" onConfirm={vi.fn()} onCancel={onCancel} />
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables both buttons while isLoading', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete Category"
        message="msg"
        confirmLabel="Delete"
        isLoading
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Please wait...' })).toBeDisabled();
  });

  it('styles the confirm button destructively when isDestructive is true', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete Category"
        message="msg"
        confirmLabel="Delete"
        isDestructive
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-red-600');
  });

  it('focuses the cancel button by default, not the destructive action', async () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete Category"
        message="msg"
        confirmLabel="Delete"
        isDestructive
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ConfirmDialog.test.jsx`
Expected: FAIL — `ConfirmDialog.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import Modal from './Modal.jsx';

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
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={`rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isLoading ? 'Please wait...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
```

Note: the "cancel is default-focused" behavior comes for free from `Modal`'s focus trap, since the Cancel button appears before the Confirm button in DOM order — no extra `autoFocus` prop needed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- ConfirmDialog.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ConfirmDialog.jsx frontend/src/components/ConfirmDialog.test.jsx
git commit -m "feat: add reusable ConfirmDialog component"
```

---

### Task 3: `DataTable` — generic sortable table

**Files:**
- Create: `frontend/src/components/DataTable.jsx`
- Test: `frontend/src/components/DataTable.test.jsx`

**Interfaces:**
- Consumes: `LoadingSpinner` (existing, `frontend/src/components/LoadingSpinner.jsx`, no props needed beyond its own default `label`).
- Produces: `DataTable({ columns, rows, sortKey, sortDirection, onSortChange, isLoading, emptyState })` (default export). `columns: Array<{ key: string, label: string, sortable?: boolean, render?: (row) => ReactNode }>`. Rows are keyed by `row.id`. Used by `CategoriesPage` (Task 6).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DataTable from './DataTable.jsx';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'rate', label: 'Rate', sortable: true, render: (row) => `${row.rate}%` },
  { key: 'actions', label: 'Actions', render: () => <button>Edit</button> },
];

const rows = [
  { id: 1, name: 'Electronics', rate: 4 },
  { id: 2, name: 'Home', rate: 6 },
];

describe('DataTable', () => {
  it('renders column headers and row data', () => {
    render(<DataTable columns={columns} rows={rows} onSortChange={vi.fn()} emptyState={<p>Empty</p>} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('4%')).toBeInTheDocument();
  });

  it('shows the loading spinner when isLoading is true', () => {
    render(<DataTable columns={columns} rows={[]} isLoading onSortChange={vi.fn()} emptyState={<p>Empty</p>} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the provided empty state when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} onSortChange={vi.fn()} emptyState={<p>Empty</p>} />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('calls onSortChange with the column key when a sortable header is clicked', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(<DataTable columns={columns} rows={rows} onSortChange={onSortChange} emptyState={<p>Empty</p>} />);

    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith('name');
  });

  it('reflects the current sort direction via aria-sort', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        sortKey="name"
        sortDirection="asc"
        onSortChange={vi.fn()}
        emptyState={<p>Empty</p>}
      />
    );
    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute('aria-sort', 'ascending');
  });

  it('does not render a sort button for non-sortable columns', () => {
    render(<DataTable columns={columns} rows={rows} onSortChange={vi.fn()} emptyState={<p>Empty</p>} />);
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- DataTable.test.jsx`
Expected: FAIL — `DataTable.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { ChevronUp, ChevronDown } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner.jsx';

function DataTable({ columns, rows, sortKey, sortDirection, onSortChange, isLoading, emptyState }) {
  if (isLoading) {
    return <LoadingSpinner label="Loading..." />;
  }

  if (rows.length === 0) {
    return emptyState;
  }

  return (
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
  );
}

export default DataTable;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- DataTable.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/DataTable.jsx frontend/src/components/DataTable.test.jsx
git commit -m "feat: add reusable DataTable component with sortable headers"
```

---

### Task 4: `adminCategoryService`

**Files:**
- Create: `frontend/src/services/adminCategoryService.js`
- Test: `frontend/src/services/adminCategoryService.test.js`

**Interfaces:**
- Consumes: shared `api` Axios instance (`frontend/src/services/api.js`, already attaches the JWT bearer token via its request interceptor).
- Produces: `getCategories({ sortBy, direction } = {}): Promise<Category[]>`, `createCategory(payload): Promise<Category>`, `updateCategory(id, payload): Promise<Category>`, `deleteCategory(id): Promise<void>`, where `Category = { id, productCategoryName, commissionRate, createdAt, updatedAt }`. Consumed by `CategoriesPage` (Task 6).

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { getCategories, createCategory, updateCategory, deleteCategory } from './adminCategoryService.js';

describe('adminCategoryService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getCategories fetches from /admin/categories with sort params and returns the list', async () => {
    const categories = [{ id: 1, productCategoryName: 'Electronics', commissionRate: 4 }];
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Categories retrieved.', data: categories },
    });

    const result = await getCategories({ sortBy: 'productCategoryName', direction: 'asc' });

    expect(api.get).toHaveBeenCalledWith('/admin/categories', {
      params: { sortBy: 'productCategoryName', direction: 'asc' },
    });
    expect(result).toEqual(categories);
  });

  it('getCategories works with no arguments', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, message: 'ok', data: [] } });

    await getCategories();

    expect(api.get).toHaveBeenCalledWith('/admin/categories', {
      params: { sortBy: undefined, direction: undefined },
    });
  });

  it('createCategory posts the payload and returns the created category', async () => {
    const created = { id: 2, productCategoryName: 'Home', commissionRate: 6 };
    vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, message: 'Created.', data: created } });

    const result = await createCategory({ productCategoryName: 'Home', commissionRate: 6 });

    expect(api.post).toHaveBeenCalledWith('/admin/categories', { productCategoryName: 'Home', commissionRate: 6 });
    expect(result).toEqual(created);
  });

  it('updateCategory puts the payload to the category id and returns the updated category', async () => {
    const updated = { id: 2, productCategoryName: 'Home Goods', commissionRate: 5 };
    vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true, message: 'Updated.', data: updated } });

    const result = await updateCategory(2, { productCategoryName: 'Home Goods', commissionRate: 5 });

    expect(api.put).toHaveBeenCalledWith('/admin/categories/2', {
      productCategoryName: 'Home Goods',
      commissionRate: 5,
    });
    expect(result).toEqual(updated);
  });

  it('deleteCategory sends a delete request for the category id', async () => {
    vi.spyOn(api, 'delete').mockResolvedValue({ data: { success: true, message: 'Deleted.', data: null } });

    await deleteCategory(2);

    expect(api.delete).toHaveBeenCalledWith('/admin/categories/2');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- adminCategoryService.test.js`
Expected: FAIL — `adminCategoryService.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```javascript
import api from './api.js';

export async function getCategories({ sortBy, direction } = {}) {
  const response = await api.get('/admin/categories', { params: { sortBy, direction } });
  return response.data.data;
}

export async function createCategory(payload) {
  const response = await api.post('/admin/categories', payload);
  return response.data.data;
}

export async function updateCategory(id, payload) {
  const response = await api.put(`/admin/categories/${id}`, payload);
  return response.data.data;
}

export async function deleteCategory(id) {
  await api.delete(`/admin/categories/${id}`);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- adminCategoryService.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/adminCategoryService.js frontend/src/services/adminCategoryService.test.js
git commit -m "feat: add adminCategoryService for category CRUD"
```

---

### Task 5: `CategoryForm`

**Files:**
- Create: `frontend/src/components/CategoryForm.jsx`
- Test: `frontend/src/components/CategoryForm.test.jsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure presentational + validation component). Its `onSubmit` prop is expected to return a promise that rejects with `{ message, fieldErrors }` (the shape produced by `normalizeError` in `api.js`) on failure.
- Produces: `CategoryForm({ category, onSubmit, onCancel })` (default export). `category` is `null` for create or `{ id, productCategoryName, commissionRate }` for edit. Calls `onSubmit({ productCategoryName: string, commissionRate: number })`. Used inside `Modal` by `CategoriesPage` (Task 6).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CategoryForm from './CategoryForm.jsx';

describe('CategoryForm', () => {
  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(<CategoryForm category={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(await screen.findByText('Category name is required.')).toBeInTheDocument();
    expect(screen.getByText('Commission rate is required.')).toBeInTheDocument();
  });

  it('rejects a commission rate outside 0-100', async () => {
    const user = userEvent.setup();
    render(<CategoryForm category={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Category Name'), 'Electronics');
    await user.type(screen.getByLabelText('Commission Rate (%)'), '150');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(await screen.findByText('Commission rate must be between 0 and 100.')).toBeInTheDocument();
  });

  it('submits the expected payload for a new category', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CategoryForm category={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Category Name'), 'Electronics');
    await user.type(screen.getByLabelText('Commission Rate (%)'), '4.5');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(onSubmit).toHaveBeenCalledWith({ productCategoryName: 'Electronics', commissionRate: 4.5 });
  });

  it('pre-fills fields and submits an update payload when editing', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <CategoryForm
        category={{ id: 1, productCategoryName: 'Electronics', commissionRate: 4 }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Category Name')).toHaveValue('Electronics');
    expect(screen.getByLabelText('Commission Rate (%)')).toHaveValue(4);

    await user.clear(screen.getByLabelText('Commission Rate (%)'));
    await user.type(screen.getByLabelText('Commission Rate (%)'), '5');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit).toHaveBeenCalledWith({ productCategoryName: 'Electronics', commissionRate: 5 });
  });

  it('renders a server-side field error under the name input without a generic banner', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: 'Validation failed.',
      fieldErrors: { productCategoryName: 'A category with this name already exists.' },
    });
    const user = userEvent.setup();
    render(<CategoryForm category={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Category Name'), 'Electronics');
    await user.type(screen.getByLabelText('Commission Rate (%)'), '4');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(await screen.findByText('A category with this name already exists.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- CategoryForm.test.jsx`
Expected: FAIL — `CategoryForm.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useState } from 'react';

function CategoryForm({ category, onSubmit, onCancel }) {
  const [name, setName] = useState(category?.productCategoryName ?? '');
  const [commissionRate, setCommissionRate] = useState(
    category?.commissionRate !== undefined ? String(category.commissionRate) : ''
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!name.trim()) errors.productCategoryName = 'Category name is required.';
    const rateValue = Number(commissionRate);
    if (commissionRate === '' || Number.isNaN(rateValue)) {
      errors.commissionRate = 'Commission rate is required.';
    } else if (rateValue < 0 || rateValue > 100) {
      errors.commissionRate = 'Commission rate must be between 0 and 100.';
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ productCategoryName: name.trim(), commissionRate: Number(commissionRate) });
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      if (!error.fieldErrors) {
        setFormError(error.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
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
    </form>
  );
}

export default CategoryForm;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- CategoryForm.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CategoryForm.jsx frontend/src/components/CategoryForm.test.jsx
git commit -m "feat: add CategoryForm with client-side and server-side error handling"
```

---

### Task 6: `CategoriesPage` assembly

**Files:**
- Modify: `frontend/src/pages/admin/CategoriesPage.jsx` (replace the placeholder body entirely)
- Test: `frontend/src/pages/admin/CategoriesPage.test.jsx`

**Interfaces:**
- Consumes: `Modal` (Task 1), `ConfirmDialog` (Task 2), `DataTable` (Task 3), `adminCategoryService` (Task 4), `CategoryForm` (Task 5), plus existing `LoadingSpinner`/`ErrorState`/`EmptyState`/`useToast`.
- Produces: the complete `/admin/categories` route content — nothing downstream in this stage consumes `CategoriesPage` itself.

**Note:** `App.jsx` already routes `/admin/categories` to `CategoriesPage` (unchanged) — this task only replaces the placeholder's internal content.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../../context/ToastContext.jsx';
import CategoriesPage from './CategoriesPage.jsx';
import * as adminCategoryService from '../../services/adminCategoryService.js';

const categories = [
  { id: 1, productCategoryName: 'Electronics', commissionRate: 4, createdAt: '2026-01-10T10:00:00' },
  { id: 2, productCategoryName: 'Home Goods', commissionRate: 6, createdAt: '2026-02-15T10:00:00' },
];

function renderPage() {
  return render(
    <ToastProvider>
      <CategoriesPage />
    </ToastProvider>
  );
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue(categories);
  });

  it('renders the fetched categories', async () => {
    renderPage();

    expect(await screen.findByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Home Goods')).toBeInTheDocument();
    expect(screen.getByText('4.00%')).toBeInTheDocument();
  });

  it('filters the visible rows as the user types in the search box', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Electronics');

    await user.type(screen.getByLabelText('Search categories'), 'Home');

    expect(screen.queryByText('Electronics')).not.toBeInTheDocument();
    expect(screen.getByText('Home Goods')).toBeInTheDocument();
  });

  it('toggles sort direction and re-fetches when a sortable header is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Electronics');

    await user.click(screen.getByRole('button', { name: /category name/i }));

    await waitFor(() =>
      expect(adminCategoryService.getCategories).toHaveBeenLastCalledWith({
        sortBy: 'productCategoryName',
        direction: 'desc',
      })
    );
  });

  it('creates a category and shows a success toast', async () => {
    vi.spyOn(adminCategoryService, 'createCategory').mockResolvedValue({
      id: 3,
      productCategoryName: 'Toys',
      commissionRate: 5,
      createdAt: '2026-03-01T10:00:00',
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Electronics');

    await user.click(screen.getByRole('button', { name: 'Add Category' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Category Name'), 'Toys');
    await user.type(within(dialog).getByLabelText('Commission Rate (%)'), '5');
    await user.click(within(dialog).getByRole('button', { name: 'Add Category' }));

    expect(await screen.findByText('Toys')).toBeInTheDocument();
    expect(await screen.findByText('Category created successfully.')).toBeInTheDocument();
  });

  it('edits a category and shows a success toast', async () => {
    vi.spyOn(adminCategoryService, 'updateCategory').mockResolvedValue({
      id: 1,
      productCategoryName: 'Electronics & Gadgets',
      commissionRate: 4,
      createdAt: '2026-01-10T10:00:00',
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Electronics');

    await user.click(screen.getByRole('button', { name: 'Edit Electronics' }));
    const nameInput = screen.getByLabelText('Category Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Electronics & Gadgets');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Electronics & Gadgets')).toBeInTheDocument();
    expect(await screen.findByText('Category updated successfully.')).toBeInTheDocument();
  });

  it('deletes a category after confirmation and shows a success toast', async () => {
    vi.spyOn(adminCategoryService, 'deleteCategory').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Electronics');

    await user.click(screen.getByRole('button', { name: 'Delete Electronics' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('Electronics')).not.toBeInTheDocument());
    expect(await screen.findByText('Category deleted successfully.')).toBeInTheDocument();
  });

  it('shows the backend in-use message via toast and keeps the row when delete is blocked', async () => {
    vi.spyOn(adminCategoryService, 'deleteCategory').mockRejectedValue({
      message: 'Cannot delete a category that has products assigned to it.',
      fieldErrors: null,
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Electronics');

    await user.click(screen.getByRole('button', { name: 'Delete Electronics' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByText('Cannot delete a category that has products assigned to it.')
    ).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('shows an empty state when there are no categories', async () => {
    adminCategoryService.getCategories.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No categories yet')).toBeInTheDocument();
  });

  it('shows an error state with retry when the fetch fails', async () => {
    adminCategoryService.getCategories.mockRejectedValueOnce({ message: 'Network error. Please try again.' });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Electronics')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- CategoriesPage.test.jsx`
Expected: FAIL — the current placeholder renders none of this.

- [ ] **Step 3: Write the new `CategoriesPage.jsx`**

```jsx
import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import DataTable from '../../components/DataTable.jsx';
import Modal from '../../components/Modal.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import CategoryForm from '../../components/CategoryForm.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { useToast } from '../../hooks/useToast.js';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../services/adminCategoryService.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function CategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('productCategoryName');
  const [sortDirection, setSortDirection] = useState('asc');
  const [modalState, setModalState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function loadCategories() {
    setIsLoading(true);
    setError(null);
    getCategories({ sortBy: sortKey, direction: sortDirection })
      .then(setCategories)
      .catch((err) => setError(err.message ?? 'Failed to load categories.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortKey, sortDirection]);

  const visibleCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.trim().toLowerCase();
    return categories.filter((category) => category.productCategoryName.toLowerCase().includes(term));
  }, [categories, search]);

  function handleSortChange(key) {
    if (key === sortKey) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  }

  async function handleFormSubmit(payload) {
    if (modalState.category) {
      const updated = await updateCategory(modalState.category.id, payload);
      setCategories((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      showToast('Category updated successfully.');
    } else {
      const created = await createCategory(payload);
      setCategories((current) => [...current, created]);
      showToast('Category created successfully.');
    }
    setModalState(null);
  }

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await deleteCategory(deleteTarget.id);
      setCategories((current) => current.filter((item) => item.id !== deleteTarget.id));
      showToast('Category deleted successfully.');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err.message ?? 'Failed to delete category.', 'error');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    { key: 'productCategoryName', label: 'Category Name', sortable: true },
    {
      key: 'commissionRate',
      label: 'Commission Rate',
      sortable: true,
      render: (row) => `${Number(row.commissionRate).toFixed(2)}%`,
    },
    { key: 'createdAt', label: 'Created', sortable: true, render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
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
        </div>
      ),
    },
  ];

  return (
    <div>
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

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search categories..."
          aria-label="Search categories"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadCategories} />
      ) : (
        <DataTable
          columns={columns}
          rows={visibleCategories}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          isLoading={isLoading}
          emptyState={
            <EmptyState
              title={search ? 'No matching categories' : 'No categories yet'}
              description={
                search ? 'Try a different search term.' : 'Add your first product category to get started.'
              }
            />
          }
        />
      )}

      {modalState && (
        <Modal
          isOpen
          onClose={() => setModalState(null)}
          title={modalState.category ? 'Edit Category' : 'Add Category'}
        >
          <CategoryForm
            category={modalState.category}
            onSubmit={handleFormSubmit}
            onCancel={() => setModalState(null)}
          />
        </Modal>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Category"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.productCategoryName}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default CategoriesPage;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- CategoriesPage.test.jsx`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/CategoriesPage.jsx frontend/src/pages/admin/CategoriesPage.test.jsx
git commit -m "feat: assemble the full category management page with CRUD"
```

---

### Task 7: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1–6
- Produces: nothing further downstream — this sub-stage's final gate.

- [ ] **Step 1: Run the entire test suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 1 through 6.

- [ ] **Step 2: Run lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings). If `react-hooks/set-state-in-effect` fires on `CategoriesPage`'s fetch effect, apply the same targeted `// eslint-disable-next-line react-hooks/set-state-in-effect` annotation (with a one-line justification comment) used in `useProductSearch.js` from the prior stage.

- [ ] **Step 3: Run the production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manual smoke check (optional, requires the backend running and a real admin login)**

This step requires real admin credentials and is optional — skip it if a live backend isn't available; the automated gates in Steps 1-3 are the mandatory bar for this sub-stage. If you do have the backend running and are logged in as the seeded admin, open `/admin/categories` and confirm: the table loads, search filters instantly, sort headers toggle direction, Add/Edit open the modal and persist changes, and Delete on a category with no products succeeds while Delete on a category with assigned products shows the backend's blocking message.

- [ ] **Step 5: Commit (if the smoke check surfaced any fixes)**

If Step 4 found nothing to fix (or was skipped), there is nothing to commit for this task — Task 6's commit is the final commit of this sub-stage. If it did surface a small fix, apply it, re-run Steps 1-3, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Admin Category Management manual smoke check"
```
