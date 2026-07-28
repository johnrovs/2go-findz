import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MobileMenu from './MobileMenu.jsx';

function renderMenu(props) {
  return render(
    <MemoryRouter>
      <MobileMenu isOpen onClose={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

describe('MobileMenu', () => {
  it('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <MobileMenu isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('renders the nav links, a Compare link, and a search link when open', () => {
    renderMenu();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Best Sellers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /search/i })).toHaveAttribute('href', '/#catalog');
  });

  it('renders the Buying Guides link', () => {
    renderMenu();
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toHaveAttribute('href', '/buying-guides');
  });

  it('renders the Comparisons link', () => {
    renderMenu();
    expect(screen.getByRole('link', { name: 'Comparisons' })).toHaveAttribute('href', '/comparisons');
  });

  it('calls onClose when a nav link is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onClose });

    await user.click(screen.getByRole('link', { name: 'Trending' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the search link is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onClose });

    await user.click(screen.getByRole('link', { name: /search/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onClose });

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('shows no compare count badge when compareCount is 0', () => {
    renderMenu({ compareCount: 0 });
    expect(screen.getByRole('link', { name: 'Compare' })).not.toHaveTextContent(/\d/);
  });

  it('shows the compare count badge when compareCount is greater than 0', () => {
    renderMenu({ compareCount: 3 });
    // Same reasoning as Navbar's equivalent test: the badge digit is part of the link's
    // accessible name once it renders, so an exact "Compare" match would miss it.
    expect(screen.getByRole('link', { name: /compare/i })).toHaveTextContent('3');
  });
});
