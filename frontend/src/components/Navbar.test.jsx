import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Navbar from './Navbar.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as categoryService from '../services/categoryService.js';

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

function renderNavbar(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <Navbar />
        <Routes>
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([{ id: 1, productCategoryName: 'Electronics' }]);
  });

  it('renders the main nav links', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Categories' })).toBeInTheDocument();
  });

  it('no longer renders Best Sellers or Comparisons in the nav', () => {
    renderNavbar();
    expect(screen.queryByRole('link', { name: 'Best Sellers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comparisons' })).not.toBeInTheDocument();
  });

  it('highlights the active route in white', () => {
    renderNavbar(['/trending']);
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveClass('text-white');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('text-white');
  });

  it('opens the categories dropdown and lists fetched categories', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Categories' }));

    expect(await screen.findByRole('menuitem', { name: 'Electronics' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'All Categories' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('menuitem', { name: 'Electronics' })).toHaveAttribute('href', '/categories?category=1');
  });

  it('closes the categories dropdown on outside click', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByRole('button', { name: 'Categories' }));
    await screen.findByRole('menuitem', { name: 'Electronics' });

    await user.click(document.body);

    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Electronics' })).not.toBeInTheDocument());
  });

  it('opens the mobile menu when the hamburger button is clicked', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getAllByRole('link', { name: 'Trending' }).length).toBeGreaterThan(1);
  });

  it('navigates to /products with the typed query when search is submitted', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.type(screen.getByLabelText('Search products'), 'wireless earbuds');
    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/products?search=wireless%20earbuds');
  });

  it('navigates to /products with no query when search is submitted empty', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/products');
  });

  it('hides the header when printing', () => {
    renderNavbar();
    expect(screen.getByRole('banner')).toHaveClass('print:hidden');
  });

  it('shows no compare count badge when nothing is selected', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Compare' })).not.toHaveTextContent(/\d/);
  });

  it('shows the compare count badge once products are selected', () => {
    localStorage.setItem('compareProductIds', JSON.stringify([1, 2]));
    renderNavbar();
    expect(screen.getByRole('link', { name: /compare/i })).toHaveTextContent('2');
  });

  it('renders the logo at a fixed height with its natural width, not forced into a square', () => {
    renderNavbar();
    const logo = screen.getByRole('img', { name: '2Go Findz' });
    expect(logo).toHaveClass('h-10', 'w-auto');
  });
});
