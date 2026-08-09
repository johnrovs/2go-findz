import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import AboutPage from './AboutPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';

describe('AboutPage', () => {
  it('renders the About Us heading and real content', () => {
    render(
      <MemoryRouter>
        <CompareProvider>
          <AboutPage />
        </CompareProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'About Us' })).toBeInTheDocument();
    expect(screen.getByText(/curated amazon affiliate storefront/i)).toBeInTheDocument();
  });
});
