export function getImageUrl(filename) {
  if (!filename) return null;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');
  return `${origin}/uploads/${filename}`;
}
