import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuidesPage from './BuyingGuidesPage.jsx';
import { ToastProvider } from '../../context/ToastContext.jsx';
import * as adminBuyingGuideService from '../../services/adminBuyingGuideService.js';

const guide = {
  id: 1,
  title: 'Best Kitchen Gadgets 2026',
  excerpt: 'A quick roundup.',
  coverImageFilename: null,
  active: true,
  createdAt: '2026-07-20T10:00:00',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <BuyingGuidesPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('BuyingGuidesPage (admin)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the list of buying guides', async () => {
    vi.spyOn(adminBuyingGuideService, 'getBuyingGuides').mockResolvedValue([guide]);
    renderPage();

    expect(await screen.findByText('Best Kitchen Gadgets 2026')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('shows an empty state when there are no guides', async () => {
    vi.spyOn(adminBuyingGuideService, 'getBuyingGuides').mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No buying guides found')).toBeInTheDocument();
  });

  it('deletes a guide via the confirm dialog', async () => {
    vi.spyOn(adminBuyingGuideService, 'getBuyingGuides').mockResolvedValue([guide]);
    vi.spyOn(adminBuyingGuideService, 'deleteBuyingGuide').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Best Kitchen Gadgets 2026');
    await user.click(screen.getByRole('button', { name: 'Delete Best Kitchen Gadgets 2026' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(adminBuyingGuideService.deleteBuyingGuide).toHaveBeenCalledWith(1));
  });
});
