import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ComparisonTable from './ComparisonTable.jsx';

const comparisonTable = {
  specificationNames: ['Battery Life', 'ANC'],
  rows: [
    { product: { id: 1, name: 'TOZO NC9', imageFileName: null }, specificationValues: ['40 Hrs', 'Yes'] },
    { product: { id: 2, name: 'JLab Go Air Pop', imageFileName: null }, specificationValues: ['32 Hrs', 'No'] },
  ],
};

describe('ComparisonTable', () => {
  it('renders a semantic table with products as rows and specs as columns', () => {
    render(<ComparisonTable comparisonTable={comparisonTable} />);

    const table = screen.getByRole('table');
    expect(table).toHaveAccessibleName(/TOZO NC9, JLab Go Air Pop/);
    expect(screen.getByRole('columnheader', { name: 'Product' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Battery Life' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'ANC' })).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Price' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Reviews' })).not.toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'TOZO NC9' })).toBeInTheDocument();
    expect(screen.getByText('40 Hrs')).toBeInTheDocument();
  });

  it('renders boolean-like values as an icon plus visible Yes/No text', () => {
    render(<ComparisonTable comparisonTable={comparisonTable} />);

    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('renders an em dash for missing values', () => {
    const withMissing = {
      specificationNames: ['Weight'],
      rows: [{ product: { id: 1, name: 'Product A', imageFileName: null }, specificationValues: [''] }],
    };
    render(<ComparisonTable comparisonTable={withMissing} />);

    expect(screen.getByText('—')).toBeInTheDocument();
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
