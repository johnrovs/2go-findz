import { describe, expect, it } from 'vitest';
import { SOCIAL_PLATFORMS } from './socialPlatforms.jsx';

describe('SOCIAL_PLATFORMS', () => {
  it('includes all 5 platforms with a settings key, label, and icon', () => {
    const keys = SOCIAL_PLATFORMS.map((p) => p.key);
    expect(keys).toEqual(['tiktokUrl', 'instagramUrl', 'pinterestUrl', 'youtubeUrl', 'facebookUrl']);
    SOCIAL_PLATFORMS.forEach((platform) => {
      expect(platform.label).toBeTruthy();
      expect(platform.Icon).toBeTruthy();
      expect(platform.iconBgClassName).toBeTruthy();
    });
  });
});
