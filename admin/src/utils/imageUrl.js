export function getImageUrl(filename) {
  if (!filename) return null;
  if (/^https?:\/\//.test(filename)) return filename;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');
  return `${origin}/uploads/${filename}`;
}
