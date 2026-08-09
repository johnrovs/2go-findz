import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PublicFooter from './PublicFooter.jsx';

const settings = {
  affiliateDisclosure: 'Custom disclosure text.',
  contactEmail: 'hello@2gofindz.com',
  instagramUrl: 'https://instagram.com/2gofindz',
};

function renderFooter(props = { settings }) {
  return render(
    <MemoryRouter>
      <PublicFooter {...props} />
    </MemoryRouter>
  );
}

describe('PublicFooter', () => {
  it('renders the brand name and affiliate disclosure', () => {
    renderFooter();
    expect(screen.getByText('2Go Findz')).toBeInTheDocument();
    expect(screen.getByText('Custom disclosure text.')).toBeInTheDocument();
  });

  it('falls back to the default disclosure text when settings has none', () => {
    renderFooter({ settings: null });
    expect(
      screen.getByText(/as an amazon associate, 2go findz may earn from qualifying purchases/i)
    ).toBeInTheDocument();
  });

  it('renders Shop, Discover, and Company link columns with real routes', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveAttribute('href', '/trending');
    expect(screen.getByRole('link', { name: 'Best Sellers' })).toHaveAttribute('href', '/best-sellers');
    expect(screen.getByRole('link', { name: 'New Arrivals' })).toHaveAttribute(
      'href',
      '/products?sort=createdAt,desc'
    );
    expect(screen.getByRole('link', { name: 'All Products' })).toHaveAttribute('href', '/products');
    expect(screen.getByRole('link', { name: 'Categories' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toHaveAttribute('href', '/buying-guides');
    expect(screen.getByRole('link', { name: 'Compare' })).toHaveAttribute('href', '/compare');
    expect(screen.getByRole('link', { name: 'About Us' })).toHaveAttribute('href', '/about');
    expect(screen.getByRole('link', { name: 'Contact Us' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy');
    expect(screen.getByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/terms-of-use');
    expect(screen.getByRole('link', { name: 'Affiliate Disclosure' })).toHaveAttribute(
      'href',
      '/affiliate-disclosure'
    );
  });

  it('does not render Deals, Reviews, or Gift Ideas links', () => {
    renderFooter();
    expect(screen.queryByRole('link', { name: 'Deals' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reviews' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Gift Ideas' })).not.toBeInTheDocument();
  });

  it('renders a mailto link for the configured contact email', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'hello@2gofindz.com' })).toHaveAttribute(
      'href',
      'mailto:hello@2gofindz.com'
    );
  });

  it('renders the social strip when a platform is configured', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: /instagram/i })).toBeInTheDocument();
  });

  it('renders the newsletter form', () => {
    renderFooter();
    expect(screen.getByLabelText('Subscribe to our newsletter')).toBeInTheDocument();
  });
});
