import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FinalRecommendationSection from './FinalRecommendationSection.jsx';

const topPick = {
  product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: 69.99, productLink: 'https://amazon.com/dp/B00A' },
  recommendationType: 'TOP_PICK',
  sectionLabel: 'Best Overall',
  whyRecommended: '<p>It offers the perfect combination of premium sound quality, powerful noise cancellation, and all-day comfort.</p>',
  pros: [],
  cons: [],
  bestFor: [],
  badgeName: 'Best Overall',
};

describe('FinalRecommendationSection', () => {
  it('renders the numbered heading, a summary derived from whyRecommended, and a named CTA', () => {
    render(<FinalRecommendationSection topPick={topPick} number={7} guideId={3} onAffiliateClick={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /7\. Final Recommendation/ })).toBeInTheDocument();
    expect(screen.getByText(/It offers the perfect combination/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Soundcore Liberty 4 NC on Amazon' })).toBeInTheDocument();
  });

  it('truncates a long summary at a word boundary without leaving raw HTML', () => {
    const longWhyRecommended = `<p>${'word '.repeat(60)}</p>`;
    render(<FinalRecommendationSection topPick={{ ...topPick, whyRecommended: longWhyRecommended }} number={7} guideId={3} onAffiliateClick={vi.fn()} />);

    const summary = screen.getByText(/word word word/);
    expect(summary.textContent).not.toContain('<p>');
    expect(summary.textContent.length).toBeLessThanOrEqual(210);
  });

  it('fires onAffiliateClick with final_recommendation context', async () => {
    const onAffiliateClick = vi.fn();
    const user = userEvent.setup();
    render(<FinalRecommendationSection topPick={topPick} number={7} guideId={3} onAffiliateClick={onAffiliateClick} />);

    await user.click(screen.getByRole('link', { name: /Soundcore Liberty 4 NC/ }));

    expect(onAffiliateClick).toHaveBeenCalledWith(expect.objectContaining({ guideId: 3, productId: 1, section: 'final_recommendation' }));
  });

  it('renders nothing when there is no Top Pick', () => {
    const { container } = render(<FinalRecommendationSection topPick={null} number={7} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
