const path = require('path');
const fs = require('fs');
const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateUniqueSlug } = require('../utils/slugify');
const { logActivity } = require('../utils/activityLog');
const uploadsRoot = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

function uploadedFilePath(imagePath) {
  const relative = String(imagePath || '').replace(/^[/\\]*uploads[/\\]*/, '');
  const resolved = path.resolve(uploadsRoot, relative);
  if (!resolved.startsWith(`${uploadsRoot}${path.sep}`)) return null;
  return resolved;
}

function hasValidImageSignature(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const header = Buffer.alloc(12);
  fs.readSync(fd, header, 0, 12, 0);
  fs.closeSync(fd);
  const jpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const png = header.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  const webp = header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WEBP';
  return jpeg || png || webp;
}

const PUBLIC_LIST_FIELDS = `
  p.id, p.title, p.slug, p.property_type, p.purpose, p.price, p.price_label,
  p.city, p.locality, p.sector, p.bhk, p.bathrooms, p.area, p.area_unit,
  p.property_status, p.featured, p.verified, p.new_launch, p.status, p.created_at,
  (SELECT image_path FROM property_images pi WHERE pi.property_id = p.id
     ORDER BY pi.is_featured DESC, pi.sort_order ASC LIMIT 1) AS cover_image
`;

// ---------------------------------------------------------------
// GET /api/properties  (public — paginated + filterable)
// ---------------------------------------------------------------
const listProperties = asyncHandler(async (req, res) => {
  const {
    purpose, location, city, type, bhk, furnishing, property_status, min_area,
    min_price, max_price, budget, featured, new_launch, q,
    sort = 'newest', page = 1, limit = 12
  } = req.query;

  const where = ['p.status = "published"'];
  const params = [];

  const allowedPurposes = ['Buy', 'Rent', 'Commercial'];
  if (purpose && !allowedPurposes.includes(purpose)) throw new ApiError(400, 'Invalid property purpose.');

  if (purpose) { where.push('p.purpose = ?'); params.push(purpose); }
  if (city) { where.push('p.city = ?'); params.push(city); }
  if (location) { where.push('(p.city LIKE ? OR p.locality LIKE ? OR p.sector LIKE ?)'); params.push(`%${location}%`, `%${location}%`, `%${location}%`); }
  if (type) { where.push('p.property_type = ?'); params.push(type); }
  if (bhk) { where.push('p.bhk = ?'); params.push(bhk); }
  if (furnishing) { where.push('p.furnishing = ?'); params.push(furnishing); }
  if (property_status) { where.push('p.property_status = ?'); params.push(property_status); }
  if (min_area && Number.isFinite(Number(min_area))) { where.push('p.area >= ?'); params.push(Number(min_area)); }
  if (featured === 'true') { where.push('p.featured = 1'); }
  if (new_launch === 'true') { where.push('p.new_launch = 1'); }
  if (min_price && Number.isFinite(Number(min_price))) { where.push('p.price >= ?'); params.push(Number(min_price)); }
  if ((max_price || budget) && Number.isFinite(Number(max_price || budget))) { where.push('p.price <= ?'); params.push(Number(max_price || budget)); }
  if (q) { where.push('MATCH(p.title, p.locality, p.description) AGAINST (? IN NATURAL LANGUAGE MODE)'); params.push(q); }

  const sortMap = {
    newest: 'p.created_at DESC',
    price_low: 'p.price ASC',
    price_high: 'p.price DESC'
  };
  const orderBy = sortMap[sort] || sortMap.newest;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNum - 1) * perPage;

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT ${PUBLIC_LIST_FIELDS} FROM properties p ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM properties p ${whereSql}`,
    params
  );
  const total = countRows[0].total;

  res.json({
    success: true,
    data: rows,
    pagination: {
      page: pageNum,
      limit: perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage))
    }
  });
});

// ---------------------------------------------------------------
// GET /api/properties/:slug  (public — full detail + related)
// ---------------------------------------------------------------
const getPropertyBySlug = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.*, b.name AS broker_name, b.phone AS broker_phone, b.photo AS broker_photo, b.slug AS broker_slug
     FROM properties p
     LEFT JOIN brokers b ON b.id = p.broker_id
     WHERE p.slug = ? AND p.status = "published" LIMIT 1`,
    [req.params.slug]
  );
  if (rows.length === 0) throw new ApiError(404, 'Property not found.');
  const property = rows[0];

  const [images] = await pool.query(
    'SELECT id, image_path, alt_text, is_featured, sort_order FROM property_images WHERE property_id = ? ORDER BY is_featured DESC, sort_order ASC',
    [property.id]
  );
  property.images = images;

  pool.query('UPDATE properties SET views = views + 1 WHERE id = ?', [property.id]).catch(() => {});

  const [related] = await pool.query(
    `SELECT ${PUBLIC_LIST_FIELDS} FROM properties p
     WHERE p.status = "published" AND p.id != ? AND (p.city = ? OR p.property_type = ?)
     ORDER BY p.created_at DESC LIMIT 4`,
    [property.id, property.city, property.property_type]
  );

  res.json({ success: true, data: property, related });
});

