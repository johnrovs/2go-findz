# Import Products from Excel — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Import Products" button and modal to the admin Products page that uploads a `.xlsx` workbook, shows a server-validated preview, confirms the import, and refreshes the product list on completion.

**Architecture:** One new modal component (`ImportProductsModal`) owns a 4-step state machine (`upload → preview → importing → results`) and talks to two new service functions. `ProductsPage` only owns opening/closing the modal and reacting to its completion callback — it never reaches into the modal's internals. Two small, generically-reusable enhancements (`Button`'s `outline` variant, `Modal`'s `size` prop) are built first since the modal depends on both.

**Tech Stack:** React, Vite, Tailwind CSS, Vitest, React Testing Library. Consumes the backend contract built in `docs/superpowers/plans/2026-08-16-import-products-excel-backend.md` — **that plan must be fully implemented and merged before this one starts.**

## Global Constraints

- Imported products are always shown as inactive after import (enforced server-side; the frontend never overrides this).
- Never modify the existing Add Product route/form, product filters, or pagination.
- Escape-to-close and all modal action buttons must be disabled while a preview or import request is in flight.
- Status must never be conveyed by color alone — every row status in the preview table carries a text label.
- "Import Products" button: white background, purple border, purple text, purple hover with white text, placed before "Add Product" in the header row.
- The static template asset already exists at `frontend/public/templates/product-list-template.xlsx` (generated to match the screenshot's Products/How to use sheets) — nothing in this plan needs to create it, only link to it.

---

### Task 1: `Button` outline variant and `Modal` size prop

**Files:**
- Modify: `frontend/src/components/Button.jsx`
- Modify: `frontend/src/components/Modal.jsx`
- Modify: `frontend/src/components/Button.test.jsx`
- Modify: `frontend/src/components/Modal.test.jsx`

**Interfaces:**
- Consumes: nothing (both are existing, standalone components).
- Produces: `Button` accepts `variant="outline"`. `Modal` accepts an optional `size` prop (`'md'` default, unchanged; `'lg'` widens the dialog). Task 3's `ImportProductsModal` uses both.

- [x] **Step 1: Write the failing tests**

Add to `frontend/src/components/Button.test.jsx`, inside the existing `describe('Button', ...)` block:

```jsx
  it('applies outline variant classes', () => {
    render(<Button variant="outline">Import Products</Button>);
    expect(screen.getByRole('button', { name: 'Import Products' })).toHaveClass(
      'bg-white', 'text-primary', 'border-primary'
    );
  });
```

Add to `frontend/src/components/Modal.test.jsx`, inside the existing `describe('Modal', ...)` block:

```jsx
  it('applies the default md max-width when no size is given', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Test Modal">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog', { name: 'Test Modal' })).toHaveClass('max-w-md');
  });

  it('applies a wider max-width when size="lg"', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Test Modal" size="lg">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByRole('dialog', { name: 'Test Modal' })).toHaveClass('max-w-3xl');
  });
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/Button.test.jsx src/components/Modal.test.jsx`
Expected: the two new tests fail (`outline` class not applied; `size` prop has no effect).

- [x] **Step 3: Implement the `Button` outline variant**

In `frontend/src/components/Button.jsx`, add to `VARIANT_CLASSES`:

```js
const VARIANT_CLASSES = {
  primary: 'bg-amazon text-white shadow-card hover:bg-amazon-hover',
  secondary: 'bg-white text-heading border border-heading hover:bg-heading/5',
  amazon: 'bg-amazon text-white shadow-card hover:bg-amazon-hover',
  danger: 'bg-danger text-white shadow-card hover:bg-red-700',
  accent: 'bg-dashboard-orange text-white shadow-card hover:opacity-90',
  outline: 'bg-white text-primary border border-primary hover:bg-primary hover:text-white',
};
```

- [x] **Step 4: Implement the `Modal` size prop**

In `frontend/src/components/Modal.jsx`, add above the component:

```js
const SIZE_CLASSES = {
  md: 'max-w-md',
  lg: 'max-w-3xl',
};
```

Change the function signature:

```jsx
function Modal({ isOpen, onClose, title, children, role = 'dialog', size = 'md' }) {
```

Change the dialog `className` (currently `"relative flex max-h-[90vh] w-full max-w-md flex-col rounded-card bg-white p-6 shadow-dropdown"`) to:

```jsx
className={`relative flex max-h-[90vh] w-full ${SIZE_CLASSES[size]} flex-col rounded-card bg-white p-6 shadow-dropdown`}
```

- [x] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/Button.test.jsx src/components/Modal.test.jsx`
Expected: all tests pass, including every pre-existing test in both files.

- [x] **Step 6: Commit**

```bash
git add frontend/src/components/Button.jsx frontend/src/components/Modal.jsx \
        frontend/src/components/Button.test.jsx frontend/src/components/Modal.test.jsx
git commit -m "feat(ui): add Button outline variant and Modal size prop"
```

---

### Task 2: `adminProductImportService.js`

**Files:**
- Create: `frontend/src/services/adminProductImportService.js`
- Test: `frontend/src/services/adminProductImportService.test.js`

**Interfaces:**
- Consumes: `api` (default export) from `frontend/src/services/api.js`.
- Produces: `previewImport(file) -> Promise<ImportPreviewResponse>`, `importProducts(file) -> Promise<ImportResultResponse>` (both unwrap `response.data.data`, matching every other service module). Task 3's `ImportProductsModal` calls both.

- [x] **Step 1: Write the failing test**

```js
import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { previewImport, importProducts } from './adminProductImportService.js';

vi.mock('./api.js', () => ({
  default: { post: vi.fn() },
}));

describe('adminProductImportService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('previewImport posts the file as multipart form data to the preview endpoint', async () => {
    const file = new File(['bytes'], 'products.xlsx');
    api.post.mockResolvedValue({ data: { data: { totalRows: 1 } } });

    const result = await previewImport(file);

    expect(api.post).toHaveBeenCalledWith('/admin/products/import/preview', expect.any(FormData));
    const formData = api.post.mock.calls[0][1];
    expect(formData.get('file')).toBe(file);
    expect(result).toEqual({ totalRows: 1 });
  });

  it('importProducts posts the file as multipart form data to the import endpoint', async () => {
    const file = new File(['bytes'], 'products.xlsx');
    api.post.mockResolvedValue({ data: { data: { importedProducts: 1 } } });

    const result = await importProducts(file);

    expect(api.post).toHaveBeenCalledWith('/admin/products/import', expect.any(FormData));
    const formData = api.post.mock.calls[0][1];
    expect(formData.get('file')).toBe(file);
    expect(result).toEqual({ importedProducts: 1 });
  });
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/services/adminProductImportService.test.js`
Expected: module-not-found error (`adminProductImportService.js` doesn't exist yet).

- [x] **Step 3: Implement `adminProductImportService.js`**

```js
import api from './api.js';

