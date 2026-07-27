import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HeroBannerForm from './HeroBannerForm.jsx';

describe('HeroBannerForm', () => {
  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(<HeroBannerForm banner={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add Slide' }));

    expect(await screen.findByText('A slide image is required.')).toBeInTheDocument();
    expect(screen.getByText('Image alt text is required.')).toBeInTheDocument();
    expect(screen.getByText('Headline is required.')).toBeInTheDocument();
    expect(screen.getByText('Button text is required.')).toBeInTheDocument();
    expect(screen.getByText('Button link is required.')).toBeInTheDocument();
  });

  it('rejects a button link that is not an internal path', async () => {
    const user = userEvent.setup();
    render(<HeroBannerForm banner={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Button Link'), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Add Slide' }));

    expect(await screen.findByText('Button link must be an internal path starting with /.')).toBeInTheDocument();
  });

  it('pre-fills fields and submits an update payload when editing', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const banner = {
      id: 1,
      imageFilename: 'img_existing.webp',
      imageAlt: 'Existing slide image',
      badge: 'Trending Today',
      headline: 'Amazon Finds Everyone Is Talking About',
      description: 'Discover trending products.',
      buttonText: 'Explore Trending Finds',
      buttonLink: '/trending',
      displayOrder: 1,
      active: true,
    };
    render(<HeroBannerForm banner={banner} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Headline')).toHaveValue('Amazon Finds Everyone Is Talking About');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      imageFilename: 'img_existing.webp',
      imageAlt: 'Existing slide image',
      badge: 'Trending Today',
      headline: 'Amazon Finds Everyone Is Talking About',
      description: 'Discover trending products.',
      buttonText: 'Explore Trending Finds',
      buttonLink: '/trending',
      displayOrder: 1,
      active: true,
    });
  });

  it('renders a server-side field error under the matching input', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: 'Validation failed.',
      fieldErrors: { buttonLink: 'Button link must be an internal path starting with /.' },
    });
    const user = userEvent.setup();
    const banner = {
      id: 1,
      imageFilename: 'img_existing.webp',
      imageAlt: 'Existing slide image',
      badge: null,
      headline: 'Test Headline',
      description: null,
      buttonText: 'Learn More',
      buttonLink: '/trending',
      displayOrder: 1,
      active: true,
    };
    render(<HeroBannerForm banner={banner} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Button link must be an internal path starting with /.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
