export function uniqueIds(records) {
  const seen = new Set();
  return records.filter((record) => {
    if (seen.has(record.id)) return true;
    seen.add(record.id);
    return false;
  });
}
