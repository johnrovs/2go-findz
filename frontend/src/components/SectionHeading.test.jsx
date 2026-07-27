import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SectionHeading from './SectionHeading.jsx';

describe('SectionHeading', () => {
  it('renders the title', () => {
    render(<SectionHeading title="Featured Products" />);
    expect(screen.getByRole('heading', { name: 'Featured Products' })).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(<SectionHeading title="Categories" description="Browse by category." />);
    expect(screen.getByText('Browse by category.')).toBeInTheDocument();
  });

  it('omits the description paragraph when none is provided', () => {
    render(<SectionHeading title="Categories" />);
    expect(screen.queryByText('Browse by category.')).not.toBeInTheDocument();
  });
});
