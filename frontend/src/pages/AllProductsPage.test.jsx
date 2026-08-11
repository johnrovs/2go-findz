import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AllProductsPage from './AllProductsPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

describe('AllProductsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Disclosure.' });
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
    vi.spyOn(productService, 'getBrands').mockResolvedValue([]);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the Browse All Products page via BrowseProductsPage', async () => {
    render(
      <MemoryRouter>
        <CompareProvider>
          <AllProductsPage />
        </CompareProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Browse All Products' })).toBeInTheDocument();
    expect(
      screen.getByText('Explore handpicked products from Amazon across all categories.')
    ).toBeInTheDocument();
  });
});
