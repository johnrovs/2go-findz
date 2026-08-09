import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import HomeHero from './HomeHero.jsx';

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

  it('renders the Top Rated and Handpicked trust cards', () => {
    renderHero();
    expect(screen.getByText('Top Rated')).toBeInTheDocument();
    expect(screen.getByText('Handpicked')).toBeInTheDocument();
  });

  it('renders the promotional shopper-count label', () => {
    renderHero();
    expect(screen.getByText(/join 25,000\+ smart shoppers/i)).toBeInTheDocument();
  });

  it('renders the welcome badge', () => {
    renderHero();
    expect(screen.getByText('WELCOME TO 2GO FINDZ')).toBeInTheDocument();
  });
});
