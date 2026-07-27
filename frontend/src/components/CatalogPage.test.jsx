import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CatalogPage from './CatalogPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

const settings = { affiliateDisclosure: 'As an Amazon Associate...' };
const categories = [{ id: 1, productCategoryName: 'Electronics' }];
const product = {
  id: 1,
  name: 'Wireless Earbuds',
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/example',
  trending: true,
  bestSeller: false,
  active: true,
  createdAt: '2026-07-20T10:00:00',
};

function renderCatalog(props, initialEntries = ['/trending']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <CatalogPage title="Trending Finds" {...props} />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(settings);
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(categories);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [product],
      totalPages: 1,
      totalElements: 1,
    });
  });

  it('renders the title and fetched products', async () => {
    renderCatalog();
    expect(await screen.findByRole('heading', { name: 'Trending Finds' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Wireless Earbuds').length).toBeGreaterThan(0));
  });

  it('seeds the filter from initialFilter when the URL has no filter param', async () => {
    renderCatalog({ initialFilter: 'trending' });

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ trending: true }))
    );
  });

  it('does not override an explicit URL filter with initialFilter', async () => {
    renderCatalog({ initialFilter: 'trending' }, ['/trending?filter=bestSeller']);

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ bestSeller: true }))
    );
    const lastCallParams = productService.searchProducts.mock.calls.at(-1)[0];
    expect(lastCallParams.trending).toBeUndefined();
  });

  it('seeds the category from initialCategoryId when the URL has no category param', async () => {
    renderCatalog({ initialCategoryId: 1 });

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: '1' }))
    );
  });

  it('renders children between the navbar and the catalog section', async () => {
    renderCatalog({ children: <div>Extra Content</div> });
    expect(await screen.findByText('Extra Content')).toBeInTheDocument();
  });
});
