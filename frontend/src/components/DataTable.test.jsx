import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DataTable from './DataTable.jsx';

const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'rate', label: 'Rate', sortable: true, render: (row) => `${row.rate}%` },
  { key: 'actions', label: 'Actions', render: () => <button>Edit</button> },
];

const rows = [
  { id: 1, name: 'Electronics', rate: 4 },
  { id: 2, name: 'Home', rate: 6 },
];

describe('DataTable', () => {
  it('renders column headers and row data', () => {
    render(<DataTable columns={columns} rows={rows} onSortChange={vi.fn()} emptyState={<p>Empty</p>} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('4%')).toBeInTheDocument();
  });

  it('shows the loading spinner when isLoading is true', () => {
    render(<DataTable columns={columns} rows={[]} isLoading onSortChange={vi.fn()} emptyState={<p>Empty</p>} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the provided empty state when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} onSortChange={vi.fn()} emptyState={<p>Empty</p>} />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('calls onSortChange with the column key when a sortable header is clicked', async () => {
    const onSortChange = vi.fn();
    const user = userEvent.setup();
    render(<DataTable columns={columns} rows={rows} onSortChange={onSortChange} emptyState={<p>Empty</p>} />);

    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenCalledWith('name');
  });

  it('reflects the current sort direction via aria-sort', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        sortKey="name"
        sortDirection="asc"
        onSortChange={vi.fn()}
        emptyState={<p>Empty</p>}
      />
    );
    expect(screen.getByRole('columnheader', { name: /name/i })).toHaveAttribute('aria-sort', 'ascending');
  });

  it('does not render a sort button for non-sortable columns', () => {
    render(<DataTable columns={columns} rows={rows} onSortChange={vi.fn()} emptyState={<p>Empty</p>} />);
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('applies a custom headerClassName when provided, defaulting to bg-primary', () => {
    const { container, rerender } = render(
      <DataTable columns={columns} rows={rows} isLoading={false} emptyState={null} />
    );
    expect(container.querySelector('thead')).toHaveClass('bg-primary');

    rerender(
      <DataTable
        columns={columns}
        rows={rows}
        isLoading={false}
        emptyState={null}
        headerClassName="bg-[linear-gradient(90deg,#5B2CF2_0%,#6D35F5_55%,#5425E8_100%)]"
      />
    );
    expect(container.querySelector('thead')).toHaveClass(
      'bg-[linear-gradient(90deg,#5B2CF2_0%,#6D35F5_55%,#5425E8_100%)]'
    );
    expect(container.querySelector('thead')).not.toHaveClass('bg-primary');
  });
});
