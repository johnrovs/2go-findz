const SUPPORTED_AMAZON_HOSTNAMES = ['amazon.com', 'amazon.ca', 'amazon.co.uk', 'amazon.de'];

export function isSupportedAmazonUrl(url) {
  if (!url) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return SUPPORTED_AMAZON_HOSTNAMES.some(
    (domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
  );
}

const MARKETPLACE_BY_HOSTNAME = {
  'amazon.com': 'US',
  'amazon.ca': 'CA',
  'amazon.co.uk': 'UK',
  'amazon.de': 'DE',
};

export function getAmazonMarketplace(url) {
  if (!isSupportedAmazonUrl(url)) return null;
  const hostname = new URL(url).hostname.replace(/^www\./, '');
  return MARKETPLACE_BY_HOSTNAME[hostname] ?? null;
}
