import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ComparisonTable from './ComparisonTable.jsx';

const comparisonTable = {
  specificationNames: ['Battery Life', 'ANC'],
  rows: [
    {
      product: { id: 1, name: 'TOZO NC9', imageFileName: null, productPrice: 39.99, rating: 4, reviewCount: 8430 },
      specificationValues: ['40 Hrs', 'Yes'],
    },
    {
      product: { id: 2, name: 'JLab Go Air Pop', imageFileName: null, productPrice: null, rating: null, reviewCount: 0 },
      specificationValues: ['32 Hrs', 'No'],
    },
  ],
};

describe('ComparisonTable', () => {
  it('renders a semantic table with products as rows and specs (plus Price/Reviews) as columns', () => {
    render(<ComparisonTable comparisonTable={comparisonTable} />);

    const table = screen.getByRole('table');
    expect(table).toHaveAccessibleName(/TOZO NC9, JLab Go Air Pop/);
    expect(screen.getByRole('columnheader', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Price' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Reviews' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Battery Life' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'TOZO NC9' })).toBeInTheDocument();
    expect(screen.getByText('40 Hrs')).toBeInTheDocument();
  });

  it('formats the real product price and shows an em dash when price is missing', () => {
    render(<ComparisonTable comparisonTable={comparisonTable} />);

    expect(screen.getByText('$39.99')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('renders a star rating and review count from the real product data', () => {
    render(<ComparisonTable comparisonTable={comparisonTable} />);
    expect(screen.getByText('(8,430)')).toBeInTheDocument();
  });

  it('renders boolean-like values as an icon plus visible Yes/No text', () => {
    render(<ComparisonTable comparisonTable={comparisonTable} />);

    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('renders an em dash for missing spec values', () => {
    const withMissing = {
      specificationNames: ['Weight'],
      rows: [{ product: { id: 1, name: 'Product A', imageFileName: null }, specificationValues: [''] }],
    };
    render(<ComparisonTable comparisonTable={withMissing} />);

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('does not duplicate a freeform spec column already named Price or Reviews', () => {
    const withDuplicateSpecs = {
      specificationNames: ['Price', 'Customer Reviews', 'Battery Life'],
      rows: [
        {
          product: { id: 1, name: 'Product A', imageFileName: null, productPrice: 10, rating: 5, reviewCount: 1 },
          specificationValues: ['$10.00', '5 (1)', '10 Hrs'],
        },
      ],
    };
    render(<ComparisonTable comparisonTable={withDuplicateSpecs} />);

    expect(screen.queryByRole('columnheader', { name: 'Customer Reviews' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader', { name: 'Price' })).toHaveLength(1);
    expect(screen.getByRole('columnheader', { name: 'Battery Life' })).toBeInTheDocument();
  });

  it('returns null when there is no comparison data', () => {
    const { container } = render(<ComparisonTable comparisonTable={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('uses a custom renderProductName when provided', () => {
    render(
      <ComparisonTable
        comparisonTable={comparisonTable}
        renderProductName={(product) => <a href={`#custom-${product.id}`}>{product.name} (custom)</a>}
      />
    );
    expect(screen.getByRole('link', { name: 'TOZO NC9 (custom)' })).toBeInTheDocument();
  });
});
