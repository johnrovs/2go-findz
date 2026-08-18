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
