import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Star } from 'lucide-react';
import HeroTrustCard from './HeroTrustCard.jsx';

describe('HeroTrustCard', () => {
  it('renders the title and description', () => {
    render(<HeroTrustCard icon={Star} title="Top Rated" description="4.8/5 average rating" />);
    expect(screen.getByText('Top Rated')).toBeInTheDocument();
    expect(screen.getByText('4.8/5 average rating')).toBeInTheDocument();
  });
});
