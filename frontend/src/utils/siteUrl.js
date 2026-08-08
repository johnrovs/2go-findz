export function getSiteUrl() {
  const configured = import.meta.env.VITE_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  return window.location.origin;
}

export function buildGuideUrl(slug) {
  return `${getSiteUrl()}/buying-guides/${slug}`;
}
