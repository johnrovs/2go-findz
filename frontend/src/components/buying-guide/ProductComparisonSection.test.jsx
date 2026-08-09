import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductComparisonSection from './ProductComparisonSection.jsx';

const comparisonTable = {
  specificationNames: ['Price', 'Battery Life'],
  rows: [
    { product: { id: 1, name: 'TOZO NC9', imageFileName: null, productLink: 'https://amazon.com/dp/B00A' }, specificationValues: ['$39.99', '40 Hrs'] },
  ],
};

describe('ProductComparisonSection', () => {
  it('renders the numbered heading and the comparison table', () => {
    render(<ProductComparisonSection comparisonTable={comparisonTable} number={2} guideId={3} onProductClick={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /2\. Product Comparison/ })).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows the price notice when a Price specification is present', () => {
    render(<ProductComparisonSection comparisonTable={comparisonTable} number={2} guideId={3} onProductClick={vi.fn()} />);
    expect(screen.getByText(/Prices and availability may change/)).toBeInTheDocument();
  });

  it('omits the price notice when no price specification is shown', () => {
    const withoutPrice = { specificationNames: ['Battery Life'], rows: comparisonTable.rows };
    render(<ProductComparisonSection comparisonTable={withoutPrice} number={2} guideId={3} onProductClick={vi.fn()} />);
    expect(screen.queryByText(/Prices and availability may change/)).not.toBeInTheDocument();
  });

  it('links product names to their Amazon URL and fires onProductClick', async () => {
    const onProductClick = vi.fn();
    const user = userEvent.setup();
    render(<ProductComparisonSection comparisonTable={comparisonTable} number={2} guideId={3} onProductClick={onProductClick} />);

    const link = screen.getByRole('link', { name: 'TOZO NC9' });
    expect(link).toHaveAttribute('href', 'https://amazon.com/dp/B00A');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');

    await user.click(link);
    expect(onProductClick).toHaveBeenCalledWith(expect.objectContaining({ guideId: 3, productId: 1 }));
  });

  it('renders nothing when there is no comparison table', () => {
    const { container } = render(<ProductComparisonSection comparisonTable={null} number={2} guideId={3} onProductClick={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
