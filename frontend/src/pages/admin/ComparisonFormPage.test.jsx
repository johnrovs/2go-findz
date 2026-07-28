import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonFormPage from './ComparisonFormPage.jsx';
import { ToastProvider } from '../../context/ToastContext.jsx';
import * as adminComparisonService from '../../services/adminComparisonService.js';
import * as adminCategoryService from '../../services/adminCategoryService.js';

function renderPage(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <Routes>
          <Route path="/admin/comparisons/new" element={<ComparisonFormPage />} />
          <Route path="/admin/comparisons/:id" element={<ComparisonFormPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ComparisonFormPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue([
      { id: 1, productCategoryName: 'Electronics' },
    ]);
  });

  it('renders the create form with an empty title', () => {
    renderPage(['/admin/comparisons/new']);
    expect(screen.getByRole('heading', { name: 'Add Comparison' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('loads and pre-fills the edit form', async () => {
    vi.spyOn(adminComparisonService, 'getComparisonById').mockResolvedValue({
      id: 7,
      title: 'Existing Comparison',
      slug: 'existing-comparison',
      description: 'Existing description.',
      coverImageFilename: null,
      categoryId: 1,
      seoTitle: '',
      seoDescription: '',
      published: true,
      products: [],
      specRows: [],
      sections: [],
      faqs: [],
      relatedComparisons: [],
      relatedProducts: [],
    });
    renderPage(['/admin/comparisons/7']);

    expect(await screen.findByRole('heading', { name: 'Edit Comparison' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Existing Comparison');
  });
});
