import { render, screen, fireEvent } from '@testing-library/react';
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
    // Dropped (not picked via the accept-filtered <input>), since a real browser's native
    // file picker enforces accept=".xlsx" itself -- drag-and-drop is the realistic path for a
    // mismatched file type to actually reach the handler.
    const previewSpy = vi.spyOn(adminProductImportService, 'previewImport');
    render(<ImportProductsModal isOpen onClose={vi.fn()} onImportComplete={vi.fn()} />);

    const dropzone = screen.getByText('Drop your Excel file here').parentElement;
    fireEvent.drop(dropzone, { dataTransfer: { files: [buildFile('products.csv', 'text/csv')] } });

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
