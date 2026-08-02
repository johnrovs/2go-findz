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