export async function previewImport(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/products/import/preview', formData);
  return response.data.data;
}

export async function importProducts(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/products/import', formData);
  return response.data.data;
}
```

- [x] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/services/adminProductImportService.test.js`
Expected: both tests pass.

- [x] **Step 5: Commit**

```bash
git add frontend/src/services/adminProductImportService.js frontend/src/services/adminProductImportService.test.js
git commit -m "feat(products): add adminProductImportService for Excel import"
```

---

### Task 3: `ImportProductsModal`

**Files:**
- Create: `frontend/src/components/ImportProductsModal.jsx`
- Test: `frontend/src/components/ImportProductsModal.test.jsx`

**Interfaces:**
- Consumes: `Modal` (`size="lg"`) and `Button` (`variant="outline"`/`"secondary"`/`"accent"`) from Task 1; `previewImport`/`importProducts` from Task 2.
- Produces: `<ImportProductsModal isOpen={boolean} onClose={() => void} onImportComplete={(ImportResultResponse) => void} />`. `onImportComplete` fires only when the admin clicks "Close" on the results screen (not immediately after the import request resolves), and receives the exact `ImportResultResponse` shape from the backend plan (`{ totalRows, importedProducts, createdCategories, skippedDuplicates, failedRows, issues }`). Task 4's `ProductsPage` renders this component and implements `onImportComplete`.

