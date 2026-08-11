import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductsTrustStrip from './ProductsTrustStrip.jsx';

describe('ProductsTrustStrip', () => {
  it('renders all four trust columns with their titles', () => {
    render(<ProductsTrustStrip />);
    expect(screen.getByText('Curated with Care')).toBeInTheDocument();
    expect(screen.getByText('Honest & Unbiased')).toBeInTheDocument();
    expect(screen.getByText('Save Time & Money')).toBeInTheDocument();
    expect(screen.getByText('Safe & Secure')).toBeInTheDocument();
  });

  it('renders exactly 4 columns', () => {
    render(<ProductsTrustStrip />);
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });
});
