import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { getHeroBanners } from './heroBannerService.js';

describe('heroBannerService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getHeroBanners fetches from /public/hero-banners and returns the list', async () => {
    const banners = [{ id: 1, headline: 'Amazon Finds Everyone Is Talking About' }];
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Hero banners retrieved successfully.', data: banners },
    });

    const result = await getHeroBanners();

    expect(api.get).toHaveBeenCalledWith('/public/hero-banners');
    expect(result).toEqual(banners);
  });
});
