export function wordCount(html) {
  const text = html.replace(/<[^>]*>/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
}
