import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Flame } from 'lucide-react';
import HomeSectionCard from './HomeSectionCard.jsx';

function renderCard(props = {}) {
  return render(
    <MemoryRouter>
      <HomeSectionCard
        icon={Flame}
        title="Trending Right Now"
        description="What everyone's buying."
        viewAllHref="/trending"
        {...props}
      >
        <p>content</p>
      </HomeSectionCard>
    </MemoryRouter>
  );
}

describe('HomeSectionCard', () => {
  it('renders the title and description', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Trending Right Now' })).toBeInTheDocument();
    expect(screen.getByText("What everyone's buying.")).toBeInTheDocument();
  });

  it('renders a View all link to the given href', () => {
    renderCard();
    expect(screen.getByRole('link', { name: /view all/i })).toHaveAttribute('href', '/trending');
  });

  it('renders children content', () => {
    renderCard();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('omits the View all link when no href is given', () => {
    renderCard({ viewAllHref: undefined });
    expect(screen.queryByRole('link', { name: /view all/i })).not.toBeInTheDocument();
  });

  it('defaults the icon badge to the soft primary tint', () => {
    renderCard();
    const badge = screen.getByRole('heading', { name: 'Trending Right Now' }).parentElement.previousSibling;
    expect(badge).toHaveClass('bg-primary/10', 'text-primary');
  });

  it('accepts an iconClassName override for the icon badge', () => {
    renderCard({ iconClassName: 'bg-amazon text-white' });
    const badge = screen.getByRole('heading', { name: 'Trending Right Now' }).parentElement.previousSibling;
    expect(badge).toHaveClass('bg-amazon', 'text-white');
    expect(badge).not.toHaveClass('bg-primary/10');
  });

  it('vertically centers the icon against the title/description block instead of top-aligning', () => {
    renderCard();
    const iconGroup = screen.getByRole('heading', { name: 'Trending Right Now' }).parentElement.parentElement;
    expect(iconGroup).toHaveClass('items-center');
  });
});
