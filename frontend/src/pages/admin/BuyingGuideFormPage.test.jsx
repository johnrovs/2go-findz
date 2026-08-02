import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuideFormPage from './BuyingGuideFormPage.jsx';
import { ToastProvider } from '../../context/ToastContext.jsx';
import * as adminBuyingGuideService from '../../services/adminBuyingGuideService.js';
import * as adminCategoryService from '../../services/adminCategoryService.js';
import * as settingsService from '../../services/settingsService.js';

vi.mock('../../components/buying-guide-form/IntroductionEditor.jsx', () => ({
  default: ({ value, onChange }) => (
    <textarea aria-label="Introduction" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

function renderPage(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <Routes>
          <Route path="/admin/buying-guides/new" element={<BuyingGuideFormPage />} />
          <Route path="/admin/buying-guides/:id" element={<BuyingGuideFormPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('BuyingGuideFormPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue([{ id: 1, productCategoryName: 'Kitchen' }]);
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Disclosure.' });
  });

  it('renders the create form with an empty title', () => {
    renderPage(['/admin/buying-guides/new']);
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('loads and pre-fills the edit form', async () => {
    vi.spyOn(adminBuyingGuideService, 'getBuyingGuideById').mockResolvedValue({
      id: 7,
      title: 'Existing Guide',
      slug: 'existing-guide',
      excerpt: 'Existing excerpt.',
      introduction: '<p>Intro</p>',
      coverImageFilename: null,
      categoryId: 1,
      seoTitle: null,
      seoDescription: null,
      active: true,
      scheduledPublishAt: null,
      recommendedProducts: [],
      quickRecommendations: [],
      comparisonSpecs: [],
      recommendationSections: [],
      faqs: [],
      tocEntries: [],
    });
    renderPage(['/admin/buying-guides/7']);

    expect(await screen.findByLabelText('Title')).toHaveValue('Existing Guide');
  });

  it('creates a guide and submits via adminBuyingGuideService on Save as Draft', async () => {
    vi.spyOn(adminBuyingGuideService, 'createBuyingGuide').mockResolvedValue({ id: 1 });
    const user = userEvent.setup();
    renderPage(['/admin/buying-guides/new']);

    await user.type(screen.getByLabelText('Title'), 'New Guide');
    await user.type(screen.getByLabelText('Excerpt'), 'New excerpt.');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Introduction'), 'Intro text.');
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(adminBuyingGuideService.createBuyingGuide).toHaveBeenCalled());
  });
});
