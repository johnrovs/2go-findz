import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import HeroSlide from './HeroSlide.jsx';

function renderSlide(props) {
  return render(
    <MemoryRouter>
      <HeroSlide
        imageUrl="https://example.com/uploads/img_1.webp"
        imageAlt="Curated collection of trending gadgets"
        badge="Trending Today"
        headline="Amazon Finds Everyone Is Talking About"
        description="Discover trending products."
        buttonText="Explore Trending Finds"
        isPriority={false}
        {...props}
      />
    </MemoryRouter>
  );
}

describe('HeroSlide', () => {
  it('renders the image with the provided alt text', () => {
    renderSlide({});
    expect(screen.getByAltText('Curated collection of trending gadgets')).toBeInTheDocument();
  });

  it('renders the badge, headline, and description', () => {
    renderSlide({});
    expect(screen.getByText('Trending Today')).toBeInTheDocument();
    expect(screen.getByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();
    expect(screen.getByText('Discover trending products.')).toBeInTheDocument();
  });

  it('renders the button as a Link when buttonTo is provided', () => {
    renderSlide({ buttonTo: '/trending' });
    expect(screen.getByRole('link', { name: 'Explore Trending Finds' })).toHaveAttribute('href', '/trending');
  });

  it('renders the button as a button when onButtonClick is provided', async () => {
    const onButtonClick = vi.fn();
    renderSlide({ onButtonClick });
    expect(screen.getByRole('button', { name: 'Explore Trending Finds' })).toBeInTheDocument();
  });

  it('eager-loads the image when isPriority is true, lazy-loads otherwise', () => {
    const { rerender } = renderSlide({ isPriority: true });
    expect(screen.getByAltText('Curated collection of trending gadgets')).toHaveAttribute('loading', 'eager');

    rerender(
      <MemoryRouter>
        <HeroSlide
          imageUrl="https://example.com/uploads/img_1.webp"
          imageAlt="Curated collection of trending gadgets"
          headline="Amazon Finds Everyone Is Talking About"
          buttonText="Explore Trending Finds"
          buttonTo="/trending"
          isPriority={false}
        />
      </MemoryRouter>
    );
    expect(screen.getByAltText('Curated collection of trending gadgets')).toHaveAttribute('loading', 'lazy');
  });
});
