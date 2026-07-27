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
});
