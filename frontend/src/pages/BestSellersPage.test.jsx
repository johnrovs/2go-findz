import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BestSellersPage from './BestSellersPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

describe('BestSellersPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the Best Sellers title and seeds the bestSeller filter', async () => {
    render(
      <MemoryRouter initialEntries={['/best-sellers']}>
        <CompareProvider>
          <BestSellersPage />
        </CompareProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Best Sellers' })).toBeInTheDocument();
    expect(productService.searchProducts).toHaveBeenCalledWith(expect.objectContaining({ bestSeller: true }));
  });
});
