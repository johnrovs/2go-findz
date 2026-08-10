import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RunnerUpsSection from './RunnerUpsSection.jsx';

function makeRunnerUp(id, name) {
  return {
    product: { id, name, imageFileName: null, productPrice: 19.99, productLink: `https://amazon.com/dp/B00${id}`, rating: null, reviewCount: 0 },
    recommendationType: 'RUNNER_UP',
    sectionLabel: 'Best Budget Pick',
    whyRecommended: '<p>Solid value.</p>',
    pros: [],
    cons: [],
    bestFor: [],
    badgeName: 'Best Budget Pick',
  };
}

describe('RunnerUpsSection', () => {
  it('renders the numbered heading and one card per runner-up, ranked in order', () => {
    const runnerUps = [makeRunnerUp(1, 'Collagen Gummy'), makeRunnerUp(2, 'Magnesium Complex')];
    render(<RunnerUpsSection runnerUps={runnerUps} number={4} guideId={3} onAffiliateClick={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /4\. Runner-Ups/ })).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('does not show "See all" when there are 4 or fewer runner-ups', () => {
    const runnerUps = [makeRunnerUp(1, 'A'), makeRunnerUp(2, 'B')];
    render(<RunnerUpsSection runnerUps={runnerUps} number={4} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(screen.queryByText(/See all/)).not.toBeInTheDocument();
  });

  it('shows a real "See all reviewed products" toggle beyond 4, revealing the rest', async () => {
    const runnerUps = Array.from({ length: 6 }, (_, i) => makeRunnerUp(i + 1, `Product ${i + 1}`));
    const user = userEvent.setup();
    render(<RunnerUpsSection runnerUps={runnerUps} number={4} guideId={3} onAffiliateClick={vi.fn()} />);

    expect(screen.queryByText('Product 5')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'See all reviewed products' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(screen.getByText('Product 5')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders nothing when there are no runner-ups', () => {
    const { container } = render(<RunnerUpsSection runnerUps={[]} number={4} guideId={3} onAffiliateClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('continues the badge color palette after the Top Pick, one color per runner-up', () => {
    const runnerUps = [makeRunnerUp(1, 'Collagen Gummy'), makeRunnerUp(2, 'Magnesium Complex')];
    render(<RunnerUpsSection runnerUps={runnerUps} number={4} guideId={3} onAffiliateClick={vi.fn()} />);

    const badges = screen.getAllByText('Best Budget Pick');
    expect(badges[0]).toHaveClass('bg-info');
    expect(badges[1]).toHaveClass('bg-primary');
  });
});
