import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TrendingPage from './TrendingPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

describe('TrendingPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the Trending Finds title and seeds the trending filter', async () => {
    render(
      <MemoryRouter initialEntries={['/trending']}>
        <CompareProvider>
          <TrendingPage />
        </CompareProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Trending Finds' })).toBeInTheDocument();
    expect(productService.searchProducts).toHaveBeenCalledWith(expect.objectContaining({ trending: true }));
  });
});
