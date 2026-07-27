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
