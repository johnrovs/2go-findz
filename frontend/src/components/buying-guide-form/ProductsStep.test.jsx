import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductsStep from './ProductsStep.jsx';

vi.mock('./ProductCatalogPanel.jsx', () => ({
  default: ({ selectedProducts, onAdd }) => (
    <div>
      <p>Catalog ({selectedProducts.length} selected)</p>
      <button type="button" onClick={() => onAdd({ id: 99, name: 'New Product' })}>
        Add from catalog
      </button>
    </div>
  ),
}));

vi.mock('./SelectedProductsPanel.jsx', () => ({
  default: ({ selectedProducts, onChange }) => (
    <div>
      <p>Selected ({selectedProducts.length})</p>
      <button type="button" onClick={() => onChange([])}>
        Clear
      </button>
    </div>
  ),
}));

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

describe('ProductsStep', () => {
  it('renders both panels with the current selection', () => {
    render(
      <ProductsStep selectedProducts={[{ id: 1, name: 'Blender' }]} onSelectedProductsChange={vi.fn()} categories={categories} />
    );
    expect(screen.getByText('Catalog (1 selected)')).toBeInTheDocument();
    expect(screen.getByText('Selected (1)')).toBeInTheDocument();
  });

  it('adding from the catalog panel calls onSelectedProductsChange with the product appended', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductsStep selectedProducts={[{ id: 1, name: 'Blender' }]} onSelectedProductsChange={onChange} categories={categories} />);

    await user.click(screen.getByRole('button', { name: 'Add from catalog' }));

    expect(onChange).toHaveBeenCalledWith([{ id: 1, name: 'Blender' }, { id: 99, name: 'New Product' }]);
  });

  it('changes from the selected panel call onSelectedProductsChange directly', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductsStep selectedProducts={[{ id: 1, name: 'Blender' }]} onSelectedProductsChange={onChange} categories={categories} />);

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
