const slugify = require('slugify');

async function generateUniqueSlug(Model, text, ignoreId = null, maxLength = 255) {
  if (!Model || typeof Model.exists !== 'function') throw new Error('A MongoDB model with a slug field is required.');
  if (!Number.isInteger(maxLength) || maxLength < 16 || maxLength > 255) throw new Error('Invalid slug length.');

  const generated = slugify(String(text || ''), { lower: true, strict: true, trim: true }) || 'listing';
  const base = generated.slice(0, maxLength).replace(/-+$/g, '') || 'listing';
  let slug = base;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = { slug };
    if (ignoreId !== null && ignoreId !== undefined) query.id = { $ne: Number(ignoreId) };
    if (!await Model.exists(query)) return slug;
    counter += 1;
    const suffix = `-${counter}`;
    slug = `${base.slice(0, maxLength - suffix.length).replace(/-+$/g, '')}${suffix}`;
  }
}

module.exports = { generateUniqueSlug };
