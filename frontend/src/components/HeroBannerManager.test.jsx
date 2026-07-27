import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../context/ToastContext.jsx';
import HeroBannerManager from './HeroBannerManager.jsx';
import * as adminHeroBannerService from '../services/adminHeroBannerService.js';
import * as adminImageService from '../services/adminImageService.js';

const banners = [
  {
    id: 1,
    imageFilename: 'img_1.webp',
    imageAlt: 'Trending gadgets',
    badge: 'Trending Today',
    headline: 'Amazon Finds Everyone Is Talking About',
    description: 'Discover trending products.',
    buttonText: 'Explore Trending Finds',
    buttonLink: '/trending',
    displayOrder: 1,
    active: true,
  },
];

function renderManager() {
  return render(
    <ToastProvider>
      <HeroBannerManager />
    </ToastProvider>
  );
}

describe('HeroBannerManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminHeroBannerService, 'getHeroBanners').mockResolvedValue(banners);
  });

  it('renders fetched hero banner slides', async () => {
    renderManager();

    expect(await screen.findByText('Amazon Finds Everyone Is Talking About')).toBeInTheDocument();
    expect(screen.getByText('Trending Today')).toBeInTheDocument();
  });

  it('shows an empty state when there are no slides', async () => {
    adminHeroBannerService.getHeroBanners.mockResolvedValue([]);
    renderManager();

    expect(await screen.findByText('No hero banner slides yet')).toBeInTheDocument();
  });

  it('creates a slide and shows a success toast', async () => {
    vi.spyOn(adminImageService, 'uploadImage').mockResolvedValue({ filename: 'img_2.webp' });
    vi.spyOn(adminHeroBannerService, 'createHeroBanner').mockResolvedValue({
      id: 2,
      imageFilename: 'img_2.webp',
      imageAlt: 'Category showcase',
      badge: null,
      headline: 'Find the Right Product Faster',
      description: null,
      buttonText: 'Browse Categories',
      buttonLink: '/categories',
      displayOrder: 2,
      active: true,
    });
    const user = userEvent.setup();
    renderManager();
    await screen.findByText('Amazon Finds Everyone Is Talking About');

    await user.click(screen.getByRole('button', { name: 'Add Slide' }));
    const dialog = screen.getByRole('dialog');

    const file = new File(['content'], 'photo.webp', { type: 'image/webp' });
    fireEvent.change(within(dialog).getByLabelText(/upload image/i), { target: { files: [file] } });
    await waitFor(() => expect(adminImageService.uploadImage).toHaveBeenCalled());

    await user.type(within(dialog).getByLabelText('Image Alt Text'), 'Category showcase');
    await user.type(within(dialog).getByLabelText('Headline'), 'Find the Right Product Faster');
    await user.type(within(dialog).getByLabelText('Button Text'), 'Browse Categories');
    await user.type(within(dialog).getByLabelText('Button Link'), '/categories');
    await user.click(within(dialog).getByRole('button', { name: 'Add Slide' }));

    expect(await screen.findByText('Find the Right Product Faster')).toBeInTheDocument();
    expect(await screen.findByText('Hero banner slide created successfully.')).toBeInTheDocument();
  });

  it('deletes a slide after confirmation with destructive styling and shows a success toast', async () => {
    vi.spyOn(adminHeroBannerService, 'deleteHeroBanner').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderManager();
    await screen.findByText('Amazon Finds Everyone Is Talking About');

    await user.click(screen.getByRole('button', { name: /Delete Amazon Finds Everyone Is Talking About/i }));
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    expect(confirmButton).toHaveClass('bg-red-600');
    await user.click(confirmButton);

    await waitFor(() => expect(adminHeroBannerService.deleteHeroBanner).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Hero banner slide deleted successfully.')).toBeInTheDocument();
  });
});
