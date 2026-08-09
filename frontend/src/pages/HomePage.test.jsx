import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomePage from './HomePage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';
import * as trackingService from '../services/trackingService.js';

const settings = {
  heroHeadline: 'Smart Finds. Better Buys. All in One Place.',
  heroDescription: 'Discover trending Amazon products.',
  affiliateDisclosure: 'As an Amazon Associate, 2Go Findz may earn from qualifying purchases.',
  tiktokUrl: 'https://tiktok.com/@2gofindz',
};

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

const product = {
  id: 1,
  name: 'Wireless Earbuds',
  description: 'Compact wireless earbuds.',
  categoryId: 1,
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/example',
  trending: true,
  bestSeller: true,
  active: true,
  createdAt: '2026-07-20T10:00:00',
};

function renderHomePage(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <HomePage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(settings);
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(categories);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [product],
      totalPages: 1,
      totalElements: 1,
    });
    vi.spyOn(trackingService, 'recordView').mockResolvedValue({ sessionId: 'session-abc' });
  });

  it('renders the hero headline as the single h1', async () => {
    renderHomePage();
    expect(await screen.findByRole('heading', { level: 1, name: settings.heroHeadline })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders the section headings in the reference order', async () => {
    renderHomePage();

    await waitFor(() => {
      const sectionHeadings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
      expect(sectionHeadings).toEqual([
        'Featured Products',
        'Trending Right Now',
        'Best Sellers',
        'Shop by Category',
        'Browse All Products',
      ]);
    });
  });

  it('renders the social strip from settings', async () => {
    renderHomePage();
    const main = screen.getByRole('main');
    expect(await within(main).findByRole('link', { name: /tiktok/i })).toHaveAttribute('href', settings.tiktokUrl);
  });

  it('renders fetched products inside the Featured Products carousel', async () => {
    renderHomePage();
    await waitFor(() => expect(screen.getAllByText('Wireless Earbuds').length).toBeGreaterThan(0));
  });

  it('renders the Browse All Products banner linking to /products', async () => {
    renderHomePage();
    expect(await screen.findByRole('link', { name: 'Browse All Products' })).toHaveAttribute('href', '/products');
  });

  it('records a website view exactly once per session on mount', async () => {
    renderHomePage();
    await waitFor(() => expect(trackingService.recordView).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem('sessionId')).toBe('session-abc');
  });

  it('does not record a second view when a session already exists', async () => {
    sessionStorage.setItem('sessionId', 'existing-session');
    renderHomePage();

    await screen.findByRole('heading', { level: 1, name: settings.heroHeadline });
    expect(trackingService.recordView).not.toHaveBeenCalled();
  });

  it('renders the affiliate disclosure in the footer', async () => {
    renderHomePage();
    expect(await screen.findByText(settings.affiliateDisclosure)).toBeInTheDocument();
  });
});
