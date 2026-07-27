import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HeroSection from './HeroSection.jsx';

describe('HeroSection', () => {
  it('renders the provided headline and description', () => {
    render(
      <HeroSection
        headline="Smart Finds. Better Buys."
        description="Curated picks."
        onExploreClick={vi.fn()}
        onTrendingClick={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Smart Finds. Better Buys.' })).toBeInTheDocument();
    expect(screen.getByText('Curated picks.')).toBeInTheDocument();
  });

  it('calls the respective handlers when each CTA is clicked', async () => {
    const onExploreClick = vi.fn();
    const onTrendingClick = vi.fn();
    const user = userEvent.setup();
    render(
      <HeroSection
        headline="Headline"
        description="Description"
        onExploreClick={onExploreClick}
        onTrendingClick={onTrendingClick}
      />
    );

    await user.click(screen.getByRole('button', { name: /explore products/i }));
    expect(onExploreClick).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /view trending finds/i }));
    expect(onTrendingClick).toHaveBeenCalled();
  });
});
