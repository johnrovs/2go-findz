import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SeoScoreCard from './SeoScoreCard.jsx';

const checks = [
  { id: 'a', label: 'Check A', points: 15, maxPoints: 15 },
  { id: 'b', label: 'Check B', points: 0, maxPoints: 10 },
];

describe('SeoScoreCard', () => {
  it('renders the score and label', () => {
    render(<SeoScoreCard score={92} label="Excellent" checks={checks} onViewFullAnalysis={vi.fn()} />);
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('shows how many checks passed', () => {
    render(<SeoScoreCard score={60} label="Good" checks={checks} onViewFullAnalysis={vi.fn()} />);
    expect(screen.getByText('1 of 2 checks passed')).toBeInTheDocument();
  });

  it('calls onViewFullAnalysis when the link is clicked', async () => {
    const onViewFullAnalysis = vi.fn();
    const user = userEvent.setup();
    render(<SeoScoreCard score={60} label="Good" checks={checks} onViewFullAnalysis={onViewFullAnalysis} />);

    await user.click(screen.getByText(/View full SEO analysis/));

    expect(onViewFullAnalysis).toHaveBeenCalled();
  });
});
