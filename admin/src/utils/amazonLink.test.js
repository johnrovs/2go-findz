import { describe, expect, it } from 'vitest';
import { getAmazonMarketplace, isSupportedAmazonUrl } from './amazonLink.js';

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

describe('getAmazonMarketplace', () => {
  it('maps supported hostnames to their marketplace code', () => {
    expect(getAmazonMarketplace('https://amazon.com/dp/B00TEST')).toBe('US');
    expect(getAmazonMarketplace('https://www.amazon.com/dp/B00TEST')).toBe('US');
    expect(getAmazonMarketplace('https://amazon.ca/dp/B00TEST')).toBe('CA');
    expect(getAmazonMarketplace('https://amazon.co.uk/dp/B00TEST')).toBe('UK');
    expect(getAmazonMarketplace('https://amazon.de/dp/B00TEST')).toBe('DE');
  });

  it('returns null for unsupported or invalid URLs', () => {
    expect(getAmazonMarketplace('https://example.com/dp/B00TEST')).toBeNull();
    expect(getAmazonMarketplace('not a url')).toBeNull();
    expect(getAmazonMarketplace(null)).toBeNull();
  });
});
