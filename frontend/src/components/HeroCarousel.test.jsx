import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import HeroCarousel from './HeroCarousel.jsx';

const heroSectionProps = {
  headline: 'Smart Finds. Better Buys.',
  description: 'Discover trending products.',
  onExploreClick: vi.fn(),
  onTrendingClick: vi.fn(),
};

const banners = [
  {
    id: 1,
    imageFilename: 'img_1.webp',
    imageAlt: 'Trending gadgets',
    badge: 'Trending Today',
    headline: 'Amazon Finds Everyone Is Talking About',
    description: 'Discover trending products.',
    buttonText: 'Explore Trending Finds',
    buttonLink: '/trending',
  },
  {
    id: 2,
    imageFilename: 'img_2.webp',
    imageAlt: 'Category showcase',
    badge: 'Shop by Category',
    headline: 'Find the Right Product Faster',
    description: 'Browse curated recommendations.',
    buttonText: 'Browse Categories',
    buttonLink: '/categories',
  },
];

function renderCarousel(bannerList) {
  return render(
    <MemoryRouter>
      <HeroCarousel banners={bannerList} heroSectionProps={heroSectionProps} />
    </MemoryRouter>
  );
}

describe('HeroCarousel', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        // Framer Motion's internal reduced-motion detection still calls the legacy
        // addListener/removeListener API (deprecated but not removed from MediaQueryList),
        // so the stub needs both forms or its mount-time check throws.
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('renders the unmodified HeroSection when there are no banners', () => {
    renderCarousel([]);
    expect(screen.getByText('Smart Finds. Better Buys.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Next slide')).not.toBeInTheDocument();
  });

  it('renders a single chrome-less slide when there is exactly one banner', () => {
    renderCarousel([banners[0]]);
    expect(screen.getByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();
    expect(screen.queryByLabelText('Next slide')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Go to slide 1')).not.toBeInTheDocument();
  });

  it('renders carousel chrome for two or more banners', () => {
    renderCarousel(banners);
    expect(screen.getByLabelText('Previous slide')).toBeInTheDocument();
    expect(screen.getByLabelText('Next slide')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to slide 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to slide 2')).toBeInTheDocument();
  });

  it('advances to the next slide automatically after 5 seconds', () => {
    vi.useFakeTimers();
    renderCarousel(banners);
    expect(screen.getByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Find the Right Product Faster')).toBeInTheDocument();
  });

  it('pauses autoplay while the mouse is hovering the carousel', () => {
    vi.useFakeTimers();
    const { container } = renderCarousel(banners);

    fireEvent.mouseEnter(container.firstChild);
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();
  });

  it('navigates via the next button', async () => {
    const user = userEvent.setup();
    renderCarousel(banners);

    await user.click(screen.getByLabelText('Next slide'));

    expect(screen.getByText('Find the Right Product Faster')).toBeInTheDocument();
  });

  it('navigates via a slide indicator', async () => {
    const user = userEvent.setup();
    renderCarousel(banners);

    await user.click(screen.getByLabelText('Go to slide 2'));

    expect(screen.getByText('Find the Right Product Faster')).toBeInTheDocument();
  });

  it('disables autoplay when the user prefers reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query) => ({
        matches: true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }))
    );
    vi.useFakeTimers();
    renderCarousel(banners);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();
  });
});
