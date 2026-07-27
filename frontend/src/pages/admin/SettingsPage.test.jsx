import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../../context/ToastContext.jsx';
import SettingsPage from './SettingsPage.jsx';
import * as adminSettingsService from '../../services/adminSettingsService.js';
import * as adminImageService from '../../services/adminImageService.js';

const settings = {
  logoImageFilename: 'img_logo.webp',
  heroImageFilename: null,
  placeholderImageFilename: null,
  tiktokUrl: 'https://tiktok.com/@2gofindz',
  pinterestUrl: '',
  instagramUrl: '',
  youtubeUrl: '',
  shopBio: 'Curated Amazon finds.',
  heroHeadline: 'Smart Finds. Better Buys.',
  heroDescription: 'Discover trending products.',
  affiliateDisclosure: 'As an Amazon Associate, 2Go Findz may earn from qualifying purchases.',
  contactEmail: 'hello@2gofindz.com',
};

function renderPage() {
  return render(
    <ToastProvider>
      <SettingsPage />
    </ToastProvider>
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminSettingsService, 'getSettings').mockResolvedValue(settings);
  });

  it('loads and pre-fills the existing settings', async () => {
    renderPage();

    expect(await screen.findByLabelText('Hero Headline')).toHaveValue('Smart Finds. Better Buys.');
    expect(screen.getByLabelText('TikTok URL')).toHaveValue('https://tiktok.com/@2gofindz');
    expect(screen.getByLabelText('Contact Email')).toHaveValue('hello@2gofindz.com');
  });

  it('shows a validation error when affiliate disclosure is cleared', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    await user.clear(screen.getByLabelText('Affiliate Disclosure'));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Affiliate disclosure is required.')).toBeInTheDocument();
  });

  it('rejects an invalid contact email format', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    const emailInput = screen.getByLabelText('Contact Email');
    await user.clear(emailInput);
    await user.type(emailInput, 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Contact email must be a valid email address.')).toBeInTheDocument();
  });

  it('allows an empty contact email', async () => {
    vi.spyOn(adminSettingsService, 'updateSettings').mockResolvedValue(settings);
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    await user.clear(screen.getByLabelText('Contact Email'));
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(adminSettingsService.updateSettings).toHaveBeenCalled());
    expect(screen.queryByText('Contact email must be a valid email address.')).not.toBeInTheDocument();
  });

  it('submits the full settings payload including untouched fields', async () => {
    vi.spyOn(adminSettingsService, 'updateSettings').mockResolvedValue(settings);
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    const headlineInput = screen.getByLabelText('Hero Headline');
    await user.clear(headlineInput);
    await user.type(headlineInput, 'New Headline');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(adminSettingsService.updateSettings).toHaveBeenCalledWith({
        ...settings,
        heroHeadline: 'New Headline',
      })
    );
  });

  it('uploads an image and includes the returned filename in the submit payload', async () => {
    vi.spyOn(adminImageService, 'uploadImage').mockResolvedValue({ filename: 'img_new_hero.webp' });
    vi.spyOn(adminSettingsService, 'updateSettings').mockResolvedValue(settings);
    renderPage();
    await screen.findByLabelText('Hero Headline');

    const heroUploadInput = screen.getAllByLabelText(/upload image/i)[1];
    const file = new File(['content'], 'hero.webp', { type: 'image/webp' });
    fireEvent.change(heroUploadInput, { target: { files: [file] } });

    await waitFor(() => expect(adminImageService.uploadImage).toHaveBeenCalled());

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() =>
      expect(adminSettingsService.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ heroImageFilename: 'img_new_hero.webp' })
      )
    );
  });

  it('shows a success toast after saving', async () => {
    vi.spyOn(adminSettingsService, 'updateSettings').mockResolvedValue(settings);
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Settings updated successfully.')).toBeInTheDocument();
  });

  it('renders a server-side field error under the matching input', async () => {
    vi.spyOn(adminSettingsService, 'updateSettings').mockRejectedValue({
      message: 'Validation failed.',
      fieldErrors: { contactEmail: 'Contact email must be a valid email address.' },
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByLabelText('Hero Headline');

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Contact email must be a valid email address.')).toBeInTheDocument();
  });

  it('shows an error state with retry when the initial load fails', async () => {
    adminSettingsService.getSettings.mockRejectedValueOnce({ message: 'Network error. Please try again.' });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();

    adminSettingsService.getSettings.mockResolvedValueOnce(settings);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByLabelText('Hero Headline')).toBeInTheDocument();
  });
});
