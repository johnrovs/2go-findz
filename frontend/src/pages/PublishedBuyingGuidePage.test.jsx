import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PublishedBuyingGuidePage from './PublishedBuyingGuidePage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as buyingGuideService from '../services/buyingGuideService.js';
import * as settingsService from '../services/settingsService.js';

function fullGuide(overrides = {}) {
  return {
    id: 3,
    title: 'Best Wireless Earbuds Under $100',
    slug: 'best-wireless-earbuds-under-100',
    excerpt: 'A curated guide to the best budget wireless earbuds.',
    introduction: '<p>Intro.</p>',
    coverImageFilename: null,
    categoryName: 'Electronics',
    seoTitle: null,
    seoDescription: null,
    createdAt: '2026-05-01T10:00:00',
    updatedAt: '2026-05-28T10:00:00',
    publishedAt: '2026-05-01T10:00:00',
    recommendedProducts: [],
    quickRecommendations: [
      {
        product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: 69.99, productLink: 'https://amazon.com/dp/B00A', rating: 4.5, reviewCount: 12850 },
        badgeName: 'Best Overall',
      },
    ],
    comparisonTable: null,
    topPick: {
      product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: 69.99, productLink: 'https://amazon.com/dp/B00A', rating: 4.5, reviewCount: 12850 },
      recommendationType: 'TOP_PICK',
      sectionLabel: 'Best Overall',
      whyRecommended: '<p>Great value.</p>',
      pros: [],
      cons: [],
      bestFor: [],
      badgeName: 'Best Overall',
    },
    runnerUps: [],
    faqs: [{ question: 'Is it worth it?', answer: 'Yes.' }],
    tocEntries: [
      { sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '' },
      { sectionKey: 'TOP_PICK', title: '', content: '' },
      { sectionKey: 'FAQS', title: '', content: '' },
    ],
    focusKeyword: null,
    canonicalUrl: null,
    visibility: 'PUBLIC',
    robotsIndex: true,
    robotsFollow: true,
    openGraphTitle: null,
    openGraphDescription: null,
    openGraphImageFilename: null,
    twitterCardType: 'summary_large_image',
    ...overrides,
  };
}

function renderAtSlug(slug) {
  return render(
    <MemoryRouter initialEntries={[`/buying-guides/${slug}`]}>
      <CompareProvider>
        <Routes>
          <Route path="/buying-guides/:slug" element={<PublishedBuyingGuidePage />} />
        </Routes>
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('PublishedBuyingGuidePage', () => {
  beforeEach(() => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Disclosure.' });
  });

  it('shows a loading state, then the guide title as the page h1', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide());
    renderAtSlug('best-wireless-earbuds-under-100');

    expect(screen.getByRole('status')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { level: 1, name: 'Best Wireless Earbuds Under $100' })).toBeInTheDocument();
  });

  it('renders only sections with real data, correctly renumbered', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide());
    renderAtSlug('best-wireless-earbuds-under-100');

    expect(await screen.findByRole('heading', { name: /1\. Quick Recommendations/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /2\. Our Top Pick/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Product Comparison/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /3\. Frequently Asked Questions/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /4\. Final Recommendation/ })).toBeInTheDocument();
  });

  it('renders the breadcrumb with the real guide title', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide());
    renderAtSlug('best-wireless-earbuds-under-100');

    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText('Best Wireless Earbuds Under $100', { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });

  it('sets the document title and canonical URL from SEO fields, falling back to guide data', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide({ seoTitle: 'Custom SEO Title' }));
    renderAtSlug('best-wireless-earbuds-under-100');

    await waitFor(() => expect(document.title).toBe('Custom SEO Title'));
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toContain(
      '/buying-guides/best-wireless-earbuds-under-100'
    );
  });

  it('renders a FAQPage JSON-LD script matching the visible FAQs', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide());
    renderAtSlug('best-wireless-earbuds-under-100');

    await screen.findByRole('heading', { level: 1 });
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const faqSchema = scripts.map((s) => JSON.parse(s.textContent)).find((s) => s['@type'] === 'FAQPage');
    expect(faqSchema.mainEntity[0].name).toBe('Is it worth it?');
  });

  it('shows a not-found message when the guide is unavailable', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockRejectedValue({ message: 'Buying guide not found.' });
    renderAtSlug('missing-guide');

    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
  });

  it('hides an empty optional section instead of rendering a blank card', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideBySlug').mockResolvedValue(fullGuide({ runnerUps: [] }));
    renderAtSlug('best-wireless-earbuds-under-100');

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('heading', { name: /Runner-Ups/ })).not.toBeInTheDocument();
  });
});
