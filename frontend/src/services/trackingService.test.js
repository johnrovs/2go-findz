import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { recordView, recordClick } from './trackingService.js';

describe('trackingService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('recordView posts to /public/views and returns the session data', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, message: 'View recorded.', data: { sessionId: 'abc-123' } },
    });

    const result = await recordView();

    expect(api.post).toHaveBeenCalledWith('/public/views');
    expect(result).toEqual({ sessionId: 'abc-123' });
  });

  it('recordClick posts to the product click endpoint with the session id', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, message: 'Click recorded.', data: null } });

    await recordClick(42, 'abc-123');

    expect(api.post).toHaveBeenCalledWith('/public/products/42/click', { sessionId: 'abc-123' });
  });

  it('recordClick omits the body when there is no session id', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, message: 'Click recorded.', data: null } });

    await recordClick(42, null);

    expect(api.post).toHaveBeenCalledWith('/public/products/42/click', undefined);
  });
});
