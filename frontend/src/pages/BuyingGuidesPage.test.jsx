import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuidesPage from './BuyingGuidesPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as buyingGuideService from '../services/buyingGuideService.js';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';

const guide = {
  id: 1,
  title: 'Best Kitchen Gadgets 2026',
  excerpt: 'A quick roundup of our favorite kitchen gadgets.',
  coverImageFilename: null,
  createdAt: '2026-07-20T10:00:00',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <CompareProvider>
        <BuyingGuidesPage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('BuyingGuidesPage (public)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
  });

  it('renders fetched guide cards', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuides').mockResolvedValue([guide]);
    renderPage();

    expect(await screen.findByText('Best Kitchen Gadgets 2026')).toBeInTheDocument();
    expect(screen.getByText('A quick roundup of our favorite kitchen gadgets.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Best Kitchen Gadgets 2026/ })).toHaveAttribute(
      'href',
      '/buying-guides/1'
    );
  });

  it('shows an empty state when there are no guides', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuides').mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No buying guides yet')).toBeInTheDocument();
  });

  it('shows an error state when fetching fails', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuides').mockRejectedValue({
      message: 'Network error. Please try again.',
    });
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();
  });
});
