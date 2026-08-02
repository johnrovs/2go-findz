import { describe, expect, it } from 'vitest';
import { isSupportedAmazonUrl } from './amazonLink.js';

describe('isSupportedAmazonUrl', () => {
  it('accepts https amazon.com links', () => {
    expect(isSupportedAmazonUrl('https://amazon.com/dp/B012XYZ45')).toBe(true);
  });

  it('accepts https subdomains of supported marketplaces', () => {
    expect(isSupportedAmazonUrl('https://www.amazon.co.uk/dp/B012XYZ45')).toBe(true);
  });

  it('rejects http (non-https) links', () => {
    expect(isSupportedAmazonUrl('http://amazon.com/dp/B012XYZ45')).toBe(false);
  });

  it('rejects unsupported hostnames', () => {
    expect(isSupportedAmazonUrl('https://example.com/dp/B012XYZ45')).toBe(false);
  });

  it('rejects malformed URLs without throwing', () => {
    expect(isSupportedAmazonUrl('not a url')).toBe(false);
  });

  it('rejects null or empty input', () => {
    expect(isSupportedAmazonUrl(null)).toBe(false);
    expect(isSupportedAmazonUrl('')).toBe(false);
  });
});
