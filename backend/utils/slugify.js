const slugify = require('slugify');

const ALLOWED_TABLES = new Set(['properties', 'projects', 'locations', 'brokers']);

async function generateUniqueSlug(pool, table, text, ignoreId = null, maxLength = 255) {
  if (!ALLOWED_TABLES.has(table)) throw new Error('Unsupported slug table.');
  if (!Number.isInteger(maxLength) || maxLength < 16 || maxLength > 255) throw new Error('Invalid slug length.');

  const generated = slugify(String(text || ''), { lower: true, strict: true, trim: true }) || 'listing';
  const base = generated.slice(0, maxLength).replace(/-+$/g, '') || 'listing';
  let slug = base;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const query = ignoreId
      ? `SELECT id FROM ${table} WHERE slug = ? AND id != ? LIMIT 1`
      : `SELECT id FROM ${table} WHERE slug = ? LIMIT 1`;
    const params = ignoreId ? [slug, ignoreId] : [slug];
    const [rows] = await pool.query(query, params);
    if (rows.length === 0) return slug;
    counter += 1;
    const suffix = `-${counter}`;
    slug = `${base.slice(0, maxLength - suffix.length).replace(/-+$/g, '')}${suffix}`;
  }
}

module.exports = { generateUniqueSlug };
