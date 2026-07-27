import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Footer from './Footer.jsx';

describe('Footer', () => {
  it('renders the affiliate disclosure text from settings', () => {
    render(<Footer settings={{ affiliateDisclosure: 'Custom disclosure text.' }} />);
    expect(screen.getByText('Custom disclosure text.')).toBeInTheDocument();
  });

  it('falls back to the default disclosure text when settings has none', () => {
    render(<Footer settings={null} />);
    expect(
      screen.getByText(/as an amazon associate, 2go findz may earn from qualifying purchases/i)
    ).toBeInTheDocument();
  });

  it('renders a mailto link for the configured contact email', () => {
    render(<Footer settings={{ contactEmail: 'hello@2gofindz.com' }} />);
    expect(screen.getByRole('link', { name: 'hello@2gofindz.com' })).toHaveAttribute(
      'href',
      'mailto:hello@2gofindz.com'
    );
  });
});
