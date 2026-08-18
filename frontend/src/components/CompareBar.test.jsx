import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CompareBar from './CompareBar.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as productService from '../services/productService.js';

const product = {
  id: 1,
  name: 'Wireless Earbuds',
  imageFileName: null,
};

function renderBar(initialIds = []) {
  if (initialIds.length > 0) {
    localStorage.setItem('compareProductIds', JSON.stringify(initialIds));
  }
  return render(
    <MemoryRouter>
      <CompareProvider>
        <CompareBar />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('CompareBar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders nothing when the compare list is empty', () => {
    renderBar([]);
    expect(screen.queryByText(/compare \(/i)).not.toBeInTheDocument();
  });

  it('shows the count and thumbnails when products are selected', async () => {
    vi.spyOn(productService, 'compareProducts').mockResolvedValue([product]);
    renderBar([1]);

    expect(await screen.findByText('Compare (1)')).toBeInTheDocument();
    expect(screen.getByAltText('Wireless Earbuds')).toBeInTheDocument();
  });

  it('removes a product when its remove button is clicked', async () => {
    vi.spyOn(productService, 'compareProducts').mockResolvedValue([product]);
    const user = userEvent.setup();
    renderBar([1]);

    await screen.findByText('Compare (1)');
    await user.click(screen.getByRole('button', { name: 'Remove Wireless Earbuds from compare' }));

    await waitFor(() => expect(screen.queryByText(/compare \(/i)).not.toBeInTheDocument());
  });

  it('clears the entire list when "Clear" is clicked', async () => {
    vi.spyOn(productService, 'compareProducts').mockResolvedValue([product]);
    const user = userEvent.setup();
    renderBar([1]);

    await screen.findByText('Compare (1)');
    await user.click(screen.getByRole('button', { name: 'Clear compare list' }));

    await waitFor(() => expect(screen.queryByText(/compare \(/i)).not.toBeInTheDocument());
  });
});
