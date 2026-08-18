import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AffiliateDisclosure from './AffiliateDisclosure.jsx';

describe('AffiliateDisclosure', () => {
  it('renders the given text', () => {
    render(<AffiliateDisclosure text="Custom disclosure text." />);
    expect(screen.getByText('Custom disclosure text.')).toBeInTheDocument();
  });

  it('falls back to the default disclosure text when no text is given', () => {
    render(<AffiliateDisclosure text={undefined} />);
    expect(
      screen.getByText(/as an amazon associate, 2go findz may earn from qualifying purchases/i)
    ).toBeInTheDocument();
  });

  it('accepts a className override for reuse on dark backgrounds, defaulting to the light style', () => {
    const { rerender } = render(<AffiliateDisclosure text="Custom text." />);
    expect(screen.getByText('Custom text.')).toHaveClass('text-slate-500');

    rerender(<AffiliateDisclosure text="Custom text." className="text-white/60" />);
    expect(screen.getByText('Custom text.')).toHaveClass('text-white/60');
    expect(screen.getByText('Custom text.')).not.toHaveClass('text-slate-500');
  });
});
