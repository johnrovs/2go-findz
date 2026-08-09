import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BuyingGuideHero from './BuyingGuideHero.jsx';

describe('BuyingGuideHero', () => {
  it('renders the title as the page h1 and the excerpt', () => {
    render(
      <BuyingGuideHero
        title="Best Wireless Earbuds Under $100"
        excerpt="A curated guide to the best budget earbuds."
        coverImageFilename={null}
        updatedAt="2026-05-28T10:00:00"
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Best Wireless Earbuds Under $100' })).toBeInTheDocument();
    expect(screen.getByText('A curated guide to the best budget earbuds.')).toBeInTheDocument();
  });

  it('renders the byline with a formatted updated date', () => {
    render(<BuyingGuideHero title="Guide" excerpt="Excerpt" coverImageFilename={null} updatedAt="2026-05-28T10:00:00" />);
    expect(screen.getByText(/By 2Go Findz Team/)).toBeInTheDocument();
    expect(screen.getByText(/May 28, 2026/)).toBeInTheDocument();
  });

  it('renders the featured image with title as alt text when present', () => {
    render(<BuyingGuideHero title="Guide" excerpt="Excerpt" coverImageFilename="cover.png" updatedAt={null} />);
    expect(screen.getByAltText('Guide')).toBeInTheDocument();
  });

  it('renders no broken image element when the cover image is missing', () => {
    render(<BuyingGuideHero title="Guide" excerpt="Excerpt" coverImageFilename={null} updatedAt={null} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the BUYING GUIDE badge', () => {
    render(<BuyingGuideHero title="Guide" excerpt="Excerpt" coverImageFilename={null} updatedAt={null} />);
    expect(screen.getByText('BUYING GUIDE')).toBeInTheDocument();
  });
});
