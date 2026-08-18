import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DesktopGuidePreview from './DesktopGuidePreview.jsx';

describe('DesktopGuidePreview', () => {
  it('renders the title as the hero heading, with a fallback when untitled', () => {
    render(<DesktopGuidePreview title="" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Untitled Guide' })).toBeInTheDocument();
    expect(screen.getByText('Home / Buying Guides / Untitled Guide')).toBeInTheDocument();
  });

  it('renders the title, excerpt, and Quick Recommendations section', () => {
    render(
      <DesktopGuidePreview
        title="Best Earbuds"
        excerpt="A quick roundup."
        coverImageFilename={null}
        tocEntries={[{ clientId: 'QUICK_RECOMMENDATIONS', sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '', visible: true }]}
        settings={null}
        quickRecommendations={[
          {
            product: { id: 1, name: 'Soundcore Liberty 4 NC', productPrice: '69.99', productLink: 'https://amazon.com/dp/a', imageFileName: null },
            badgeName: 'Best Overall',
          },
        ]}
      />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Best Earbuds' })).toBeInTheDocument();
    expect(screen.getByText('A quick roundup.')).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
  });

  it('includes the Final Recommendation section when a Top Pick exists, unlike the compact LivePreview card', () => {
    const topPickSection = {
      clientId: 'tp-1',
      product: {
        id: 1,
        name: 'Soundcore Liberty 4 NC',
        imageFileName: null,
        productPrice: '69.99',
        productLink: 'https://amazon.com/dp/a',
        rating: 4.8,
        reviewCount: 12850,
      },
      recommendationType: 'TOP_PICK',
      sectionLabel: 'Best Overall',
      whyRecommended: '<p>Great sound and battery life.</p>',
      pros: [{ clientId: 'p1', content: 'Great sound' }],
      cons: [{ clientId: 'c1', content: 'Pricey' }],
      bestFor: [{ clientId: 'b1', content: 'Daily commuters' }],
    };

    render(
      <DesktopGuidePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[]}
        settings={null}
        recommendationSections={[topPickSection]}
      />
    );

    expect(screen.getByRole('heading', { name: /our top pick/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /final recommendation/i })).toBeInTheDocument();
    expect(screen.getAllByText('Soundcore Liberty 4 NC').length).toBeGreaterThan(0);
  });

  it('shows no optional sections and does not crash when given no data', () => {
    render(<DesktopGuidePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} />);
    expect(screen.queryByText(/quick recommendations/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /our top pick/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /final recommendation/i })).not.toBeInTheDocument();
  });
});
