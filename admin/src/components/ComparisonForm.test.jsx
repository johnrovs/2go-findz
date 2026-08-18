import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonForm from './ComparisonForm.jsx';
import * as adminProductService from '../services/adminProductService.js';
import * as adminComparisonService from '../services/adminComparisonService.js';

const categories = [{ id: 1, productCategoryName: 'Electronics' }];
const productA = { id: 10, name: 'Wireless Earbuds' };
const productB = { id: 20, name: 'Smart Watch' };

function renderForm(props = {}) {
  return render(
    <ComparisonForm comparison={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} {...props} />
  );
}

describe('ComparisonForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the Basic Info tab by default', () => {
    renderForm();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('URL Slug (optional)')).toBeInTheDocument();
  });

  it('switches to the Products tab and shows the product search', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Products' }));

    expect(screen.getByLabelText('Compared Products')).toBeInTheDocument();
  });

  it('shows validation errors when submitted with empty required fields', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Add Comparison' }));

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Description is required.')).toBeInTheDocument();
    expect(screen.getByText('Category is required.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Products' }));
    expect(screen.getByText('A comparison must include at least 2 products.')).toBeInTheDocument();
  });

  it('adds a product to the Products tab via search', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA] });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.type(screen.getByLabelText('Compared Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));

    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByLabelText('Recommendation')).toBeInTheDocument();
  });

  it('shows a pros/cons validation error when only one is filled in for a product', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA, productB] });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Title'), 'Test Comparison');
    await user.type(screen.getByLabelText('Description'), 'A test description.');
    await user.selectOptions(screen.getByLabelText('Category'), '1');

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.type(screen.getByLabelText('Compared Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));
    await user.type(screen.getByLabelText('Compared Products'), 'watch');
    await user.click(await screen.findByRole('button', { name: 'Smart Watch' }));

    await user.type(screen.getAllByLabelText('Pros')[0], 'Great sound');

    await user.click(screen.getByRole('button', { name: 'Add Comparison' }));

    expect(await screen.findByText('Pros and cons must both be provided, or both left blank.')).toBeInTheDocument();
  });

  it('auto-syncs the spec table when a product is added, adding a value column', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA] });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.type(screen.getByLabelText('Compared Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));

    await user.click(screen.getByRole('button', { name: 'Spec Table' }));
    await user.click(screen.getByRole('button', { name: 'Add Row' }));

    expect(screen.getByLabelText('Wireless Earbuds')).toBeInTheDocument();
  });

  it('removes a spec table value column when its product is removed', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA] });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.type(screen.getByLabelText('Compared Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));

    await user.click(screen.getByRole('button', { name: 'Spec Table' }));
    await user.click(screen.getByRole('button', { name: 'Add Row' }));
    expect(screen.getByLabelText('Wireless Earbuds')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.click(screen.getByRole('button', { name: 'Remove Wireless Earbuds' }));

    await user.click(screen.getByRole('button', { name: 'Spec Table' }));
    expect(screen.queryByLabelText('Wireless Earbuds')).not.toBeInTheDocument();
  });

  it('adds a section and a FAQ entry', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Sections' }));
    await user.click(screen.getByRole('button', { name: 'Add Section' }));
    expect(screen.getByLabelText('Heading')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'FAQ' }));
    await user.click(screen.getByRole('button', { name: 'Add FAQ' }));
    expect(screen.getByLabelText('Question')).toBeInTheDocument();
  });

  it('adds a related product and a related comparison in the Related tab', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productB] });
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([{ id: 99, title: 'Best Blenders' }]);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Related' }));
    await waitFor(() => expect(adminComparisonService.getComparisons).toHaveBeenCalled());

    await user.type(screen.getByLabelText('Related Products'), 'watch');
    await user.click(await screen.findByRole('button', { name: 'Smart Watch' }));

    await user.type(screen.getByLabelText('Related Comparisons'), 'blenders');
    await user.click(await screen.findByRole('button', { name: 'Best Blenders' }));

    expect(screen.getByText('Smart Watch')).toBeInTheDocument();
    expect(screen.getByText('Best Blenders')).toBeInTheDocument();
  });

  it('submits the expected payload when all required fields are valid', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA, productB] });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await user.type(screen.getByLabelText('Title'), 'Test Comparison');
    await user.type(screen.getByLabelText('Description'), 'A test description.');
    await user.selectOptions(screen.getByLabelText('Category'), '1');

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.type(screen.getByLabelText('Compared Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));
    await user.type(screen.getByLabelText('Compared Products'), 'watch');
    await user.click(await screen.findByRole('button', { name: 'Smart Watch' }));

    await user.type(screen.getAllByLabelText('Recommendation')[0], 'Great pick.');
    await user.type(screen.getAllByLabelText('Best For')[0], 'Everyone');
    await user.type(screen.getAllByLabelText('Main Strength')[0], 'Sound');
    await user.type(screen.getAllByLabelText('Main Weakness')[0], 'Price');
    await user.type(screen.getAllByLabelText('Recommendation')[1], 'Great budget pick.');
    await user.type(screen.getAllByLabelText('Best For')[1], 'Budget shoppers');
    await user.type(screen.getAllByLabelText('Main Strength')[1], 'Price');
    await user.type(screen.getAllByLabelText('Main Weakness')[1], 'Sound');

    await user.click(screen.getByRole('button', { name: 'Add Comparison' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.title).toBe('Test Comparison');
    expect(payload.products).toHaveLength(2);
    expect(payload.products[0].productId).toBe(10);
    expect(payload.products[0].recommendation).toBe('Great pick.');
    expect(payload.specRows).toEqual([]);
    expect(payload.sections).toEqual([]);
    expect(payload.faqs).toEqual([]);
    expect(payload.relatedComparisonIds).toEqual([]);
    expect(payload.relatedProductIds).toEqual([]);
  });

  it('pre-fills all tabs when editing an existing comparison', () => {
    const comparison = {
      id: 5,
      title: 'Existing Comparison',
      slug: 'existing-comparison',
      description: 'Existing description.',
      coverImageFilename: null,
      categoryId: 1,
      seoTitle: '',
      seoDescription: '',
      published: true,
      products: [
        {
          id: 1,
          product: { id: 10, name: 'Wireless Earbuds' },
          badge: 'Best Overall',
          recommendation: 'Great pick.',
          bestFor: 'Everyone',
          mainStrength: 'Sound',
          mainWeakness: 'Price',
          pros: 'Loud',
          cons: 'Pricey',
          editorsScore: 8.5,
        },
        {
          id: 2,
          product: { id: 20, name: 'Smart Watch' },
          badge: null,
          recommendation: 'Great budget pick.',
          bestFor: 'Budget shoppers',
          mainStrength: 'Price',
          mainWeakness: 'Sound',
          pros: null,
          cons: null,
          editorsScore: null,
        },
      ],
      specRows: [],
      sections: [],
      faqs: [],
      relatedComparisons: [],
      relatedProducts: [],
    };

    render(<ComparisonForm comparison={comparison} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Title')).toHaveValue('Existing Comparison');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });
});
