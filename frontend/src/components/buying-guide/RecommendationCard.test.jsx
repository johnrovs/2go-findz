import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecommendationCard from './RecommendationCard.jsx';

const topPick = {
  product: {
    id: 1,
    name: 'Soundcore Liberty 4 NC',
    imageFileName: 'soundcore.png',
    productPrice: 69.99,
    productLink: 'https://amazon.com/dp/B00TEST',
    rating: 4.5,
    reviewCount: 12850,
  },
  recommendationType: 'TOP_PICK',
  sectionLabel: 'Best Overall',
  whyRecommended: '<p>It offers the perfect combination of sound and battery life.</p>',
  pros: ['Excellent Noise Cancellation', 'High-quality audio'],
  cons: ['Slightly bulky case'],
  bestFor: ['Daily commuters', 'Students'],
  badgeName: 'Best Overall',
};

describe('RecommendationCard', () => {
  it('renders the product name, badge, and rating', () => {
    render(<RecommendationCard recommendation={topPick} rank={null} />);

    expect(screen.getByRole('heading', { name: 'Soundcore Liberty 4 NC' })).toBeInTheDocument();
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
    expect(screen.getByText(/4.5/)).toBeInTheDocument();
    expect(screen.getByText(/12,850/)).toBeInTheDocument();
  });

  it('does not render the price or a separate View on Amazon button', () => {
    render(<RecommendationCard recommendation={topPick} rank={null} />);

    expect(screen.queryByText('$69.99')).not.toBeInTheDocument();
    expect(screen.queryByText('View on Amazon')).not.toBeInTheDocument();
  });

  it('makes the product name a link to the real Amazon product URL', () => {
    render(<RecommendationCard recommendation={topPick} rank={null} />);

    const link = screen.getByRole('link', { name: 'Soundcore Liberty 4 NC' });
    expect(link).toHaveAttribute('href', topPick.product.productLink);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('renders a "Why We Recommend It?" label above the description', () => {
    render(<RecommendationCard recommendation={topPick} rank={null} />);

    const label = screen.getByText('Why We Recommend It?');
    expect(label.compareDocumentPosition(screen.getByText(/perfect combination/))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('does not show a rank badge for the Top Pick', () => {
    render(<RecommendationCard recommendation={topPick} rank={null} />);
    expect(screen.queryByText('#1')).not.toBeInTheDocument();
  });

  it('shows a rank badge for a Runner-Up', () => {
    render(<RecommendationCard recommendation={{ ...topPick, recommendationType: 'RUNNER_UP' }} rank={1} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('renders pros, cons, and best-for lists with accessible text alternatives', () => {
    render(<RecommendationCard recommendation={topPick} rank={null} />);

    expect(screen.getByText('Excellent Noise Cancellation')).toBeInTheDocument();
    expect(screen.getByText('Slightly bulky case')).toBeInTheDocument();
    expect(screen.getByText('Daily commuters')).toBeInTheDocument();
  });

  it('hides empty optional groups instead of rendering blank sections', () => {
    render(<RecommendationCard recommendation={{ ...topPick, cons: [], bestFor: [] }} rank={null} />);

    expect(screen.queryByText('Best For')).not.toBeInTheDocument();
  });

  it('forwards onAffiliateClick when the product name link is clicked', async () => {
    const onAffiliateClick = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationCard recommendation={topPick} rank={null} onAffiliateClick={onAffiliateClick} />);

    await user.click(screen.getByRole('link', { name: 'Soundcore Liberty 4 NC' }));

    expect(onAffiliateClick).toHaveBeenCalled();
  });

  it('omits rating text when the product has no rating', () => {
    render(<RecommendationCard recommendation={{ ...topPick, product: { ...topPick.product, rating: null } }} rank={null} />);
    expect(screen.queryByText(/reviews\)/)).not.toBeInTheDocument();
  });

  it('colors the badge according to badgeIndex, defaulting to index 0', () => {
    render(<RecommendationCard recommendation={topPick} rank={null} />);
    expect(screen.getByText('Best Overall')).toHaveClass('bg-success');
  });

  it('uses a later palette color for a later badgeIndex', () => {
    render(<RecommendationCard recommendation={topPick} rank={1} badgeIndex={1} />);
    expect(screen.getByText('Best Overall')).toHaveClass('bg-info');
  });

  it('lays out pros, cons, and best-for as three side-by-side columns by default (wide)', () => {
    const { container } = render(<RecommendationCard recommendation={topPick} rank={null} />);
    const columns = container.querySelector('.sm\\:grid-cols-3');
    expect(columns).toBeInTheDocument();
    expect(columns).toContainElement(screen.getByText('Excellent Noise Cancellation'));
    expect(columns).toContainElement(screen.getByText('Slightly bulky case'));
    expect(columns).toContainElement(screen.getByText('Daily commuters'));
  });

  it('stacks pros, cons, and best-for in a single column when wide is false', () => {
    const { container } = render(<RecommendationCard recommendation={topPick} rank={null} wide={false} />);
    expect(container.querySelector('.sm\\:grid-cols-3')).not.toBeInTheDocument();
  });
});
