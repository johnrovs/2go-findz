import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusBadge from './StatusBadge.jsx';

describe('StatusBadge', () => {
  it('renders trending with the warning color classes', () => {
    render(<StatusBadge variant="trending">Trending</StatusBadge>);
    expect(screen.getByText('Trending')).toHaveClass('text-warning');
  });

  it('renders bestSeller with the success color classes', () => {
    render(<StatusBadge variant="bestSeller">Best Seller</StatusBadge>);
    expect(screen.getByText('Best Seller')).toHaveClass('text-success');
  });

  it('renders scheduled and published with the info color classes', () => {
    render(<StatusBadge variant="scheduled">Scheduled</StatusBadge>);
    expect(screen.getByText('Scheduled')).toHaveClass('text-info');

    render(<StatusBadge variant="published">Published</StatusBadge>);
    expect(screen.getByText('Published')).toHaveClass('text-info');
  });

  it('renders inactive with the muted color classes', () => {
    render(<StatusBadge variant="inactive">Inactive</StatusBadge>);
    expect(screen.getByText('Inactive')).toHaveClass('text-muted');
  });
});
