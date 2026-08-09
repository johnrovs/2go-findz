import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TopPickSection from './TopPickSection.jsx';

const topPick = {
  product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: 69.99, productLink: 'https://amazon.com/dp/B00A', rating: 4.5, reviewCount: 12850 },
  recommendationType: 'TOP_PICK',
  sectionLabel: 'Best Overall',
  whyRecommended: '<p>Great value.</p>',
  pros: [],
  cons: [],
  bestFor: [],
  badgeName: 'Best Overall',
};

describe('TopPickSection', () => {
  it('renders the numbered heading and the recommendation card', () => {
    render(<TopPickSection topPick={topPick} number={3} guideId={3} onAffiliateClick={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /3\. Our Top Pick/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Soundcore Liberty 4 NC' })).toBeInTheDocument();
  });

  it('fires onAffiliateClick with top_pick section context', async () => {
    const onAffiliateClick = vi.fn();
    const user = userEvent.setup();
    render(<TopPickSection topPick={topPick} number={3} guideId={3} onAffiliateClick={onAffiliateClick} />);

    await user.click(screen.getByRole('link', { name: /Soundcore Liberty 4 NC/ }));

    expect(onAffiliateClick).toHaveBeenCalledWith(expect.objectContaining({ guideId: 3, productId: 1, section: 'top_pick' }));
  });

  it('renders nothing when there is no Top Pick', () => {
    const { container } = render(<TopPickSection topPick={null} number={3} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
