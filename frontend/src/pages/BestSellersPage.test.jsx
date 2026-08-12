import { render, screen, within } from '@testing-library/react';
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
    vi.spyOn(productService, 'getBrands').mockResolvedValue([]);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the Best Sellers title, description, and breadcrumb', async () => {
    render(
      <MemoryRouter initialEntries={['/best-sellers']}>
        <CompareProvider>
          <BestSellersPage />
        </CompareProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Best Sellers' })).toBeInTheDocument();
    expect(screen.getByText('Our most popular picks.')).toBeInTheDocument();
    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(breadcrumb).getByText('Best Sellers')).toBeInTheDocument();
  });

  it('seeds a fixed bestSeller filter on every request', async () => {
    render(
      <MemoryRouter initialEntries={['/best-sellers']}>
        <CompareProvider>
          <BestSellersPage />
        </CompareProvider>
      </MemoryRouter>
    );

    await screen.findByRole('heading', { level: 1, name: 'Best Sellers' });
    expect(productService.searchProducts).toHaveBeenCalledWith(expect.objectContaining({ bestSeller: true }));
  });
});
