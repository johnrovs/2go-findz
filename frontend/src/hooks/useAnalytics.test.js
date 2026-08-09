import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { trackEvent } from './useAnalytics.js';

describe('trackEvent', () => {
  let infoSpy;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it('logs the event name and payload in dev', () => {
    trackEvent('guide_view', { guideId: 3 });

    expect(infoSpy).toHaveBeenCalledWith('[analytics]', 'guide_view', { guideId: 3 });
  });

  it('defaults payload to an empty object', () => {
    trackEvent('guide_view');

    expect(infoSpy).toHaveBeenCalledWith('[analytics]', 'guide_view', {});
  });

  it('never throws even if console.info is unavailable', () => {
    infoSpy.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => trackEvent('guide_view', {})).not.toThrow();
  });
});
