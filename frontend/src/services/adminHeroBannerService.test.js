import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { getHeroBanners, createHeroBanner, updateHeroBanner, deleteHeroBanner } from './adminHeroBannerService.js';

describe('adminHeroBannerService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getHeroBanners fetches from /admin/hero-banners and returns the list', async () => {
    const banners = [{ id: 1, headline: 'Amazon Finds Everyone Is Talking About' }];
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Hero banners retrieved successfully.', data: banners },
    });

    const result = await getHeroBanners();

    expect(api.get).toHaveBeenCalledWith('/admin/hero-banners');
    expect(result).toEqual(banners);
  });

  it('createHeroBanner posts the payload and returns the created banner', async () => {
    const created = { id: 2, headline: 'Find the Right Product Faster' };
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, message: 'Hero banner created successfully.', data: created },
    });

    const payload = { headline: 'Find the Right Product Faster' };
    const result = await createHeroBanner(payload);

    expect(api.post).toHaveBeenCalledWith('/admin/hero-banners', payload);
    expect(result).toEqual(created);
  });

  it('updateHeroBanner puts the payload to the banner id and returns the updated banner', async () => {
    const updated = { id: 2, headline: 'Updated Headline' };
    vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: true, message: 'Hero banner updated successfully.', data: updated },
    });

    const payload = { headline: 'Updated Headline' };
    const result = await updateHeroBanner(2, payload);

    expect(api.put).toHaveBeenCalledWith('/admin/hero-banners/2', payload);
    expect(result).toEqual(updated);
  });

  it('deleteHeroBanner sends a delete request for the banner id', async () => {
    vi.spyOn(api, 'delete').mockResolvedValue({
      data: { success: true, message: 'Hero banner deleted successfully.', data: null },
    });

    await deleteHeroBanner(2);

    expect(api.delete).toHaveBeenCalledWith('/admin/hero-banners/2');
  });
});
