function cleanDocument(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(cleanDocument);

  const source = typeof value.toObject === 'function'
    ? value.toObject()
    : value;

  if (typeof source !== 'object') return source;

  return Object.fromEntries(Object.entries(source)
    .filter(([key]) => key !== '_id' && key !== '__v')
    .map(([key, entry]) => [key, cleanDocument(entry)]));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function numericId(value) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

module.exports = { cleanDocument, escapeRegex, numericId };
