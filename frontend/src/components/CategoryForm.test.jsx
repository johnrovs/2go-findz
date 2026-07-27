import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CategoryForm from './CategoryForm.jsx';

describe('CategoryForm', () => {
  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(<CategoryForm category={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(await screen.findByText('Category name is required.')).toBeInTheDocument();
    expect(screen.getByText('Commission rate is required.')).toBeInTheDocument();
  });

  it('rejects a commission rate outside 0-100', async () => {
    const user = userEvent.setup();
    render(<CategoryForm category={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Category Name'), 'Electronics');
    await user.type(screen.getByLabelText('Commission Rate (%)'), '150');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(await screen.findByText('Commission rate must be between 0 and 100.')).toBeInTheDocument();
  });

  it('submits the expected payload for a new category', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CategoryForm category={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Category Name'), 'Electronics');
    await user.type(screen.getByLabelText('Commission Rate (%)'), '4.5');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(onSubmit).toHaveBeenCalledWith({ productCategoryName: 'Electronics', commissionRate: 4.5 });
  });

  it('pre-fills fields and submits an update payload when editing', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <CategoryForm
        category={{ id: 1, productCategoryName: 'Electronics', commissionRate: 4 }}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Category Name')).toHaveValue('Electronics');
    expect(screen.getByLabelText('Commission Rate (%)')).toHaveValue(4);

    await user.clear(screen.getByLabelText('Commission Rate (%)'));
    await user.type(screen.getByLabelText('Commission Rate (%)'), '5');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit).toHaveBeenCalledWith({ productCategoryName: 'Electronics', commissionRate: 5 });
  });

  it('renders a server-side field error under the name input without a generic banner', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: 'Validation failed.',
      fieldErrors: { productCategoryName: 'A category with this name already exists.' },
    });
    const user = userEvent.setup();
    render(<CategoryForm category={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Category Name'), 'Electronics');
    await user.type(screen.getByLabelText('Commission Rate (%)'), '4');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(await screen.findByText('A category with this name already exists.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
