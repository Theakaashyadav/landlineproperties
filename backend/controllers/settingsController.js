const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');

const getPublicSettings = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`SELECT company_name, logo, phone, email, whatsapp, address,
    instagram, facebook, youtube, linkedin FROM settings WHERE id = 1 LIMIT 1`);
  res.json({ success: true, data: rows[0] || {} });
});

module.exports = { getPublicSettings };