- [x] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ImportProductsModal from './ImportProductsModal.jsx';
import * as adminProductImportService from '../services/adminProductImportService.js';

function buildFile(name = 'products.xlsx', type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
  return new File(['fake-excel-bytes'], name, { type });
}

const previewResponse = {
  fileName: 'products.xlsx',
  totalRows: 2,
  readyRows: 1,
  duplicateRows: 0,
  invalidRows: 1,
  newCategories: ['Beauty'],
  rows: [
    {
      rowNumber: 2, productName: 'Serum', brand: 'Glow Labs', sku: 'GL-1', category: 'Beauty',
      price: 24.99, link: 'https://amazon.com/serum', status: 'READY', errors: [], newCategory: true,
    },
    {
      rowNumber: 3, productName: 'Bad Row', brand: null, sku: null, category: 'Beauty',
      price: null, link: null, status: 'INVALID', errors: ['Row 3: Link is required.'], newCategory: false,
    },
  ],
};

const resultResponse = {
  totalRows: 2, importedProducts: 1, createdCategories: 1, skippedDuplicates: 0, failedRows: 1,
  issues: [{ rowNumber: 3, productName: 'Bad Row', sku: null, message: 'Row 3: Link is required.' }],
};

describe('ImportProductsModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<ImportProductsModal isOpen={false} onClose={vi.fn()} onImportComplete={vi.fn()} />);
    expect(screen.queryByText('Choose Excel File')).not.toBeInTheDocument();
  });

  it('renders the upload step with template info when open', () => {
    render(<ImportProductsModal isOpen onClose={vi.fn()} onImportComplete={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Import Products' })).toBeInTheDocument();
    expect(screen.getByText('Choose Excel File')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download Template/ })).toHaveAttribute(
      'href', '/templates/product-list-template.xlsx'
    );
  });

  it('shows a client-side error for a non-.xlsx file without calling the service', async () => {
    const previewSpy = vi.spyOn(adminProductImportService, 'previewImport');
    const user = userEvent.setup();
    render(<ImportProductsModal isOpen onClose={vi.fn()} onImportComplete={vi.fn()} />);

    await user.upload(screen.getByLabelText('Choose Excel file to import'), buildFile('products.csv', 'text/csv'));

    expect(await screen.findByText('Only .xlsx files are supported.')).toBeInTheDocument();
    expect(previewSpy).not.toHaveBeenCalled();
  });

  it('shows a client-side error for an oversized file', async () => {
    const user = userEvent.setup();
    render(<ImportProductsModal isOpen onClose={vi.fn()} onImportComplete={vi.fn()} />);

    const oversized = buildFile();
    Object.defineProperty(oversized, 'size', { value: 6 * 1024 * 1024 });
    await user.upload(screen.getByLabelText('Choose Excel file to import'), oversized);

    expect(await screen.findByText('File exceeds the 5MB size limit.')).toBeInTheDocument();
  });

  it('uploads a valid file, fetches a preview, and renders the row table', async () => {
    vi.spyOn(adminProductImportService, 'previewImport').mockResolvedValue(previewResponse);
    const user = userEvent.setup();
    render(<ImportProductsModal isOpen onClose={vi.fn()} onImportComplete={vi.fn()} />);

    await user.upload(screen.getByLabelText('Choose Excel file to import'), buildFile());

    expect(await screen.findByText('Serum')).toBeInTheDocument();
    expect(screen.getByText('Bad Row')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Invalid')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import 1 Ready Rows' })).toBeInTheDocument();
  });

  it('shows a server error message when the preview request fails', async () => {
    vi.spyOn(adminProductImportService, 'previewImport').mockRejectedValue({
      message: 'This workbook has no "Products" worksheet.',
    });
    const user = userEvent.setup();
    render(<ImportProductsModal isOpen onClose={vi.fn()} onImportComplete={vi.fn()} />);

    await user.upload(screen.getByLabelText('Choose Excel file to import'), buildFile());

    expect(await screen.findByText('This workbook has no "Products" worksheet.')).toBeInTheDocument();
  });

  it('imports the ready rows and shows the results summary', async () => {
    vi.spyOn(adminProductImportService, 'previewImport').mockResolvedValue(previewResponse);
    vi.spyOn(adminProductImportService, 'importProducts').mockResolvedValue(resultResponse);
    const user = userEvent.setup();
    render(<ImportProductsModal isOpen onClose={vi.fn()} onImportComplete={vi.fn()} />);

    await user.upload(screen.getByLabelText('Choose Excel file to import'), buildFile());
    await screen.findByText('Serum');
    await user.click(screen.getByRole('button', { name: 'Import 1 Ready Rows' }));

    expect(await screen.findByText('Import completed')).toBeInTheDocument();
    expect(screen.getByText('1 products imported')).toBeInTheDocument();
    expect(screen.getByText('1 new categories created')).toBeInTheDocument();
    expect(screen.getByText('1 rows failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Error Report' })).toBeInTheDocument();
  });

  it('does not show the error report button when there are no issues', async () => {
    vi.spyOn(adminProductImportService, 'previewImport').mockResolvedValue(previewResponse);
    vi.spyOn(adminProductImportService, 'importProducts').mockResolvedValue({
      ...resultResponse, failedRows: 0, issues: [],
    });
    const user = userEvent.setup();
    render(<ImportProductsModal isOpen onClose={vi.fn()} onImportComplete={vi.fn()} />);

    await user.upload(screen.getByLabelText('Choose Excel file to import'), buildFile());
    await screen.findByText('Serum');
    await user.click(screen.getByRole('button', { name: 'Import 1 Ready Rows' }));

    await screen.findByText('Import completed');
    expect(screen.queryByRole('button', { name: 'Download Error Report' })).not.toBeInTheDocument();
  });

  it('calls onImportComplete with the result and closes only when Close is clicked on the results screen', async () => {
    vi.spyOn(adminProductImportService, 'previewImport').mockResolvedValue(previewResponse);
    vi.spyOn(adminProductImportService, 'importProducts').mockResolvedValue(resultResponse);
    const onImportComplete = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ImportProductsModal isOpen onClose={onClose} onImportComplete={onImportComplete} />);

    await user.upload(screen.getByLabelText('Choose Excel file to import'), buildFile());
    await screen.findByText('Serum');
    await user.click(screen.getByRole('button', { name: 'Import 1 Ready Rows' }));
    await screen.findByText('Import completed');
    expect(onImportComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(onImportComplete).toHaveBeenCalledWith(resultResponse);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close on Escape while an import is in progress', async () => {
    vi.spyOn(adminProductImportService, 'previewImport').mockResolvedValue(previewResponse);
    let resolveImport;
    vi.spyOn(adminProductImportService, 'importProducts').mockReturnValue(
      new Promise((resolve) => {
        resolveImport = resolve;
      })
    );
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ImportProductsModal isOpen onClose={onClose} onImportComplete={vi.fn()} />);

    await user.upload(screen.getByLabelText('Choose Excel file to import'), buildFile());
    await screen.findByText('Serum');
    await user.click(screen.getByRole('button', { name: 'Import 1 Ready Rows' }));
    await screen.findByText('Importing products...');

    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    resolveImport(resultResponse);
  });
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/ImportProductsModal.test.jsx`
Expected: module-not-found error (`ImportProductsModal.jsx` doesn't exist yet).

- [x] **Step 3: Implement `ImportProductsModal.jsx`**

```jsx
import { useState } from 'react';
import { Sheet, Info, Download } from 'lucide-react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { previewImport, importProducts } from '../services/adminProductImportService.js';

