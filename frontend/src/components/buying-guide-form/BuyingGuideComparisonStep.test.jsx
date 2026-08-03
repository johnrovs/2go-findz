import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideComparisonStep from './BuyingGuideComparisonStep.jsx';

const products = [{ id: 1, name: 'Soundcore Liberty 4 NC', productPrice: '69.99', imageFileName: null }];

describe('BuyingGuideComparisonStep', () => {
  it('renders the heading, products panel, and specifications editor', () => {
    render(
      <BuyingGuideComparisonStep
        comparisonSpecs={[]}
        onChange={vi.fn()}
        recommendedProducts={products}
        fieldErrors={{}}
        onManageProducts={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: 'Product Comparison' })).toBeInTheDocument();
    expect(screen.getByText('Products in This Comparison (1)')).toBeInTheDocument();
    expect(screen.getByText('No specifications yet')).toBeInTheDocument();
  });

  it('toggles the How it works panel', async () => {
    const user = userEvent.setup();
    render(
      <BuyingGuideComparisonStep
        comparisonSpecs={[]}
        onChange={vi.fn()}
        recommendedProducts={products}
        fieldErrors={{}}
        onManageProducts={vi.fn()}
      />
    );
    expect(screen.queryByText(/each product appears as a column/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /how it works/i }));

    expect(screen.getByText(/each product appears as a column/i)).toBeInTheDocument();
  });

  it('forwards onManageProducts to the products panel', async () => {
    const onManageProducts = vi.fn();
    const user = userEvent.setup();
    render(
      <BuyingGuideComparisonStep
        comparisonSpecs={[]}
        onChange={vi.fn()}
        recommendedProducts={products}
        fieldErrors={{}}
        onManageProducts={onManageProducts}
      />
    );

    await user.click(screen.getByRole('button', { name: /manage in products step/i }));

    expect(onManageProducts).toHaveBeenCalled();
  });
});
