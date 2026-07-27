import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { uploadImage } from './adminImageService.js';

describe('adminImageService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uploadImage posts a multipart FormData payload with the file and returns the response data', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, message: 'Image uploaded successfully.', data: { filename: 'img_20260727_1.webp' } },
    });
    const file = new File(['content'], 'photo.webp', { type: 'image/webp' });

    const result = await uploadImage(file);

    expect(api.post).toHaveBeenCalledWith('/admin/images', expect.any(FormData));
    const formData = api.post.mock.calls[0][1];
    expect(formData.get('file')).toBe(file);
    expect(result).toEqual({ filename: 'img_20260727_1.webp' });
  });
});