const ALLOWED_EXTENSION = '.xlsx';
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const TEMPLATE_COLUMNS = ['Product Name', 'Brand', 'SKU', 'Category', 'Description', 'Price', 'Link'];

const STATUS_STYLES = {
  READY: 'bg-success/10 text-success',
  DUPLICATE: 'bg-warning/10 text-warning',
  INVALID: 'bg-danger/10 text-danger',
};

const STATUS_LABELS = {
  READY: 'Ready',
  DUPLICATE: 'Duplicate',
  INVALID: 'Invalid',
};

function csvEscape(value) {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function ImportProductsModal({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);

  function reset() {
    setStep('upload');
    setFile(null);
    setIsProcessing(false);
    setError('');
    setPreview(null);
    setResult(null);
  }

  function handleClose() {
    if (isProcessing) return;
    reset();
    onClose();
  }

  function validateClientSide(selectedFile) {
    if (!selectedFile.name.toLowerCase().endsWith(ALLOWED_EXTENSION)) {
      return 'Only .xlsx files are supported.';
    }
    if (selectedFile.size > MAX_SIZE_BYTES) {
      return 'File exceeds the 5MB size limit.';
    }
    return '';
  }

  async function handleFileSelected(selectedFile) {
    if (!selectedFile) return;
    setError('');
    const validationError = validateClientSide(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    try {
      const previewData = await previewImport(selectedFile);
      setPreview(previewData);
      setStep('preview');
    } catch (err) {
      setError(err.message ?? 'Failed to preview the file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleInputChange(event) {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    handleFileSelected(selectedFile);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave() {
    setIsDragActive(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragActive(false);
    handleFileSelected(event.dataTransfer.files?.[0]);
  }

  async function handleImportConfirm() {
    setError('');
    setStep('importing');
    setIsProcessing(true);
    try {
      const resultData = await importProducts(file);
      setResult(resultData);
      setStep('results');
    } catch (err) {
      setError(err.message ?? 'Failed to import products. Please try again.');
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDownloadErrorReport() {
    const rows = [['Excel Row', 'Product Name', 'SKU', 'Error']];
    result.issues.forEach((issue) => {
      rows.push([issue.rowNumber, issue.productName ?? '', issue.sku ?? '', issue.message]);
    });
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import-error-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleResultsClose() {
    const finishedResult = result;
    reset();
    onClose();
    onImportComplete(finishedResult);
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Products" size="lg">
      <p className="mb-4 text-small text-muted">
        Upload the 2Go Findz Excel template to add multiple products at once.
      </p>

      {error && (
        <p role="alert" className="mb-4 rounded-btn bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {step === 'upload' && (
        <div>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-8 text-center transition-colors ${
              isDragActive
                ? 'border-dashboard-purple bg-dashboard-purpleLight'
                : 'border-dashboard-purple/40 bg-dashboard-purpleLight/40'
            }`}
          >
            <Sheet className="h-10 w-10 text-dashboard-purple" aria-hidden="true" />
            <p className="text-small font-semibold text-heading">Drop your Excel file here</p>
            <p className="text-xs text-muted">or</p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-dashboard-purple px-4 py-2 text-sm font-medium text-dashboard-purple hover:bg-dashboard-purpleLight focus-within:ring-2 focus-within:ring-primary">
              {isProcessing ? 'Processing...' : 'Choose Excel File'}
              <input
                type="file"
                accept=".xlsx"
                onChange={handleInputChange}
                disabled={isProcessing}
                className="hidden"
                aria-label="Choose Excel file to import"
              />
            </label>
            <p className="text-xs text-muted">Only .xlsx files up to 5MB</p>
          </div>

          <div className="mt-4 rounded-btn border border-border p-4">
            <p className="text-small font-semibold text-heading">Template columns</p>
            <p className="mt-1 text-xs text-muted">{TEMPLATE_COLUMNS.join(', ')}</p>
            <a
              href="/templates/product-list-template.xlsx"
              download
              className="mt-3 inline-flex items-center gap-2 text-small font-medium text-primary hover:underline"
            >
              <Download size={16} aria-hidden="true" />
              Download Template
            </a>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-btn bg-dashboard-purpleLight/60 p-3 text-xs text-heading">
            <Info size={16} className="mt-0.5 shrink-0 text-dashboard-purple" aria-hidden="true" />
            <p>Imported products will be inactive by default. New categories will also be created as inactive.</p>
          </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div>
          <div className="mb-3 flex items-start gap-2 rounded-btn bg-warning/10 p-3 text-xs text-heading">
            <Info size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
            <p>
              Check row 2 below -- templates often still contain the example product. Remove it from
              your spreadsheet and re-upload if you don&apos;t want it imported.
            </p>
          </div>

          <p className="mb-3 text-small text-muted">
            Total {preview.totalRows} &middot; Ready {preview.readyRows} &middot; Duplicates{' '}
            {preview.duplicateRows} &middot; Invalid {preview.invalidRows} &middot; New categories{' '}
            {preview.newCategories.length}
          </p>

          <div className="max-h-72 overflow-auto rounded-btn border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary text-heading">
                <tr>
                  <th scope="col" className="px-3 py-2">Row</th>
                  <th scope="col" className="px-3 py-2">Product Name</th>
                  <th scope="col" className="px-3 py-2">SKU</th>
                  <th scope="col" className="px-3 py-2">Category</th>
                  <th scope="col" className="px-3 py-2">Price</th>
                  <th scope="col" className="px-3 py-2">Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-border">
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.productName || '—'}</td>
                    <td className="px-3 py-2">{row.sku || '—'}</td>
                    <td className="px-3 py-2">{row.category || '—'}</td>
                    <td className="px-3 py-2">{row.price != null ? `$${Number(row.price).toFixed(2)}` : '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[row.status]}`}>
                        {STATUS_LABELS[row.status]}
                      </span>
                      {row.errors.length > 0 && <p className="mt-1 text-muted">{row.errors.join(' ')}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="accent" size="sm" onClick={handleImportConfirm} disabled={preview.readyRows === 0}>
              Import {preview.readyRows} Ready Rows
            </Button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="flex flex-col items-center gap-3 py-10">
          <div
            role="status"
            aria-label="Importing products"
            className="h-8 w-8 animate-spin rounded-full border-4 border-dashboard-purple border-t-transparent"
          />
          <p className="text-small font-medium text-heading">Importing products...</p>
        </div>
      )}

      {step === 'results' && result && (
        <div>
          <p className="text-small font-semibold text-heading">Import completed</p>
          <ul className="mt-3 space-y-1 text-small text-body">
            <li>{result.importedProducts} products imported</li>
            <li>{result.createdCategories} new categories created</li>
            <li>{result.skippedDuplicates} duplicates skipped</li>
            <li>{result.failedRows} rows failed</li>
          </ul>

          <div className="mt-6 flex justify-end gap-3">
            {result.issues.length > 0 && (
              <Button variant="secondary" size="sm" onClick={handleDownloadErrorReport}>
                Download Error Report
              </Button>
            )}
            <Button variant="accent" size="sm" onClick={handleResultsClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default ImportProductsModal;
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/ImportProductsModal.test.jsx`
Expected: all tests pass.

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/ImportProductsModal.jsx frontend/src/components/ImportProductsModal.test.jsx
git commit -m "feat(products): add ImportProductsModal"
```

---

### Task 4: Wire the import flow into `ProductsPage`

**Files:**
- Modify: `frontend/src/pages/admin/ProductsPage.jsx`
- Modify: `frontend/src/pages/admin/ProductsPage.test.jsx`

**Interfaces:**
- Consumes: `ImportProductsModal` from Task 3; `productSearch.setPage`/`.reload` from the existing `useAdminProductSearch` hook; `useToast` from the existing `hooks/useToast.js`.
- Produces: nothing further downstream — this is the final integration point.

- [x] **Step 1: Write the failing tests**

Add near the top of `frontend/src/pages/admin/ProductsPage.test.jsx`, before the `describe` block, so the mock is hoisted:

```jsx
vi.mock('../../components/ImportProductsModal.jsx', () => ({
  default: ({ isOpen, onClose, onImportComplete }) =>
    isOpen ? (
      <div role="dialog" aria-label="Import Products (mock)">
        <button onClick={() => onImportComplete({ importedProducts: 15, createdCategories: 4 })}>
          Simulate import complete
        </button>
        <button onClick={onClose}>Simulate close</button>
      </div>
    ) : null,
}));
```

Add these tests inside the existing `describe('ProductsPage', ...)` block:

```jsx
  it('renders the Import Products button before Add Product', async () => {
    renderPage();
    await screen.findByText('Wireless Earbuds');

    const importButton = screen.getByRole('button', { name: 'Import Products' });
    const addProductLink = screen.getByRole('link', { name: 'Add Product' });
    expect(importButton.compareDocumentPosition(addProductLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens the import modal when Import Products is clicked, and closes it', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Earbuds');

    await user.click(screen.getByRole('button', { name: 'Import Products' }));
    expect(screen.getByRole('dialog', { name: 'Import Products (mock)' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Simulate close' }));
    expect(screen.queryByRole('dialog', { name: 'Import Products (mock)' })).not.toBeInTheDocument();
  });

  it('reloads the product list and shows a success toast after a completed import', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Earbuds');

    adminProductService.searchProducts.mockClear();
    await user.click(screen.getByRole('button', { name: 'Import Products' }));
    await user.click(screen.getByRole('button', { name: 'Simulate import complete' }));

    expect(
      await screen.findByText('15 products and 4 new categories were imported successfully.')
    ).toBeInTheDocument();
    await waitFor(() => expect(adminProductService.searchProducts).toHaveBeenCalled());
  });
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/admin/ProductsPage.test.jsx`
Expected: the three new tests fail (`Import Products` button doesn't exist yet).

- [x] **Step 3: Wire the modal into `ProductsPage.jsx`**

Update the icon import (currently `import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';`):

```jsx
import { Plus, Pencil, Trash2, Image as ImageIcon, FileUp } from 'lucide-react';
```

Add the new modal import, alongside the other component imports:

```jsx
import ImportProductsModal from '../../components/ImportProductsModal.jsx';
```

Add state, next to the existing `deleteTarget`/`isDeleting` state:

```jsx
  const [isImportOpen, setIsImportOpen] = useState(false);
```

Add a handler, alongside `handleDeleteConfirm`:

```jsx
  function handleImportComplete(result) {
    productSearch.setPage(1);
    productSearch.reload();
    showToast(
      `${result.importedProducts} products and ${result.createdCategories} new categories were imported successfully.`
    );
  }
```

Replace the header row's single button:

```jsx
        <Button to="/admin/products/new" variant="accent" size="sm">
          <Plus size={16} />
          Add Product
        </Button>
```

with two buttons, Import Products first:

```jsx
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)}>
            <FileUp size={16} />
            Import Products
          </Button>
          <Button to="/admin/products/new" variant="accent" size="sm">
            <Plus size={16} />
            Add Product
          </Button>
        </div>
```

Add the modal at the end of the component's returned JSX, alongside the existing `<ConfirmDialog>`:

```jsx
      <ImportProductsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={handleImportComplete}
      />
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/admin/ProductsPage.test.jsx`
Expected: all tests pass, including every pre-existing test in this file.

- [x] **Step 5: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: same pass count as the pre-existing baseline, plus every test added across Tasks 1–4 (5 known pre-existing `DashboardHeader.test.jsx` failures are unrelated to this feature and expected to remain).

- [x] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/ProductsPage.jsx frontend/src/pages/admin/ProductsPage.test.jsx
git commit -m "feat(products): wire Import Products into the Products page"
```

---

## Definition of Done

- `npx vitest run` (from `frontend/`) passes in full, including every test added in Tasks 1–4.
- The Products page shows "Import Products" before "Add Product"; clicking it opens the modal, which drives the full upload → preview → import → results flow against the real backend endpoints from the backend plan.
- After a completed import, the product list refreshes to page 1 (preserving the selected page size) and shows a success toast.
- Run the app end-to-end in a browser (both dev servers up) and manually import the template file at `frontend/public/templates/product-list-template.xlsx` to confirm the real integration before calling this feature complete — automated tests here all mock the service layer.
