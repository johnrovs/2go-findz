import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CategoryGridSection from './CategoryGridSection.jsx';

const categories = [
  { id: 1, productCategoryName: 'Electronics' },
  { id: 2, productCategoryName: 'Home & Kitchen' },
];

describe('CategoryGridSection', () => {
  it('renders nothing with no categories', () => {
    const { container } = render(
      <MemoryRouter>
        <CategoryGridSection categories={[]} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a card for every category', () => {
    render(
      <MemoryRouter>
        <CategoryGridSection categories={categories} />
      </MemoryRouter>
    );
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Home & Kitchen')).toBeInTheDocument();
  });
});
