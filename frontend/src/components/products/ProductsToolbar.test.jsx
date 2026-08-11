import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductsToolbar from './ProductsToolbar.jsx';

function renderToolbar(props = {}) {
  const onSortChange = vi.fn();
  const onViewChange = vi.fn();
  const onOpenMobileFilters = vi.fn();
  const utils = render(
    <ProductsToolbar
      page={1}
      size={24}
      totalElements={248}
      sort="newest"
      view="grid"
      activeFilterCount={0}
      onSortChange={onSortChange}
      onViewChange={onViewChange}
      onOpenMobileFilters={onOpenMobileFilters}
      {...props}
    />
  );
  return { ...utils, onSortChange, onViewChange, onOpenMobileFilters };
}

describe('ProductsToolbar', () => {
  it('shows the dynamic result-count range', () => {
    renderToolbar();
    expect(screen.getByText('Showing 1–24 of 248 products')).toBeInTheDocument();
  });

  it('computes the range for a later page and a partial last page', () => {
    renderToolbar({ page: 11, size: 24, totalElements: 248 });
    expect(screen.getByText('Showing 241–248 of 248 products')).toBeInTheDocument();
  });

  it('shows a zero-result message when there are no products', () => {
    renderToolbar({ totalElements: 0 });
    expect(screen.getByText('Showing 0 of 0 products')).toBeInTheDocument();
  });

  it('renders a sort dropdown that calls onSortChange with the selected value', async () => {
    const user = userEvent.setup();
    const { onSortChange } = renderToolbar();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'nameAZ');

    expect(onSortChange).toHaveBeenCalledWith('nameAZ');
  });

  it('renders Grid and List toggle buttons with correct aria-pressed state', () => {
    renderToolbar({ view: 'grid' });
    expect(screen.getByRole('button', { name: 'Grid view' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onViewChange when the List toggle is clicked', async () => {
    const user = userEvent.setup();
    const { onViewChange } = renderToolbar({ view: 'grid' });

    await user.click(screen.getByRole('button', { name: 'List view' }));

    expect(onViewChange).toHaveBeenCalledWith('list');
  });

  it('renders a mobile Filter trigger button that calls onOpenMobileFilters', async () => {
    const user = userEvent.setup();
    const { onOpenMobileFilters } = renderToolbar();

    await user.click(screen.getByRole('button', { name: 'Filter' }));

    expect(onOpenMobileFilters).toHaveBeenCalled();
  });

  it('shows an active-filter-count badge on the Filter trigger when filters are applied', () => {
    renderToolbar({ activeFilterCount: 3 });
    const trigger = screen.getByRole('button', { name: 'Filter, 3 active' });
    expect(trigger).toHaveTextContent('3');
  });

  it('hides the badge when there are no active filters', () => {
    renderToolbar({ activeFilterCount: 0 });
    const trigger = screen.getByRole('button', { name: 'Filter' });
    expect(trigger.textContent).not.toMatch(/\d/);
  });
});
