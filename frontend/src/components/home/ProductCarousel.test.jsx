import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductCarousel from './ProductCarousel.jsx';

const products = [
  { id: 1, name: 'Wireless Earbuds', imageFileName: null, productLink: 'https://amazon.com/dp/1' },
  { id: 2, name: 'Desk Lamp', imageFileName: null, productLink: 'https://amazon.com/dp/2' },
];

describe('ProductCarousel', () => {
  beforeEach(() => {
    // jsdom does not implement Element.scrollBy; stub it so arrow-click handlers can run.
    Element.prototype.scrollBy = vi.fn();
  });

  it('renders a card for every product', () => {
    render(<ProductCarousel products={products} />);
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByText('Desk Lamp')).toBeInTheDocument();
  });

  it('renders nothing when there are no products', () => {
    const { container } = render(<ProductCarousel products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('disables the previous button at the start of the list', () => {
    render(<ProductCarousel products={products} />);
    expect(screen.getByRole('button', { name: 'Scroll to previous products' })).toBeDisabled();
  });

  it('enables the next button when there is more than one product', () => {
    render(<ProductCarousel products={products} />);
    expect(screen.getByRole('button', { name: 'Scroll to next products' })).toBeEnabled();
  });

  it('disables the next button when there is only one product', () => {
    render(<ProductCarousel products={[products[0]]} />);
    expect(screen.getByRole('button', { name: 'Scroll to next products' })).toBeDisabled();
  });

  it('scrolls forward when the next button is clicked', async () => {
    const user = userEvent.setup();
    render(<ProductCarousel products={products} />);

    await user.click(screen.getByRole('button', { name: 'Scroll to next products' }));

    expect(Element.prototype.scrollBy).toHaveBeenCalled();
  });

  it('overlays the nav buttons on the left/right edges, vertically centered', () => {
    render(<ProductCarousel products={products} />);
    const prevButton = screen.getByRole('button', { name: 'Scroll to previous products' });
    const nextButton = screen.getByRole('button', { name: 'Scroll to next products' });
    expect(prevButton).toHaveClass('absolute', 'left-0', 'top-1/2', '-translate-y-1/2');
    expect(nextButton).toHaveClass('absolute', 'right-0', 'top-1/2', '-translate-y-1/2');
  });
});
