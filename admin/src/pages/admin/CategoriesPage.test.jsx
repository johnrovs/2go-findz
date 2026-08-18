import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../../context/ToastContext.jsx';
import CategoriesPage from './CategoriesPage.jsx';
import * as adminCategoryService from '../../services/adminCategoryService.js';

const categories = [
  {
    id: 1,
    productCategoryName: 'Electronics',
    commissionRate: 4,
    imageFileName: 'img_electronics.jpg',
    active: true,
    createdAt: '2026-01-10T10:00:00',
  },
  {
    id: 2,
    productCategoryName: 'Home Goods',
    commissionRate: 6,
    imageFileName: null,
    active: false,
    createdAt: '2026-02-15T10:00:00',
  },
];

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter>
        <CategoriesPage />
      </MemoryRouter>
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

  it('shows an Active or Inactive badge per row', async () => {
    renderPage();
    await screen.findByText('Electronics');

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders a thumbnail for categories with an image, and a placeholder icon otherwise', async () => {
    renderPage();
    await screen.findByText('Electronics');

    expect(screen.getByAltText('Electronics')).toHaveAttribute('src', expect.stringContaining('img_electronics.jpg'));
    expect(screen.queryByAltText('Home Goods')).not.toBeInTheDocument();
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

  it('links "Add Category" to the new-category route', async () => {
    renderPage();
    await screen.findByText('Electronics');

    expect(screen.getByRole('link', { name: 'Add Category' })).toHaveAttribute('href', '/categories/new');
  });

  it("links a row's edit action to its category route", async () => {
    renderPage();
    await screen.findByText('Electronics');

    expect(screen.getByRole('link', { name: 'Edit Electronics' })).toHaveAttribute('href', '/categories/1');
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
