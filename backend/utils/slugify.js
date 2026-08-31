const slugify = require('slugify');

async function generateUniqueSlug(pool, table, text, ignoreId = null) {
  const base = slugify(text, { lower: true, strict: true, trim: true });
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
    slug = `${base}-${counter}`;
  }
}

module.exports = { generateUniqueSlug };
