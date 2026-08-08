import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SearchResultPreview from './SearchResultPreview.jsx';

describe('SearchResultPreview', () => {
  it('renders the SEO title, description, and URL', () => {
    render(<SearchResultPreview seoTitle="Best Earbuds" metaDescription="A great guide." url="https://2gofindz.com/buying-guides/best-earbuds" />);
    expect(screen.getByText('Best Earbuds')).toBeInTheDocument();
    expect(screen.getByText('A great guide.')).toBeInTheDocument();
    expect(screen.getByText('https://2gofindz.com/buying-guides/best-earbuds')).toBeInTheDocument();
  });

  it('shows placeholder text when title and description are empty', () => {
    render(<SearchResultPreview seoTitle="" metaDescription="" url="https://2gofindz.com/buying-guides/x" />);
    expect(screen.getByText('Untitled guide')).toBeInTheDocument();
    expect(screen.getByText('No description provided yet.')).toBeInTheDocument();
  });

  it('labels itself as a preview', () => {
    render(<SearchResultPreview seoTitle="X" metaDescription="Y" url="https://2gofindz.com/buying-guides/x" />);
    expect(screen.getByText(/preview only/i)).toBeInTheDocument();
  });
});
