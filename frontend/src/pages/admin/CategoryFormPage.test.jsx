import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../../context/ToastContext.jsx';
import CategoryFormPage from './CategoryFormPage.jsx';
import * as adminCategoryService from '../../services/adminCategoryService.js';

const categories = [
  { id: 1, productCategoryName: 'Electronics', commissionRate: 4, imageFileName: null, createdAt: '2026-01-10T10:00:00' },
  { id: 2, productCategoryName: 'Home Goods', commissionRate: 6, imageFileName: null, createdAt: '2026-02-15T10:00:00' },
];

function renderPage(initialEntry) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin/categories" element={<div>Categories List</div>} />
          <Route path="/admin/categories/new" element={<CategoryFormPage />} />
          <Route path="/admin/categories/:id" element={<CategoryFormPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

describe('CategoryFormPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an empty form in create mode', async () => {
    renderPage('/admin/categories/new');

    expect(await screen.findByRole('heading', { name: 'Add Category' })).toBeInTheDocument();
    expect(screen.getByLabelText('Category Name')).toHaveValue('');
  });

  it('shows a back-to-categories link in create mode', async () => {
    renderPage('/admin/categories/new');
    await screen.findByRole('heading', { name: 'Add Category' });

    expect(screen.getByRole('button', { name: /back to categories/i })).toBeInTheDocument();
  });

  it('navigates back to the categories list when Back to Categories is clicked', async () => {
    const user = userEvent.setup();
    renderPage('/admin/categories/new');
    await screen.findByRole('heading', { name: 'Add Category' });

    await user.click(screen.getByRole('button', { name: /back to categories/i }));

    expect(await screen.findByText('Categories List')).toBeInTheDocument();
  });

  it('creates a category and navigates back to the list on success', async () => {
    vi.spyOn(adminCategoryService, 'createCategory').mockResolvedValue({
      id: 3,
      productCategoryName: 'Toys',
      commissionRate: 5,
    });
    const user = userEvent.setup();
    renderPage('/admin/categories/new');
    await screen.findByRole('heading', { name: 'Add Category' });

    await user.type(screen.getByLabelText('Category Name'), 'Toys');
    await user.type(screen.getByLabelText('Commission Rate (%)'), '5');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(await screen.findByText('Categories List')).toBeInTheDocument();
  });

  it('loads and pre-fills the category in edit mode', async () => {
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue(categories);
    renderPage('/admin/categories/1');

    expect(await screen.findByRole('heading', { name: 'Edit Category' })).toBeInTheDocument();
    expect(screen.getByLabelText('Category Name')).toHaveValue('Electronics');
  });

  it('updates a category and navigates back to the list on success', async () => {
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue(categories);
    vi.spyOn(adminCategoryService, 'updateCategory').mockResolvedValue({
      id: 1,
      productCategoryName: 'Electronics & Gadgets',
      commissionRate: 4,
    });
    const user = userEvent.setup();
    renderPage('/admin/categories/1');
    await screen.findByRole('heading', { name: 'Edit Category' });

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Categories List')).toBeInTheDocument();
  });

  it('shows an error state when the category id is not found in the list', async () => {
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue(categories);
    renderPage('/admin/categories/999');

    expect(await screen.findByText('Category not found.')).toBeInTheDocument();
  });

  it('shows an error state when loading categories fails in edit mode', async () => {
    vi.spyOn(adminCategoryService, 'getCategories').mockRejectedValue({ message: 'Failed to load category.' });
    renderPage('/admin/categories/1');

    expect(await screen.findByText('Failed to load category.')).toBeInTheDocument();
  });
});