// ---------------------------------------------------------------
// GET /api/admin/properties  (admin — all statuses, no status filter)
// ---------------------------------------------------------------
const adminListProperties = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, q } = req.query;
  const where = [];
  const params = [];
  if (status) { where.push('p.status = ?'); params.push(status); }
  if (q) { where.push('p.title LIKE ?'); params.push(`%${q}%`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * perPage;

  const [rows] = await pool.query(
    `SELECT ${PUBLIC_LIST_FIELDS} FROM properties p ${whereSql} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM properties p ${whereSql}`, params);

  res.json({
    success: true,
    data: rows,
    pagination: { page: pageNum, limit: perPage, total: countRows[0].total, totalPages: Math.max(1, Math.ceil(countRows[0].total / perPage)) }
  });
});

const adminGetProperty = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM properties WHERE id = ? LIMIT 1', [req.params.id]);
  if (rows.length === 0) throw new ApiError(404, 'Property not found.');
  const [images] = await pool.query('SELECT * FROM property_images WHERE property_id = ? ORDER BY sort_order ASC', [req.params.id]);
  res.json({ success: true, data: { ...rows[0], images } });
});

const ALLOWED_FIELDS = [
  'title', 'property_type', 'purpose', 'price', 'price_label', 'city', 'locality', 'sector',
  'location_id', 'bhk', 'bathrooms', 'area', 'area_unit', 'property_status', 'possession_status',
  'description', 'short_description', 'amenities', 'developer', 'rera_number', 'property_facing',
  'floor', 'total_floors', 'parking', 'furnishing', 'year_built', 'broker_id', 'featured',
  'verified', 'new_launch', 'status', 'seo_title', 'seo_description', 'canonical_url', 'og_image'
];

function pickFields(body) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      out[key] = key === 'amenities' && typeof body[key] !== 'string' ? JSON.stringify(body[key]) : body[key];
    }
  }
  return out;
}

// ---------------------------------------------------------------
// POST /api/properties  (admin only)
// ---------------------------------------------------------------
const createProperty = asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body.title || !body.property_type || !body.purpose || body.price === undefined || body.price === null || body.price === '' || !body.city) {
    throw new ApiError(400, 'title, property_type, purpose, price and city are required.');
  }

  const fields = pickFields(body);
  fields.slug = await generateUniqueSlug(pool, 'properties', body.title);
  fields.created_by = req.user.id;

  const columns = Object.keys(fields);
  const placeholders = columns.map(() => '?').join(', ');
  const values = columns.map((c) => fields[c]);

  const [result] = await pool.query(
    `INSERT INTO properties (${columns.join(', ')}) VALUES (${placeholders})`,
    values
  );

  await logActivity(pool, { userId: req.user.id, action: 'Property Added', entity: 'property', entityId: result.insertId, ip: req.ip });
  res.status(201).json({ success: true, data: { id: result.insertId, slug: fields.slug } });
});

// ---------------------------------------------------------------
// PUT /api/properties/:id  (admin only)
// ---------------------------------------------------------------
const updateProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [existing] = await pool.query('SELECT id, title FROM properties WHERE id = ?', [id]);
  if (existing.length === 0) throw new ApiError(404, 'Property not found.');

  const fields = pickFields(req.body);
  if (req.body.title && req.body.title !== existing[0].title) {
    fields.slug = await generateUniqueSlug(pool, 'properties', req.body.title, id);
  }
  if (Object.keys(fields).length === 0) throw new ApiError(400, 'No valid fields to update.');

  const setSql = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  await pool.query(`UPDATE properties SET ${setSql} WHERE id = ?`, [...values, id]);

  await logActivity(pool, { userId: req.user.id, action: 'Property Updated', entity: 'property', entityId: id, ip: req.ip });
  res.json({ success: true, message: 'Property updated.' });
});

// ---------------------------------------------------------------
// DELETE /api/properties/:id  (admin only)
// ---------------------------------------------------------------
const deleteProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [images] = await pool.query('SELECT image_path FROM property_images WHERE property_id = ?', [id]);
  const [result] = await pool.query('DELETE FROM properties WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Property not found.');

  images.forEach((img) => {
    const filePath = uploadedFilePath(img.image_path);
    if (filePath) fs.unlink(filePath, () => {});
  });

  await logActivity(pool, { userId: req.user.id, action: 'Property Deleted', entity: 'property', entityId: id, ip: req.ip });
  res.json({ success: true, message: 'Property deleted.' });
});

