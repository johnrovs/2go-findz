import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonsPage from './ComparisonsPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as comparisonService from '../services/comparisonService.js';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';

const comparison = {
  id: 1,
  slug: 'best-portable-blenders-compared',
  title: 'Best Portable Blenders Compared',
  description: 'Compare features, strengths, weaknesses, and find the best portable blender for your needs.',
  coverImageFilename: null,
  categoryName: 'Kitchen',
  createdAt: '2026-07-20T10:00:00',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <CompareProvider>
        <ComparisonsPage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('ComparisonsPage (public)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
  });

  it('renders fetched comparison cards', async () => {
    vi.spyOn(comparisonService, 'getComparisons').mockResolvedValue([comparison]);
    renderPage();

    expect(await screen.findByText('Best Portable Blenders Compared')).toBeInTheDocument();
    expect(screen.getByText(comparison.description)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Best Portable Blenders Compared/ })).toHaveAttribute(
      'href',
      '/comparisons/best-portable-blenders-compared'
    );
  });

  it('sets the page title', async () => {
    vi.spyOn(comparisonService, 'getComparisons').mockResolvedValue([]);
    renderPage();

    await screen.findByText('No comparisons yet');
    expect(document.title).toBe('Comparisons | 2Go Findz');
  });

  it('shows an empty state when there are no comparisons', async () => {
    vi.spyOn(comparisonService, 'getComparisons').mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No comparisons yet')).toBeInTheDocument();
  });

  it('shows an error state when fetching fails', async () => {
    vi.spyOn(comparisonService, 'getComparisons').mockRejectedValue({
      message: 'Network error. Please try again.',
    });
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();
  });

  it('renders the shared public footer with real company links', async () => {
    renderPage();
    expect(await screen.findByRole('link', { name: 'Affiliate Disclosure' })).toHaveAttribute(
      'href',
      '/affiliate-disclosure'
    );
  });
});
