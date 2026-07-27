import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideForm from './BuyingGuideForm.jsx';
import * as adminProductService from '../services/adminProductService.js';

describe('BuyingGuideForm', () => {
  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(<BuyingGuideForm guide={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add Guide' }));

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Excerpt is required.')).toBeInTheDocument();
    expect(screen.getByText('Content is required.')).toBeInTheDocument();
  });

  it('submits the expected payload for a new guide', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<BuyingGuideForm guide={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'Best Kitchen Gadgets 2026');
    await user.type(screen.getByLabelText('Excerpt'), 'A quick roundup.');
    await user.type(screen.getByLabelText('Content'), 'Full article body.');
    await user.click(screen.getByRole('button', { name: 'Add Guide' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Best Kitchen Gadgets 2026',
      excerpt: 'A quick roundup.',
      content: 'Full article body.',
      coverImageFilename: null,
      active: true,
      recommendedProductIds: [],
    });
  });

  it('pre-fills fields and submits an update payload when editing, preserving recommended products', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const guide = {
      id: 5,
      title: 'Existing Guide',
      excerpt: 'Existing excerpt.',
      content: 'Existing content.',
      coverImageFilename: 'img_existing.webp',
      active: true,
      recommendedProducts: [{ id: 1, name: 'Wireless Earbuds' }],
    };
    render(<BuyingGuideForm guide={guide} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Title')).toHaveValue('Existing Guide');
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Existing Guide',
      excerpt: 'Existing excerpt.',
      content: 'Existing content.',
      coverImageFilename: 'img_existing.webp',
      active: true,
      recommendedProductIds: [1],
    });
  });

  it('adds a searched product to the recommended list before submitting', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [{ id: 2, name: 'Smart Watch' }],
    });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<BuyingGuideForm guide={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'Title');
    await user.type(screen.getByLabelText('Excerpt'), 'Excerpt');
    await user.type(screen.getByLabelText('Content'), 'Content');
    await user.type(screen.getByLabelText('Recommended Products'), 'watch');
    await user.click(await screen.findByRole('button', { name: 'Smart Watch' }));
    await user.click(screen.getByRole('button', { name: 'Add Guide' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ recommendedProductIds: [2] }));
  });
});
