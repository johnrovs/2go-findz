import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TermsOfUsePage from './TermsOfUsePage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';

describe('TermsOfUsePage', () => {
  it('renders the Terms of Use heading and real content', () => {
    render(
      <MemoryRouter>
        <CompareProvider>
          <TermsOfUsePage />
        </CompareProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeInTheDocument();
    expect(screen.getByText(/not affiliated with, endorsed by, or sponsored by amazon/i)).toBeInTheDocument();
  });
});
