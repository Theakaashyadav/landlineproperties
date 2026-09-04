const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');

// POST /api/leads  (public — from contact form, enquiry form, property enquiry)
const createLead = asyncHandler(async (req, res) => {
  const { name, phone, email, requirement, property_id, location, budget, message, source } = req.body;
  const projectId = req.body.project_id || req.body.project || null;
  const inquiryType = req.body.inquiry_type || req.body.type || null;

  if (!name || !phone) {
    throw new ApiError(400, 'Name and phone number are required.');
  }
  const phoneClean = String(phone).replace(/[^\d+]/g, '');
  if (phoneClean.length < 8) {
    throw new ApiError(400, 'Please provide a valid phone number.');
  }

  if (property_id) {
    const [property] = await pool.query('SELECT id FROM properties WHERE id = ? AND status = ? LIMIT 1', [property_id, 'published']);
    if (property.length === 0) throw new ApiError(400, 'The selected property is no longer available.');
  }

  if (projectId) {
    const [project] = await pool.query('SELECT id FROM projects WHERE id = ? AND status = ? LIMIT 1', [projectId, 'published']);
    if (project.length === 0) throw new ApiError(400, 'The selected project is no longer available.');
  }

  const [result] = await pool.query(
    `INSERT INTO leads
      (name, phone, email, requirement, property_id, project_id, inquiry_type, location, budget, message, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(name).trim().slice(0, 150),
      phoneClean.slice(0, 20),
      email ? String(email).trim().slice(0, 190) : null,
      requirement ? String(requirement).trim().slice(0, 100) : null,
      property_id ? Number(property_id) : null,
      projectId ? Number(projectId) : null,
      inquiryType ? String(inquiryType).trim().slice(0, 100) : null,
      location ? String(location).trim().slice(0, 150) : null,
      budget ? String(budget).trim().slice(0, 100) : null,
      message ? String(message).trim().slice(0, 2000) : null,
      source ? String(source).trim() : 'website'
    ]
  );

  res.status(201).json({
    success: true,
    message: 'Thank you. Our property expert will contact you shortly.',
    data: { id: result.insertId }
  });
});

// GET /api/admin/leads  (admin)
const listLeads = asyncHandler(async (req, res) => {
  const { status, q, page = 1, limit = 20 } = req.query;
  const where = [];
  const params = [];
  const allowedStatuses = ['New','Contacted','Follow-up','Site Visit','Interested','Converted','Not Interested','Closed'];
  if (status && !allowedStatuses.includes(status)) throw new ApiError(400, 'Invalid lead status.');
  if (q && String(q).length > 150) throw new ApiError(400, 'Search query is too long.');
  if (status) { where.push('l.status = ?'); params.push(status); }
  if (q) { where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  if (!/^\d+$/.test(String(page)) || Number(page) < 1) throw new ApiError(400, 'page must be a positive integer.');
  if (!/^\d+$/.test(String(limit)) || Number(limit) < 1 || Number(limit) > 100) throw new ApiError(400, 'limit must be between 1 and 100.');
  const pageNum = Number(page);
  const perPage = Number(limit);
  const offset = (pageNum - 1) * perPage;

  const [rows] = await pool.query(
    `SELECT l.*, p.title AS property_title, pr.name AS project_name, b.name AS broker_name
     FROM leads l
     LEFT JOIN properties p ON p.id = l.property_id
     LEFT JOIN projects pr ON pr.id = l.project_id
     LEFT JOIN brokers b ON b.id = l.assigned_broker
     ${whereSql} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM leads l ${whereSql}`, params);

  res.json({
    success: true,
    data: rows,
    pagination: { page: pageNum, limit: perPage, total: countRows[0].total, totalPages: Math.ceil(countRows[0].total / perPage) }
  });
});

// PUT /api/admin/leads/:id  (admin — status, assignment, follow-up)
const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, assigned_broker, follow_up_date } = req.body;
  const fields = {};
  const allowedStatuses = ['New','Contacted','Follow-up','Site Visit','Interested','Converted','Not Interested','Closed'];
  if (status && !allowedStatuses.includes(status)) throw new ApiError(400, 'Invalid lead status.');
  if (status) fields.status = status;
  if (assigned_broker !== undefined) {
    if (assigned_broker !== null && assigned_broker !== '' && (!Number.isInteger(Number(assigned_broker)) || Number(assigned_broker) < 1)) {
      throw new ApiError(400, 'Invalid broker selection.');
    }
    fields.assigned_broker = assigned_broker ? Number(assigned_broker) : null;
  }
  if (follow_up_date !== undefined) {
    if (follow_up_date !== null && follow_up_date !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(String(follow_up_date))) {
      throw new ApiError(400, 'Follow-up date must use YYYY-MM-DD format.');
    }
    if (follow_up_date) {
      const parsed = new Date(`${follow_up_date}T00:00:00Z`);
      if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== follow_up_date) {
        throw new ApiError(400, 'Follow-up date is not valid.');
      }
    }
    fields.follow_up_date = follow_up_date || null;
  }

  if (Object.keys(fields).length === 0) throw new ApiError(400, 'No valid fields to update.');

  const setSql = Object.keys(fields).map((k) => `${k} = ?`).join(', ');
  const [result] = await pool.query(`UPDATE leads SET ${setSql} WHERE id = ?`, [...Object.values(fields), id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Lead not found.');

  await logActivity(pool, { userId: req.user.id, action: 'Lead Status Changed', entity: 'lead', entityId: id, ip: req.ip });
  res.json({ success: true, message: 'Lead updated.' });
});

// POST /api/admin/leads/:id/notes
const addNote = asyncHandler(async (req, res) => {
  const { note } = req.body;
  if (!note || !note.trim()) throw new ApiError(400, 'Note text is required.');
  if (note.trim().length > 5000) throw new ApiError(400, 'Note text must not exceed 5000 characters.');
  await pool.query('INSERT INTO lead_notes (lead_id, note, created_by) VALUES (?, ?, ?)', [req.params.id, note.trim(), req.user.id]);
  res.status(201).json({ success: true, message: 'Note added.' });
});

const deleteLead = asyncHandler(async (req, res) => {
  const [result] = await pool.query('DELETE FROM leads WHERE id = ?', [req.params.id]);
  if (result.affectedRows === 0) throw new ApiError(404, 'Lead not found.');
  await logActivity(pool, { userId: req.user.id, action: 'Lead Deleted', entity: 'lead', entityId: req.params.id, ip: req.ip });
  res.json({ success: true, message: 'Lead deleted.' });
});

module.exports = { createLead, listLeads, updateLead, addNote, deleteLead };
