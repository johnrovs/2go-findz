import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import MobileFilterDrawer from './MobileFilterDrawer.jsx';

const CATEGORIES = [{ id: 1, productCategoryName: 'Electronics' }];
const BRANDS = ['Sony'];

function renderDrawer(props = {}) {
  const onClose = vi.fn();
  const onApply = vi.fn();
  const onClear = vi.fn();
  const utils = render(
    <MobileFilterDrawer
      isOpen
      onClose={onClose}
      categories={CATEGORIES}
      brands={BRANDS}
      selectedCategories={[]}
      selectedBrands={[]}
      onApply={onApply}
      onClear={onClear}
      {...props}
    />
  );
  return { ...utils, onClose, onApply, onClear };
}

describe('MobileFilterDrawer', () => {
  it('renders nothing when closed', () => {
    render(
      <MobileFilterDrawer
        isOpen={false}
        onClose={vi.fn()}
        categories={CATEGORIES}
        brands={BRANDS}
        selectedCategories={[]}
        selectedBrands={[]}
        onApply={vi.fn()}
        onClear={vi.fn()}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders an accessible dialog containing the filter sidebar content when open', () => {
    renderDrawer();
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Electronics' })).toBeInTheDocument();
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDrawer();

    await user.click(screen.getByTestId('mobile-filter-drawer-backdrop'));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDrawer();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderDrawer();

    await user.click(screen.getByRole('button', { name: 'Close filters' }));

    expect(onClose).toHaveBeenCalled();
  });
});
