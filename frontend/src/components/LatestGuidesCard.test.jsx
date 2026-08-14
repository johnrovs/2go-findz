import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import LatestGuidesCard from './LatestGuidesCard.jsx';

const guides = [
  {
    id: 1,
    title: 'Best Wireless Earbuds Under $100',
    coverImageFilename: null,
    active: true,
    createdAt: '2026-06-01T00:00:00',
    views: 1240,
  },
  {
    id: 2,
    title: 'Ultimate Kitchen Gadget Guide',
    coverImageFilename: null,
    active: false,
    createdAt: '2026-05-20T00:00:00',
    views: 0,
  },
];

function renderCard(props) {
  return render(
    <MemoryRouter>
      <LatestGuidesCard {...props} />
    </MemoryRouter>
  );
}

describe('LatestGuidesCard', () => {
  it('renders the title and a View all link to /admin/buying-guides', () => {
    renderCard({ guides });
    expect(screen.getByText('Latest Guides')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/admin/buying-guides');
  });

  it('renders each guide title, views, and status badge', () => {
    renderCard({ guides });
    expect(screen.getByText('Best Wireless Earbuds Under $100')).toBeInTheDocument();
    expect(screen.getByText('1,240')).toBeInTheDocument();
    expect(screen.getByText('Ultimate Kitchen Gadget Guide')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows an empty state when there are no guides', () => {
    renderCard({ guides: [] });
    expect(screen.getByText('No guides yet')).toBeInTheDocument();
  });
});
