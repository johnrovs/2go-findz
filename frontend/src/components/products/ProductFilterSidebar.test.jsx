import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductFilterSidebar from './ProductFilterSidebar.jsx';

const CATEGORIES = [
  { id: 1, productCategoryName: 'Electronics' },
  { id: 2, productCategoryName: 'Home & Kitchen' },
];
const BRANDS = ['Sony', 'Bose'];

function renderSidebar(props = {}) {
  const onApply = vi.fn();
  const onClear = vi.fn();
  const utils = render(
    <ProductFilterSidebar
      categories={CATEGORIES}
      brands={BRANDS}
      selectedCategories={[]}
      selectedBrands={[]}
      onApply={onApply}
      onClear={onClear}
      {...props}
    />
  );
  return { ...utils, onApply, onClear };
}

describe('ProductFilterSidebar', () => {
  it('renders the Filters header and Clear all link', () => {
    renderSidebar();
    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
  });

  it('renders category checkboxes expanded by default with real labels', () => {
    renderSidebar();
    expect(screen.getByRole('checkbox', { name: 'Electronics' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Home & Kitchen' })).toBeInTheDocument();
  });

  it('renders the Brand group collapsed behind an accordion toggle', async () => {
    const user = userEvent.setup();
    renderSidebar();

    expect(screen.queryByRole('checkbox', { name: 'Sony' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Brand' }));

    expect(screen.getByRole('checkbox', { name: 'Sony' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Bose' })).toBeInTheDocument();
  });

  it('initializes checked state from selectedCategories and selectedBrands', async () => {
    const user = userEvent.setup();
    renderSidebar({ selectedCategories: ['1'], selectedBrands: ['Sony'] });

    expect(screen.getByRole('checkbox', { name: 'Electronics' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Brand' }));
    expect(screen.getByRole('checkbox', { name: 'Sony' })).toBeChecked();
  });

  it('clicking Apply Filters calls onApply with the checked category ids and brand names', async () => {
    const user = userEvent.setup();
    const { onApply } = renderSidebar();

    await user.click(screen.getByRole('checkbox', { name: 'Electronics' }));
    await user.click(screen.getByRole('button', { name: 'Brand' }));
    await user.click(screen.getByRole('checkbox', { name: 'Bose' }));
    await user.click(screen.getByRole('button', { name: 'Apply Filters' }));

    expect(onApply).toHaveBeenCalledWith(['1'], ['Bose']);
  });

  it('clicking Reset Filters unchecks everything and calls onClear', async () => {
    const user = userEvent.setup();
    const { onClear } = renderSidebar({ selectedCategories: ['1'], selectedBrands: [] });

    await user.click(screen.getByRole('button', { name: 'Reset Filters' }));

    expect(onClear).toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: 'Electronics' })).not.toBeChecked();
  });

  it('clicking the Clear all link unchecks everything and calls onClear', async () => {
    const user = userEvent.setup();
    const { onClear } = renderSidebar({ selectedCategories: ['1'], selectedBrands: [] });

    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(onClear).toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: 'Electronics' })).not.toBeChecked();
  });

  it('the filter-search input narrows visible category options by label', async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.type(screen.getByRole('searchbox', { name: 'Search filters' }), 'home');

    expect(screen.queryByRole('checkbox', { name: 'Electronics' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Home & Kitchen' })).toBeInTheDocument();
  });

  it('disables Apply Filters and shows a loading label while isApplying', () => {
    renderSidebar({ isApplying: true });
    const button = screen.getByRole('button', { name: 'Applying…' });
    expect(button).toBeDisabled();
  });

  it('shows an error message when optionsError is set', () => {
    renderSidebar({ optionsError: 'Failed to load filters.' });
    expect(screen.getByText('Failed to load filters.')).toBeInTheDocument();
  });
});
