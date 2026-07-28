import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuideDetailPage from './BuyingGuideDetailPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as buyingGuideService from '../services/buyingGuideService.js';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';

const guide = {
  id: 1,
  title: 'Best Kitchen Gadgets 2026',
  content: 'Full article body content here.',
  coverImageFilename: null,
  createdAt: '2026-07-20T10:00:00',
  recommendedProducts: [
    {
      id: 10,
      name: 'Wireless Earbuds',
      categoryName: 'Electronics',
      imageFileName: null,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: false,
    },
  ],
};

function renderPage(initialEntries = ['/buying-guides/1']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <Routes>
          <Route path="/buying-guides/:id" element={<BuyingGuideDetailPage />} />
        </Routes>
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('BuyingGuideDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
  });

  it('renders the guide content and recommended products', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideById').mockResolvedValue(guide);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Best Kitchen Gadgets 2026', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Full article body content here.')).toBeInTheDocument();
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
  });

  it('shows an error state when the guide is not found', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideById').mockRejectedValue({
      message: 'Buying guide not found.',
    });
    renderPage();

    expect(await screen.findByText('Buying guide not found.')).toBeInTheDocument();
  });
});
