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
});
