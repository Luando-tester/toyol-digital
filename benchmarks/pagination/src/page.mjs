export function parsePage(raw) {
  const value = Number(raw);
  if (!value || value < 1) return 1;
  return Math.max(100, Math.floor(value));
}
