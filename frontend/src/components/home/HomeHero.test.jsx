import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import HomeHero from './HomeHero.jsx';
import { HOME_HERO_IMAGE } from '../../config/homeContent.js';

function renderHero(props = {}) {
  return render(
    <MemoryRouter>
      <HomeHero headline="Smart Finds. Better Buys." description="Discover trending products." {...props} />
    </MemoryRouter>
  );
}

describe('HomeHero', () => {
  it('renders the headline as the page h1', () => {
    renderHero();
    expect(screen.getByRole('heading', { level: 1, name: 'Smart Finds. Better Buys.' })).toBeInTheDocument();
  });

  it('renders the description', () => {
    renderHero();
    expect(screen.getByText('Discover trending products.')).toBeInTheDocument();
  });

  it('links the primary CTA to /trending', () => {
    renderHero();
    expect(screen.getByRole('link', { name: 'View Trending Finds' })).toHaveAttribute('href', '/trending');
  });

  it('links the secondary CTA to /categories', () => {
    renderHero();
    expect(screen.getByRole('link', { name: 'Browse Categories' })).toHaveAttribute('href', '/categories');
  });

  it('renders the welcome badge', () => {
    renderHero();
    expect(screen.getByText('WELCOME TO 2GO FINDZ')).toBeInTheDocument();
  });

  it('renders the hero banner as a stacked image on mobile, hidden at the lg breakpoint', () => {
    renderHero();
    const image = screen.getByAltText('');
    expect(image).toHaveAttribute('src', HOME_HERO_IMAGE);
    expect(image).toHaveClass('lg:hidden');
  });

  it('renders the hero banner as a full-bleed section background at the lg breakpoint', () => {
    const { container } = renderHero();
    const section = container.querySelector('section');
    expect(section.style.getPropertyValue('--hero-image')).toBe(`url(${HOME_HERO_IMAGE})`);
    expect(section).toHaveClass('lg:bg-cover', 'lg:bg-right', 'lg:bg-no-repeat');
  });

  it('does not render an avatar row or shopper-count line', () => {
    renderHero();
    expect(screen.queryByText(/smart shoppers/i)).not.toBeInTheDocument();
  });

  it('splits the headline into a black first sentence and an orange remainder', () => {
    renderHero({ headline: 'Smart Finds. Better Choices.' });
    expect(screen.getByText('Smart Finds.')).not.toHaveClass('text-amazon');
    expect(screen.getByText('Better Choices.')).toHaveClass('text-amazon');
  });

  it('renders the whole headline in one line when it has no sentence break', () => {
    renderHero({ headline: 'Smart Finds' });
    expect(screen.getByText('Smart Finds')).toBeInTheDocument();
  });

  it('renders the welcome badge as an outlined amazon-colored pill, not a filled one', () => {
    renderHero();
    const badge = screen.getByText('WELCOME TO 2GO FINDZ');
    expect(badge.closest('span')).toHaveClass('border-amazon', 'text-amazon', 'bg-white');
  });
});
