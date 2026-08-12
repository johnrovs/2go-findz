import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductsPageHeader from './ProductsPageHeader.jsx';

describe('ProductsPageHeader', () => {
  it('renders the page h1 and supporting text', () => {
    render(<ProductsPageHeader />);
    expect(screen.getByRole('heading', { level: 1, name: 'Browse All Products' })).toBeInTheDocument();
    expect(screen.getByText('Explore handpicked products from Amazon across all categories.')).toBeInTheDocument();
  });

  it('renders the decorative illustration side with no accessible text noise', () => {
    render(<ProductsPageHeader />);
    expect(screen.getByText('Smart shopping starts here.')).toBeInTheDocument();
    expect(screen.getByText('Find the right products for your lifestyle.')).toBeInTheDocument();
  });

  it('renders exactly one h1 on the page', () => {
    render(<ProductsPageHeader />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders a custom title and description when provided, for pages like Trending or Best Sellers', () => {
    render(<ProductsPageHeader title="Trending Finds" description="See what's trending right now." />);
    expect(screen.getByRole('heading', { level: 1, name: 'Trending Finds' })).toBeInTheDocument();
    expect(screen.getByText("See what's trending right now.")).toBeInTheDocument();
    expect(screen.queryByText('Browse All Products')).not.toBeInTheDocument();
  });
});
