import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CategoriesPage from './CategoriesPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

function renderPage(initialEntries = ['/categories']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <CategoriesPage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(categories);
    vi.spyOn(productService, 'getBrands').mockResolvedValue([]);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the Categories title, description, and breadcrumb on the Browse Products shell', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1, name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByText('Browse curated recommendations by category.')).toBeInTheDocument();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Categories')).toBeInTheDocument();
  });

  it('pre-selects the category filter from a ?category= link (e.g. from the navbar dropdown)', async () => {
    renderPage(['/categories?category=1']);

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenCalledWith(expect.objectContaining({ categoryIds: '1' }))
    );
    expect(await screen.findByRole('checkbox', { name: 'Electronics' })).toBeChecked();
  });
});
