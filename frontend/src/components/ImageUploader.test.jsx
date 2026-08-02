import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ImageUploader from './ImageUploader.jsx';
import * as adminImageService from '../services/adminImageService.js';

describe('ImageUploader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a placeholder when there is no image', () => {
    render(<ImageUploader imageFileName={null} onChange={vi.fn()} />);
    expect(screen.queryByAltText('Product preview')).not.toBeInTheDocument();
  });

  it('shows a preview when an image filename is provided', () => {
    render(<ImageUploader imageFileName="img_123.webp" onChange={vi.fn()} />);
    expect(screen.getByAltText('Product preview')).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    render(<ImageUploader imageFileName={null} onChange={vi.fn()} label="Featured Image" />);
    expect(screen.getByText('Featured Image')).toBeInTheDocument();
  });

  it('rejects a file with an unsupported type without uploading', async () => {
    const onChange = vi.fn();
    const uploadSpy = vi.spyOn(adminImageService, 'uploadImage');
    render(<ImageUploader imageFileName={null} onChange={onChange} />);

    // user-event's upload() enforces the input's accept attribute and would silently
    // drop this file before it ever reaches our own validation; fireEvent bypasses that
    // simulated OS-picker filtering so we can verify our defensive check independently
    // (a real browser can still deliver a mismatched file via drag-and-drop).
    const file = new File(['content'], 'photo.gif', { type: 'image/gif' });
    const input = screen.getByLabelText(/upload image/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Only JPG, PNG, and WebP images are allowed.')).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a file over 5MB without uploading', async () => {
    const onChange = vi.fn();
    const uploadSpy = vi.spyOn(adminImageService, 'uploadImage');
    const user = userEvent.setup();
    render(<ImageUploader imageFileName={null} onChange={onChange} />);

    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'photo.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText(/upload image/i), bigFile);

    expect(await screen.findByText('Image must be 5MB or smaller.')).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uploads a valid file and calls onChange with the returned filename', async () => {
    const onChange = vi.fn();
    vi.spyOn(adminImageService, 'uploadImage').mockResolvedValue({ filename: 'img_new.webp' });
    const user = userEvent.setup();
    render(<ImageUploader imageFileName={null} onChange={onChange} />);

    const file = new File(['content'], 'photo.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText(/upload image/i), file);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('img_new.webp'));
  });

  it('shows an inline error when the upload request fails', async () => {
    const onChange = vi.fn();
    vi.spyOn(adminImageService, 'uploadImage').mockRejectedValue({ message: 'Upload failed. Please try again.' });
    const user = userEvent.setup();
    render(<ImageUploader imageFileName={null} onChange={onChange} />);

    const file = new File(['content'], 'photo.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText(/upload image/i), file);

    expect(await screen.findByText('Upload failed. Please try again.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
