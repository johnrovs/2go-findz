import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EmptyState from './EmptyState.jsx';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState title="No products found" description="Try adjusting your search or filters." />);
    expect(screen.getByText('No products found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search or filters.')).toBeInTheDocument();
  });

  it('renders without a description when none is given', () => {
    render(<EmptyState title="No products found" />);
    expect(screen.getByText('No products found')).toBeInTheDocument();
  });

  it('renders optional action children below the description', () => {
    render(
      <EmptyState title="No products found" description="Try adjusting your search or filters.">
        <button type="button">Clear Filters</button>
      </EmptyState>
    );
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
  });
});
