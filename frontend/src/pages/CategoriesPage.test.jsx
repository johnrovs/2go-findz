import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the category card grid and the catalog title', async () => {
    renderPage();

    expect(await screen.findByText('Shop by Category')).toBeInTheDocument();
    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
  });

  it('filters the catalog to the clicked category', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Shop by Category');

    await user.click(screen.getByRole('link', { name: 'Electronics' }));

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: '1' }))
    );
  });

  it('does not render a redundant "View all" link on the Categories page itself', async () => {
    renderPage();
    await screen.findByText('Shop by Category');

    expect(screen.queryByRole('link', { name: /view all/i })).not.toBeInTheDocument();
  });
});
