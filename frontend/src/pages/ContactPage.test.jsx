import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ContactPage from './ContactPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';

function renderPage() {
  return render(
    <MemoryRouter>
      <CompareProvider>
        <ContactPage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('ContactPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a mailto link when a contact email is configured', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ contactEmail: 'hello@2gofindz.com' });
    renderPage();
    const main = screen.getByRole('main');
    expect(await within(main).findByRole('link', { name: 'hello@2gofindz.com' })).toHaveAttribute(
      'href',
      'mailto:hello@2gofindz.com'
    );
  });

  it('shows an honest message when no contact email is configured', async () => {
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    renderPage();
    expect(await screen.findByText(/hasn't been configured yet/i)).toBeInTheDocument();
  });
});
