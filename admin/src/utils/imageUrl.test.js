import { afterEach, describe, expect, it, vi } from 'vitest';
import { getImageUrl } from './imageUrl.js';

describe('getImageUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('derives the backend origin from VITE_API_BASE_URL and appends /uploads/{filename}', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/api');
    expect(getImageUrl('img_20260726_120000_001.jpg')).toBe(
      'http://localhost:8080/uploads/img_20260726_120000_001.jpg'
    );
  });

  it('handles a production-style base URL', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.2gofindz.com/api');
    expect(getImageUrl('logo.png')).toBe('https://api.2gofindz.com/uploads/logo.png');
  });

  it('returns a Cloudinary URL unchanged instead of prepending the backend origin', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/api');
    const cloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/v1699999999/2go-findz/abc123.jpg';
    expect(getImageUrl(cloudinaryUrl)).toBe(cloudinaryUrl);
  });

  it('returns null when filename is falsy', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/api');
    expect(getImageUrl(null)).toBeNull();
    expect(getImageUrl(undefined)).toBeNull();
    expect(getImageUrl('')).toBeNull();
  });
});
