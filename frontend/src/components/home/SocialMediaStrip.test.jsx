import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SocialMediaStrip from './SocialMediaStrip.jsx';

describe('SocialMediaStrip', () => {
  it('renders nothing when no platforms are configured', () => {
    const { container } = render(<SocialMediaStrip settings={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders only the configured platforms', () => {
    render(<SocialMediaStrip settings={{ instagramUrl: 'https://instagram.com/2gofindz' }} />);
    expect(screen.getByRole('link', { name: /instagram/i })).toHaveAttribute(
      'href',
      'https://instagram.com/2gofindz'
    );
    expect(screen.queryByText('TikTok')).not.toBeInTheDocument();
  });

  it('derives a handle from the profile URL path', () => {
    render(<SocialMediaStrip settings={{ instagramUrl: 'https://instagram.com/2gofindz' }} />);
    expect(screen.getByText('@2gofindz')).toBeInTheDocument();
  });

  it('opens links in a new tab safely', () => {
    render(<SocialMediaStrip settings={{ instagramUrl: 'https://instagram.com/2gofindz' }} />);
    const link = screen.getByRole('link', { name: /instagram/i });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders the follow prompt alongside the platform links', () => {
    render(<SocialMediaStrip settings={{ instagramUrl: 'https://instagram.com/2gofindz' }} />);
    expect(screen.getByText('Follow 2Go Findz for daily finds & deals')).toBeInTheDocument();
  });

  it('gives each platform icon a brand-colored circular badge', () => {
    render(<SocialMediaStrip settings={{ tiktokUrl: 'https://tiktok.com/@2gofindz' }} />);
    const badge = screen.getByRole('link', { name: /tiktok/i }).querySelector('span');
    expect(badge).toHaveClass('rounded-full', 'bg-black');
  });

  it('spans the full available width and spreads content out on larger screens', () => {
    const { container } = render(<SocialMediaStrip settings={{ instagramUrl: 'https://instagram.com/2gofindz' }} />);
    const strip = container.firstChild;
    expect(strip).toHaveClass('w-full', 'sm:justify-between');
  });
});
