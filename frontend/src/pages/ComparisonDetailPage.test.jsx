import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonDetailPage from './ComparisonDetailPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as comparisonService from '../services/comparisonService.js';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';

const fullComparison = {
  id: 1,
  title: 'Best Portable Blenders Compared',
  slug: 'best-portable-blenders-compared',
  description: 'Compare features and find the best portable blender for your needs.',
  coverImageFilename: null,
  categoryName: 'Kitchen',
  seoTitle: null,
  seoDescription: null,
  createdAt: '2026-07-20T10:00:00',
  products: [
    {
      id: 101,
      product: {
        id: 10,
        name: 'BlendJet 2',
        imageFileName: null,
        productLink: 'https://amazon.com/dp/blendjet2',
      },
      badge: 'Best Overall',
      recommendation: 'Great all-around portable blender.',
      bestFor: 'Daily smoothies',
      mainStrength: 'Portability',
      mainWeakness: 'Battery life',
      pros: 'Compact\nEasy to clean',
      cons: 'Small capacity',
      editorsScore: 8.5,
    },
    {
      id: 102,
      product: {
        id: 20,
        name: 'Hamilton Beach Portable',
        imageFileName: null,
        productLink: 'https://amazon.com/dp/hamiltonbeach',
      },
      badge: null,
      recommendation: 'Solid budget pick.',
      bestFor: 'Budget shoppers',
      mainStrength: 'Price',
      mainWeakness: 'Noise',
      pros: null,
      cons: null,
      editorsScore: null,
    },
  ],
  specRows: [
    {
      id: 201,
      groupLabel: 'Performance',
      rowLabel: 'Capacity',
      values: [
        { productId: 10, value: '16 oz', tier: 'BEST' },
        { productId: 20, value: '20 oz', tier: 'GOOD' },
      ],
    },
  ],
  sections: [{ id: 301, heading: 'Buying Tips', body: 'Consider your daily usage before buying.' }],
  faqs: [{ id: 401, question: 'Which is better?', answer: 'It depends on your budget.' }],
  relatedComparisons: [
    { id: 2, title: 'Best Countertop Blenders', slug: 'best-countertop-blenders', coverImageFilename: null },
  ],
  relatedProducts: [
    {
      id: 30,
      name: 'Nutribullet Pro',
      categoryName: 'Kitchen',
      imageFileName: null,
      productLink: 'https://amazon.com/dp/nutribullet',
      trending: false,
      bestSeller: false,
    },
  ],
};

function renderPage(initialEntries = ['/comparisons/best-portable-blenders-compared']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <Routes>
          <Route path="/comparisons/:slug" element={<ComparisonDetailPage />} />
        </Routes>
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('ComparisonDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
  });

  it('renders all populated sections', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('16 oz')).toBeInTheDocument();
    expect(screen.getAllByText('BlendJet 2').length).toBeGreaterThan(0);
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
    expect(screen.getByText('Compact')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'View on Amazon' })).toHaveLength(3);
    expect(screen.getByText('Buying Tips')).toBeInTheDocument();
    expect(screen.getByText('Which is better?')).toBeInTheDocument();
    expect(screen.getByText('Best Countertop Blenders')).toBeInTheDocument();
    expect(screen.getByText('Nutribullet Pro')).toBeInTheDocument();
  });

  it('sets the document title and injects JSON-LD for breadcrumb and FAQ', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    expect(document.title).toBe('Best Portable Blenders Compared | 2Go Findz');

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(2);
    const types = Array.from(scripts).map((script) => JSON.parse(script.textContent)['@type']);
    expect(types).toEqual(['BreadcrumbList', 'FAQPage']);
  });

  it('omits the FAQPage schema when there are no FAQs', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue({ ...fullComparison, faqs: [] });
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const types = Array.from(scripts).map((script) => JSON.parse(script.textContent)['@type']);
    expect(types).toEqual(['BreadcrumbList']);
  });

  it('applies tier-based styling to spec table cells', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    expect(await screen.findByText('16 oz')).toHaveClass('bg-emerald-50');
    expect(screen.getByText('20 oz')).toHaveClass('bg-amber-50');
  });

  it('omits the comparison table, sections, FAQ, and related regions when their data is empty', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue({
      ...fullComparison,
      specRows: [],
      sections: [],
      faqs: [],
      relatedComparisons: [],
      relatedProducts: [],
    });
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 })
    ).toBeInTheDocument();
    expect(screen.queryByText('Comparison Table')).not.toBeInTheDocument();
    expect(screen.queryByText('Buying Tips')).not.toBeInTheDocument();
    expect(screen.queryByText('Frequently Asked Questions')).not.toBeInTheDocument();
    expect(screen.queryByText('Related Comparisons')).not.toBeInTheDocument();
    expect(screen.queryByText('Related Products')).not.toBeInTheDocument();
  });

  it('renders a sticky section nav with links to the fixed regions', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    const nav = screen.getByRole('navigation', { name: 'Comparison sections' });
    expect(within(nav).getByRole('link', { name: 'Comparison Table' })).toHaveAttribute(
      'href',
      '#comparison-table'
    );
    expect(within(nav).getByRole('link', { name: 'Product Breakdown' })).toHaveAttribute(
      'href',
      '#product-breakdown'
    );
    expect(within(nav).getByRole('link', { name: 'FAQ' })).toHaveAttribute('href', '#faq');
  });

  it('omits the Comparison Table and FAQ nav links when those regions are empty', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue({
      ...fullComparison,
      specRows: [],
      faqs: [],
    });
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    const nav = screen.getByRole('navigation', { name: 'Comparison sections' });
    expect(within(nav).queryByRole('link', { name: 'Comparison Table' })).not.toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Product Breakdown' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'FAQ' })).not.toBeInTheDocument();
  });

  it('hides FAQ answers until their question is clicked', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Which is better?');
    expect(screen.queryByText('It depends on your budget.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Which is better?' }));
    expect(screen.getByText('It depends on your budget.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Which is better?' }));
    expect(screen.queryByText('It depends on your budget.')).not.toBeInTheDocument();
  });

  it('applies print-friendly styling to the Amazon CTA and comparison table', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    expect(screen.getAllByRole('link', { name: 'View on Amazon' })[0]).toHaveClass('print:hidden');
    expect(screen.getByRole('table').parentElement).toHaveClass('print:overflow-visible');
  });

  it('lazy-loads product breakdown images', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockResolvedValue(fullComparison);
    renderPage();

    await screen.findByRole('heading', { name: 'Best Portable Blenders Compared', level: 1 });
    expect(screen.getByAltText('BlendJet 2')).toHaveAttribute('loading', 'lazy');
  });

  it('shows an error state when the comparison is not found', async () => {
    vi.spyOn(comparisonService, 'getComparisonBySlug').mockRejectedValue({
      message: 'Comparison not found.',
    });
    renderPage();

    expect(await screen.findByText('Comparison not found.')).toBeInTheDocument();
  });
});
