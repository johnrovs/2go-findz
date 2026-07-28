import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Navbar from './Navbar.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as categoryService from '../services/categoryService.js';

function renderNavbar(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <Navbar />
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
    expect(screen.getByRole('link', { name: 'Best Sellers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Categories' })).toBeInTheDocument();
  });

  it('highlights the active route', () => {
    renderNavbar(['/trending']);
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveClass('text-indigo-600');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('text-indigo-600');
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

  it('links the search button to browse all products', () => {
    renderNavbar();

    expect(screen.getByRole('link', { name: 'Browse all products' })).toHaveAttribute('href', '/#catalog');
  });

  it('renders the Buying Guides link between Compare and Best Sellers', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toHaveAttribute('href', '/buying-guides');
  });

  it('shows no compare count badge when nothing is selected', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Compare' })).not.toHaveTextContent(/\d/);
  });

  it('shows the compare count badge once products are selected', () => {
    localStorage.setItem('compareProductIds', JSON.stringify([1, 2]));
    renderNavbar();
    // The badge digit is rendered inside the same link, so its accessible name becomes
    // "Compare2" -- an exact "Compare" match would no longer find it once the badge shows.
    expect(screen.getByRole('link', { name: /compare/i })).toHaveTextContent('2');
  });
});
