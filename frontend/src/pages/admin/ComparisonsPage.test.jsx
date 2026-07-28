import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonsPage from './ComparisonsPage.jsx';
import { ToastProvider } from '../../context/ToastContext.jsx';
import * as adminComparisonService from '../../services/adminComparisonService.js';

const comparison = {
  id: 1,
  title: 'Best Portable Blenders Compared',
  categoryName: 'Kitchen',
  coverImageFilename: null,
  published: true,
  createdAt: '2026-07-20T10:00:00',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ComparisonsPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ComparisonsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the list of comparisons', async () => {
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([comparison]);
    renderPage();

    expect(await screen.findByText('Best Portable Blenders Compared')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('shows an empty state when there are no comparisons', async () => {
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No comparisons found')).toBeInTheDocument();
  });

  it('deletes a comparison via the confirm dialog', async () => {
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([comparison]);
    vi.spyOn(adminComparisonService, 'deleteComparison').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Best Portable Blenders Compared');
    await user.click(screen.getByRole('button', { name: 'Delete Best Portable Blenders Compared' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(adminComparisonService.deleteComparison).toHaveBeenCalledWith(1));
  });
});
