export function toSlug(text) {
  return text.trim().toLowerCase().replace(/\s+/g, '_');
}
