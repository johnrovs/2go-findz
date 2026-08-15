import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CategoryForm from './CategoryForm.jsx';
import * as adminImageService from '../services/adminImageService.js';

describe('CategoryForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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

    expect(onSubmit).toHaveBeenCalledWith({
      productCategoryName: 'Electronics',
      commissionRate: 4.5,
      imageFileName: null,
    });
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

    expect(onSubmit).toHaveBeenCalledWith({
      productCategoryName: 'Electronics',
      commissionRate: 5,
      imageFileName: null,
    });
  });

  it('renders an image uploader, pre-filled from the category when editing', () => {
    render(
      <CategoryForm
        category={{ id: 1, productCategoryName: 'Electronics', commissionRate: 4, imageFileName: 'img_electronics.jpg' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Category Image')).toBeInTheDocument();
    expect(screen.getByAltText('Product preview')).toHaveAttribute('src', expect.stringContaining('img_electronics.jpg'));
  });

  it('includes the uploaded imageFileName in the submit payload', async () => {
    vi.spyOn(adminImageService, 'uploadImage').mockResolvedValue({ filename: 'img_new_upload.jpg' });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<CategoryForm category={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    const file = new File(['fake-image-bytes'], 'category.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('Upload product image'), file);
    await screen.findByAltText('Product preview');

    await user.type(screen.getByLabelText('Category Name'), 'Electronics');
    await user.type(screen.getByLabelText('Commission Rate (%)'), '4.5');
    await user.click(screen.getByRole('button', { name: 'Add Category' }));

    expect(onSubmit).toHaveBeenCalledWith({
      productCategoryName: 'Electronics',
      commissionRate: 4.5,
      imageFileName: 'img_new_upload.jpg',
    });
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
