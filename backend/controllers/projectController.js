const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');

const PUBLIC_FIELDS = `p.id, p.name, p.slug, p.developer, p.city, p.starting_price,
  p.configuration, p.project_status, p.possession, p.description, p.amenities,
  p.highlights, p.rera_number, p.featured_image, p.is_new_launch, p.is_upcoming,
  p.is_premium, p.seo_title, p.seo_description, p.updated_at`;

const listProjects = asyncHandler(async (req, res) => {
  const { location, configuration, status, min_price, max_price, page = 1, limit = 12 } = req.query;
  const where = ['p.status = ?'];
  const params = ['published'];
  if (location) { where.push('p.city LIKE ?'); params.push(`%${location}%`); }
  if (configuration) { where.push('p.configuration LIKE ?'); params.push(`%${configuration}%`); }
  if (status) { where.push('p.project_status = ?'); params.push(status); }
  if (Number.isFinite(Number(min_price))) { where.push('p.starting_price >= ?'); params.push(Number(min_price)); }
  if (Number.isFinite(Number(max_price))) { where.push('p.starting_price <= ?'); params.push(Number(max_price)); }
  const pageNumber = Math.max(1, parseInt(page, 10) || 1);
  const perPage = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
  const offset = (pageNumber - 1) * perPage;
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const [rows] = await pool.query(`SELECT ${PUBLIC_FIELDS},
    COALESCE(p.featured_image, (SELECT image_path FROM project_images i WHERE i.project_id = p.id ORDER BY i.sort_order LIMIT 1)) AS cover_image
    FROM projects p ${whereSql} ORDER BY p.is_new_launch DESC, p.updated_at DESC LIMIT ? OFFSET ?`, [...params, perPage, offset]);
  const [[count]] = await pool.query(`SELECT COUNT(*) AS total FROM projects p ${whereSql}`, params);
  res.json({ success: true, data: rows, pagination: { page: pageNumber, limit: perPage, total: count.total, totalPages: Math.max(1, Math.ceil(count.total / perPage)) } });
});

const getProjectBySlug = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`SELECT ${PUBLIC_FIELDS} FROM projects p WHERE p.slug = ? AND p.status = ? LIMIT 1`, [req.params.slug, 'published']);
  if (!rows.length) throw new ApiError(404, 'Project not found.');
  const project = rows[0];
  const [images] = await pool.query('SELECT id, image_path, alt_text, sort_order FROM project_images WHERE project_id = ? ORDER BY sort_order', [project.id]);
  project.images = images;
  res.json({ success: true, data: project });
});

module.exports = { listProjects, getProjectBySlug };
