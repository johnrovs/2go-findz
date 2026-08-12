import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuickRecommendationsSection from './QuickRecommendationsSection.jsx';

const quickRecommendations = [
  {
    product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: 69.99, productLink: 'https://amazon.com/dp/B00A', rating: 4.5, reviewCount: 12850 },
    badgeName: 'Best Overall',
  },
  {
    product: { id: 2, name: 'JLab Go Air Pop', imageFileName: null, productPrice: 24.99, productLink: 'https://amazon.com/dp/B00B', rating: null, reviewCount: 0 },
    badgeName: 'Best Budget',
  },
];

describe('QuickRecommendationsSection', () => {
  it('renders the numbered heading and one card per recommendation', () => {
    render(<QuickRecommendationsSection quickRecommendations={quickRecommendations} number={1} guideId={3} onAffiliateClick={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /1\. Quick Recommendations/ })).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('JLab Go Air Pop')).toBeInTheDocument();
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
  });

  it('never renders price or rating', () => {
    render(<QuickRecommendationsSection quickRecommendations={quickRecommendations} number={1} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    expect(screen.queryByText(/69\.99/)).not.toBeInTheDocument();
    expect(screen.queryByText(/24\.99/)).not.toBeInTheDocument();
  });

  it('fires onAffiliateClick with product and placement context', async () => {
    const onAffiliateClick = vi.fn();
    const user = userEvent.setup();
    render(<QuickRecommendationsSection quickRecommendations={quickRecommendations} number={1} guideId={3} onAffiliateClick={onAffiliateClick} />);

    await user.click(screen.getByRole('link', { name: /Soundcore Liberty 4 NC/ }));

    expect(onAffiliateClick).toHaveBeenCalledWith(expect.objectContaining({ productId: 1, placement: 0 }));
  });

  it('renders nothing when there are no quick recommendations', () => {
    const { container } = render(<QuickRecommendationsSection quickRecommendations={[]} number={1} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
