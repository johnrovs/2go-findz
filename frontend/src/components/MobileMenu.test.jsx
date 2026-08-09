import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MobileMenu from './MobileMenu.jsx';

function Harness({ isOpen, onClose }) {
  return (
    <MemoryRouter>
      <button type="button">Open menu</button>
      <MobileMenu isOpen={isOpen} onClose={onClose} />
    </MemoryRouter>
  );
}

describe('MobileMenu', () => {
  it('renders the updated nav item list', () => {
    render(<Harness isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Best Sellers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comparisons' })).not.toBeInTheDocument();
  });

  it('links Search to the real /products catalog', () => {
    render(<Harness isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: /search/i })).toHaveAttribute('href', '/products');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Harness isOpen onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('moves focus into the drawer when opened', () => {
    render(<Harness isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus();
  });

  it('traps Tab focus within the drawer', () => {
    render(<Harness isOpen onClose={vi.fn()} />);
    const focusable = screen.getAllByRole('link');
    focusable[focusable.length - 1].focus();

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(focusable[0]).toHaveFocus();
  });

  it('traps Shift+Tab focus within the drawer', () => {
    render(<Harness isOpen onClose={vi.fn()} />);
    const focusable = screen.getAllByRole('link');
    focusable[0].focus();

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });

    expect(focusable[focusable.length - 1]).toHaveFocus();
  });

  it('restores focus to the previously focused trigger element on close', () => {
    const { rerender } = render(<Harness isOpen={false} onClose={vi.fn()} />);
    screen.getByRole('button', { name: 'Open menu' }).focus();
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();

    rerender(<Harness isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Home' })).toHaveFocus();

    rerender(<Harness isOpen={false} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveFocus();
  });
});