// ---------------------------------------------------------------
// POST /api/properties/:id/duplicate  (admin only)
// ---------------------------------------------------------------
const duplicateProperty = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM properties WHERE id = ?', [req.params.id]);
  if (rows.length === 0) throw new ApiError(404, 'Property not found.');
  const original = rows[0];

  const fields = pickFields(original);
  fields.title = `${original.title} (Copy)`;
  fields.slug = await generateUniqueSlug(pool, 'properties', fields.title);
  fields.status = 'draft';
  fields.created_by = req.user.id;

  const columns = Object.keys(fields);
  const [result] = await pool.query(
    `INSERT INTO properties (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    columns.map((c) => fields[c])
  );

  // Images are intentionally not shared between records. Upload images to the
  // draft copy so deleting either property can never break the other.

  await logActivity(pool, { userId: req.user.id, action: 'Property Duplicated', entity: 'property', entityId: result.insertId, ip: req.ip });
  res.status(201).json({ success: true, data: { id: result.insertId } });
});

// ---------------------------------------------------------------
// PATCH /api/properties/:id/toggle  (admin only) — featured/verified/new_launch/status flags
// ---------------------------------------------------------------
const ALLOWED_TOGGLES = ['featured', 'verified', 'new_launch'];
const ALLOWED_STATUSES = ['published', 'draft', 'pending', 'sold', 'rented', 'unpublished'];

const toggleProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { field, value, status } = req.body;

  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) throw new ApiError(400, 'Invalid status value.');
    const [result] = await pool.query('UPDATE properties SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) throw new ApiError(404, 'Property not found.');
    await logActivity(pool, { userId: req.user.id, action: `Property status set to ${status}`, entity: 'property', entityId: id, ip: req.ip });
    return res.json({ success: true, message: `Status updated to ${status}.` });
  }

  if (!ALLOWED_TOGGLES.includes(field)) throw new ApiError(400, 'Invalid toggle field.');
  const [result] = await pool.query(`UPDATE properties SET ${field} = ? WHERE id = ?`, [value ? 1 : 0, id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Property not found.');
  await logActivity(pool, { userId: req.user.id, action: `Property ${field} set to ${!!value}`, entity: 'property', entityId: id, ip: req.ip });
  res.json({ success: true, message: 'Property updated.' });
});

// ---------------------------------------------------------------
// IMAGES
// ---------------------------------------------------------------
const uploadImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [prop] = await pool.query('SELECT id FROM properties WHERE id = ?', [id]);
  if (prop.length === 0) throw new ApiError(404, 'Property not found.');

  if (!req.files || req.files.length === 0) throw new ApiError(400, 'No images uploaded.');
  if (req.files.some(file => !hasValidImageSignature(file.path))) {
    req.files.forEach(file => fs.unlink(file.path, () => {}));
    throw new ApiError(400, 'One or more files are not valid JPEG, PNG or WEBP images.');
  }

  const [existingCount] = await pool.query('SELECT COUNT(*) AS c FROM property_images WHERE property_id = ?', [id]);
  let sortOrder = existingCount[0].c;

  const inserted = [];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const file of req.files) {
      const relativePath = `/uploads/properties/${file.filename}`;
      const isFeatured = sortOrder === 0 ? 1 : 0;
      const [result] = await connection.query(
        'INSERT INTO property_images (property_id, image_path, alt_text, is_featured, sort_order) VALUES (?, ?, ?, ?, ?)',
        [id, relativePath, String(req.body.alt_text || '').trim().slice(0, 255), isFeatured, sortOrder]
      );
      inserted.push({ id: result.insertId, image_path: relativePath });
      sortOrder += 1;
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    req.files.forEach(file => fs.unlink(file.path, () => {}));
    throw error;
  } finally {
    connection.release();
  }

  res.status(201).json({ success: true, data: inserted });
});

const deleteImage = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const [rows] = await pool.query('SELECT image_path FROM property_images WHERE id = ?', [imageId]);
  if (rows.length === 0) throw new ApiError(404, 'Image not found.');

  await pool.query('DELETE FROM property_images WHERE id = ?', [imageId]);
  const filePath = uploadedFilePath(rows[0].image_path);
  if (filePath) fs.unlink(filePath, () => {});

  res.json({ success: true, message: 'Image deleted.' });
});

const reorderImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { order } = req.body; // array of { id, sort_order, is_featured }
  if (!Array.isArray(order) || order.length === 0) throw new ApiError(400, 'order must be a non-empty array.');
  if (order.filter(item => item.is_featured).length > 1) throw new ApiError(400, 'Only one image can be featured.');
  if (order.some(item => !Number.isInteger(Number(item.id)) || !Number.isInteger(Number(item.sort_order)) || Number(item.sort_order) < 0)) {
    throw new ApiError(400, 'Each image requires a valid id and sort order.');
  }

  const ids = order.map(item => Number(item.id));
  const placeholders = ids.map(() => '?').join(',');
  const [owned] = await pool.query(
    `SELECT id FROM property_images WHERE property_id = ? AND id IN (${placeholders})`,
    [id, ...ids]
  );
  if (owned.length !== new Set(ids).size) throw new ApiError(400, 'One or more images do not belong to this property.');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of order) {
      await connection.query(
        'UPDATE property_images SET sort_order = ?, is_featured = ? WHERE id = ? AND property_id = ?',
        [Number(item.sort_order), item.is_featured ? 1 : 0, Number(item.id), id]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  res.json({ success: true, message: 'Image order updated.' });
});

module.exports = {
  listProperties, getPropertyBySlug, adminListProperties, adminGetProperty,
  createProperty, updateProperty, deleteProperty, duplicateProperty, toggleProperty,
  uploadImages, deleteImage, reorderImages
};
