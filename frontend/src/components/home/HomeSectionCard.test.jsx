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
    const badge = screen.getByRole('heading', { name: 'Trending Right Now' }).previousElementSibling;
    expect(badge).toHaveClass('bg-primary/10', 'text-primary');
  });

  it('accepts an iconClassName override for the icon badge', () => {
    renderCard({ iconClassName: 'bg-amazon text-white' });
    const badge = screen.getByRole('heading', { name: 'Trending Right Now' }).previousElementSibling;
    expect(badge).toHaveClass('bg-amazon', 'text-white');
    expect(badge).not.toHaveClass('bg-primary/10');
  });

  it('vertically centers the icon against the title text itself, not the wider title+description block', () => {
    renderCard();
    const heading = screen.getByRole('heading', { name: 'Trending Right Now' });
    const iconTitleRow = heading.parentElement;
    expect(iconTitleRow).toHaveClass('items-center');
    expect(iconTitleRow).toContainElement(heading.previousElementSibling);
    // the description must live outside this row, so it can't pull the row's
    // vertical center down toward the boundary between title and description
    expect(iconTitleRow).not.toContainElement(screen.getByText("What everyone's buying."));
  });

  it('indents the description to align under the title text, not the icon', () => {
    renderCard();
    expect(screen.getByText("What everyone's buying.")).toHaveClass('pl-[52px]');
  });

  it('renders the title at a fixed 20px, with no responsive size scaling', () => {
    renderCard();
    const heading = screen.getByRole('heading', { name: 'Trending Right Now' });
    expect(heading).toHaveClass('text-[20px]');
    expect(heading.className).not.toMatch(/lg:text-\[/);
  });
});
