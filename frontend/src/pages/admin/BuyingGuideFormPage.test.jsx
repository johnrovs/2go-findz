import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuideFormPage from './BuyingGuideFormPage.jsx';
import { ToastProvider } from '../../context/ToastContext.jsx';
import * as adminBuyingGuideService from '../../services/adminBuyingGuideService.js';

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
  });

  it('renders the create form with an empty title', () => {
    renderPage(['/admin/buying-guides/new']);
    expect(screen.getByRole('heading', { name: 'Add Buying Guide' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('loads and pre-fills the edit form', async () => {
    vi.spyOn(adminBuyingGuideService, 'getBuyingGuideById').mockResolvedValue({
      id: 7,
      title: 'Existing Guide',
      excerpt: 'Existing excerpt.',
      content: 'Existing content.',
      coverImageFilename: null,
      active: true,
      recommendedProducts: [],
    });
    renderPage(['/admin/buying-guides/7']);

    expect(await screen.findByRole('heading', { name: 'Edit Buying Guide' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Existing Guide');
  });

  it('creates a guide and submits via adminBuyingGuideService on save', async () => {
    vi.spyOn(adminBuyingGuideService, 'createBuyingGuide').mockResolvedValue({ id: 1 });
    const user = userEvent.setup();
    renderPage(['/admin/buying-guides/new']);

    await user.type(screen.getByLabelText('Title'), 'New Guide');
    await user.type(screen.getByLabelText('Excerpt'), 'Excerpt.');
    await user.type(screen.getByLabelText('Content'), 'Content.');
    await user.click(screen.getByRole('button', { name: 'Add Guide' }));

    await waitFor(() => expect(adminBuyingGuideService.createBuyingGuide).toHaveBeenCalled());
  });
});
