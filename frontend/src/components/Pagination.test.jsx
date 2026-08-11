import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination.jsx';

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a button per page and highlights the current page', () => {
    render(<Pagination page={2} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last page', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
  });

  it('calls onPageChange with the clicked page number', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: '3' }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('truncates a large page count with ellipsis around the current page, first, and last', () => {
    render(<Pagination page={2} totalPages={11} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '11' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '7' })).not.toBeInTheDocument();
    expect(screen.getByText('…')).toBeInTheDocument();
  });

  it('never hardcodes a page count: an 11-page list and a 30-page list both truncate correctly', () => {
    const { rerender } = render(<Pagination page={1} totalPages={11} onPageChange={vi.fn()} />);
    expect(screen.getAllByText('…')).toHaveLength(1);

    rerender(<Pagination page={1} totalPages={30} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '30' })).toBeInTheDocument();
    expect(screen.getAllByText('…')).toHaveLength(1);
  });

  it('supports an activeClassName override for the current page while defaulting to the existing style', () => {
    const { rerender } = render(<Pagination page={2} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '2' })).toHaveClass('bg-primary');

    rerender(
      <Pagination page={2} totalPages={3} onPageChange={vi.fn()} activeClassName="bg-purple-600 text-white" />
    );
    expect(screen.getByRole('button', { name: '2' })).toHaveClass('bg-purple-600');
    expect(screen.getByRole('button', { name: '2' })).not.toHaveClass('bg-primary');
  });
});
