import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SearchModal from './SearchModal.jsx';
import * as productService from '../services/productService.js';

const product = {
  id: 1,
  name: 'Wireless Earbuds',
  imageFileName: null,
  productPrice: '49.99',
};

function renderModal(props) {
  return render(
    <MemoryRouter>
      <SearchModal isOpen onClose={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

describe('SearchModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows live results as the user types', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [product],
      totalPages: 1,
      totalElements: 1,
    });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Search products'), 'earbuds');

    expect(await screen.findByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  it('shows a "No products found" empty state when there are no matches', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Search products'), 'zzz');

    expect(await screen.findByText('No products found')).toBeInTheDocument();
  });

  it('shows an error state when the search fails', async () => {
    vi.spyOn(productService, 'searchProducts').mockRejectedValue({
      message: 'Network error. Please try again.',
    });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Search products'), 'earbuds');

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();
  });

  it('navigates to the catalog with the search term and closes when a result is clicked', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [product],
      totalPages: 1,
      totalElements: 1,
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/trending']}>
        <Routes>
          <Route path="/trending" element={<SearchModal isOpen onClose={onClose} />} />
          <Route path="/" element={<div>Homepage Catalog</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Search products'), 'earbuds');
    await screen.findByText('Wireless Earbuds');
    await user.click(screen.getByText('Wireless Earbuds'));

    expect(onClose).toHaveBeenCalled();
    expect(await screen.findByText('Homepage Catalog')).toBeInTheDocument();
  });
});
