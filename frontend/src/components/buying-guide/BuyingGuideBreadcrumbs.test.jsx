import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BuyingGuideBreadcrumbs from './BuyingGuideBreadcrumbs.jsx';

function renderBreadcrumbs(title) {
  return render(
    <MemoryRouter>
      <BuyingGuideBreadcrumbs title={title} />
    </MemoryRouter>
  );
}

describe('BuyingGuideBreadcrumbs', () => {
  it('links Home and Buying Guides', () => {
    renderBreadcrumbs('Best Wireless Earbuds Under $100');

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toHaveAttribute('href', '/buying-guides');
  });

  it('marks the guide title as the current page, not a link', () => {
    renderBreadcrumbs('Best Wireless Earbuds Under $100');

    const current = screen.getByText('Best Wireless Earbuds Under $100');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).not.toBe('A');
  });

  it('uses a nav landmark with an accessible name', () => {
    renderBreadcrumbs('Guide Title');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });
});
