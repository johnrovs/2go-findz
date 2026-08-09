import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AffiliateDisclosurePage from './AffiliateDisclosurePage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';

describe('AffiliateDisclosurePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the configured affiliate disclosure text', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Custom disclosure copy.' });
    render(
      <MemoryRouter>
        <CompareProvider>
          <AffiliateDisclosurePage />
        </CompareProvider>
      </MemoryRouter>
    );
    const main = screen.getByRole('main');
    expect(await within(main).findByText('Custom disclosure copy.')).toBeInTheDocument();
  });
});
