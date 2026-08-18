import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import QuickActionsCard from './QuickActionsCard.jsx';

function renderCard() {
  return render(
    <MemoryRouter>
      <QuickActionsCard />
    </MemoryRouter>
  );
}

describe('QuickActionsCard', () => {
  it('renders the title', () => {
    renderCard();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders all four action links with the correct hrefs', () => {
    renderCard();
    expect(screen.getByRole('link', { name: /Add Product/ })).toHaveAttribute('href', '/products/new');
    expect(screen.getByRole('link', { name: /Add Buying Guide/ })).toHaveAttribute(
      'href',
      '/buying-guides/new'
    );
    expect(screen.getByRole('link', { name: /Add Comparison/ })).toHaveAttribute(
      'href',
      '/comparisons/new'
    );
    expect(screen.getByRole('link', { name: /Manage Categories/ })).toHaveAttribute('href', '/categories');
  });
});
