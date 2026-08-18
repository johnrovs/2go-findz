import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductForm from './ProductForm.jsx';

const categories = [
  { id: 1, productCategoryName: 'Electronics' },
  { id: 2, productCategoryName: 'Home Goods' },
];

describe('ProductForm', () => {
  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Product name is required.')).toBeInTheDocument();
    expect(screen.getByText('Description is required.')).toBeInTheDocument();
    expect(screen.getByText('Category is required.')).toBeInTheDocument();
    expect(screen.getByText('Price is required.')).toBeInTheDocument();
    expect(screen.getByText('Product URL is required.')).toBeInTheDocument();
  });

  it('rejects a non-HTTPS product link', async () => {
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'http://amazon.com/dp/example');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Product URL must be a valid HTTPS link.')).toBeInTheDocument();
  });

  it('submits the expected payload for a new product', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.type(screen.getByLabelText('SKU'), 'SKU-001');
    await user.click(screen.getByRole('switch', { name: 'Trending' }));
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: null,
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: true,
      bestSeller: false,
      active: true,
      brand: null,
      scheduledPublishAt: null,
      sku: 'SKU-001',
    });
  });

  it('pre-fills fields and submits an update payload when editing', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const product = {
      id: 5,
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: 'img_existing.webp',
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: true,
      active: true,
      sku: 'SKU-EXIST',
    };
    render(<ProductForm product={product} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Product Name')).toHaveValue('Wireless Earbuds');
    expect(screen.getByLabelText('Category')).toHaveValue('1');
    expect(screen.getByRole('switch', { name: 'Best Seller' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: 'img_existing.webp',
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: true,
      active: true,
      brand: null,
      scheduledPublishAt: null,
      sku: 'SKU-EXIST',
    });
  });

  it('renders a server-side field error under the matching input', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: 'Validation failed.',
      fieldErrors: { productLink: 'Product URL must be a valid HTTPS link.' },
    });
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Product URL must be a valid HTTPS link.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('submits a trimmed brand value', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.type(screen.getByLabelText('Brand'), '  Sony  ');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ brand: 'Sony' }));
  });

  it('hides the Active switch and shows a date/time field when Schedule for later is toggled on', async () => {
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('switch', { name: 'Active' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Publish Date & Time')).not.toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Schedule for later' }));

    expect(screen.queryByRole('switch', { name: 'Active' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Publish Date & Time')).toBeInTheDocument();
  });

  it('requires a scheduled date when Schedule for later is on', async () => {
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('switch', { name: 'Schedule for later' }));
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Scheduled date is required.')).toBeInTheDocument();
  });

  it('rejects a scheduled date that is not in the future', async () => {
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('switch', { name: 'Schedule for later' }));
    await user.type(screen.getByLabelText('Publish Date & Time'), '2020-01-01T10:00');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Scheduled date must be in the future.')).toBeInTheDocument();
  });

  it('submits active:false and an ISO scheduled date when scheduling is on', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('switch', { name: 'Schedule for later' }));
    await user.type(screen.getByLabelText('Publish Date & Time'), '2030-06-15T10:00');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        active: false,
        scheduledPublishAt: '2030-06-15T10:00:00',
      })
    );
  });

  it('pre-fills the schedule switch and date when editing a product that already has a scheduledPublishAt', async () => {
    const product = {
      id: 5,
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: null,
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: false,
      active: false,
      scheduledPublishAt: '2030-06-15T10:00:00',
    };
    render(<ProductForm product={product} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('switch', { name: 'Schedule for later' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Publish Date & Time')).toHaveValue('2030-06-15T10:00');
  });

  it('shows a live character counter for the description field', async () => {
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText('0 / 500')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Description'), 'Hello');

    expect(screen.getByText('5 / 500')).toBeInTheDocument();
  });

  it('caps the description field at 500 characters', () => {
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Description')).toHaveAttribute('maxLength', '500');
  });
});
