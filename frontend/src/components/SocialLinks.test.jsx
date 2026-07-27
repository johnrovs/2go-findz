import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SocialLinks from './SocialLinks.jsx';

describe('SocialLinks', () => {
  it('renders a link for each configured platform with correct target/rel', () => {
    render(
      <SocialLinks
        settings={{
          tiktokUrl: 'https://tiktok.com/@2gofindz',
          pinterestUrl: 'https://pinterest.com/2gofindz',
          instagramUrl: 'https://instagram.com/2gofindz',
          youtubeUrl: 'https://youtube.com/@2gofindz',
        }}
      />
    );

    const tiktokLink = screen.getByRole('link', { name: /tiktok/i });
    expect(tiktokLink).toHaveAttribute('href', 'https://tiktok.com/@2gofindz');
    expect(tiktokLink).toHaveAttribute('target', '_blank');
    expect(tiktokLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: /pinterest/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /instagram/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /youtube/i })).toBeInTheDocument();
  });

  it('omits links for platforms with no configured URL', () => {
    render(<SocialLinks settings={{ tiktokUrl: 'https://tiktok.com/@2gofindz' }} />);

    expect(screen.getByRole('link', { name: /tiktok/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /instagram/i })).not.toBeInTheDocument();
  });

  it('renders nothing when settings is null or has no social URLs', () => {
    const { container } = render(<SocialLinks settings={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
