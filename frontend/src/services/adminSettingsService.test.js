import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { getSettings, updateSettings } from './adminSettingsService.js';

describe('adminSettingsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getSettings fetches from /admin/settings and returns the record', async () => {
    const settings = { affiliateDisclosure: 'As an Amazon Associate...', contactEmail: 'hello@2gofindz.com' };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Settings retrieved successfully.', data: settings },
    });

    const result = await getSettings();

    expect(api.get).toHaveBeenCalledWith('/admin/settings');
    expect(result).toEqual(settings);
  });

  it('updateSettings puts the payload and returns the updated record', async () => {
    const payload = { affiliateDisclosure: 'Updated disclosure.', contactEmail: 'new@2gofindz.com' };
    vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: true, message: 'Settings updated successfully.', data: payload },
    });

    const result = await updateSettings(payload);

    expect(api.put).toHaveBeenCalledWith('/admin/settings', payload);
    expect(result).toEqual(payload);
  });
});
