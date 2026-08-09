import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import StaticPageLayout from './StaticPageLayout.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';

function renderLayout() {
  return render(
    <MemoryRouter>
      <CompareProvider>
        <StaticPageLayout title="About Us">
          <p>Body copy.</p>
        </StaticPageLayout>
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('StaticPageLayout', () => {
  it('renders the page title as an h1 and the given content', () => {
    renderLayout();

    expect(screen.getByRole('heading', { level: 1, name: 'About Us' })).toBeInTheDocument();
    expect(screen.getByText('Body copy.')).toBeInTheDocument();
  });

  it('renders the navbar and footer', () => {
    renderLayout();

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Affiliate Disclosure' })).toBeInTheDocument();
  });
});
