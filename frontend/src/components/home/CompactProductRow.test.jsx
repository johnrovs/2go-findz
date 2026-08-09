import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CompactProductRow from './CompactProductRow.jsx';
import * as trackingService from '../../services/trackingService.js';

const product = {
  id: 1,
  name: 'Desk Lamp',
  imageFileName: null,
  productLink: 'https://amazon.com/dp/example',
};

describe('CompactProductRow', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the product name', () => {
    render(<CompactProductRow product={product} />);
    expect(screen.getByText('Desk Lamp')).toBeInTheDocument();
  });

  it('links the whole row to the real Amazon product link with safe rel attributes', () => {
    render(<CompactProductRow product={product} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', product.productLink);
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('records a click with the stored session id when clicked', async () => {
    sessionStorage.setItem('sessionId', 'test-session-abc');
    vi.spyOn(trackingService, 'recordClick').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CompactProductRow product={product} />);

    await user.click(screen.getByRole('link'));

    expect(trackingService.recordClick).toHaveBeenCalledWith(product.id, 'test-session-abc');
  });
});
