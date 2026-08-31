const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateUniqueSlug } = require('../utils/slugify');

// POST /api/list-property (public)
// Property owners/brokers submit their own property. It is stored as
// status = 'pending' and is invisible on the public site until an
// admin reviews and approves/publishes it from /admin/properties.html.
const submitListing = asyncHandler(async (req, res) => {
  const {
    name, phone, email, property_type, city, locality,
    purpose, price, description
  } = req.body;

  if (!name || !phone || !property_type || !city) {
    throw new ApiError(400, 'Name, phone, property type and city are required.');
  }

  const phoneClean = String(phone).replace(/[^\d+]/g, '');
  if (phoneClean.length < 8) throw new ApiError(400, 'Please provide a valid phone number.');

  const title = `${property_type} in ${locality ? locality + ', ' : ''}${city} (Owner Submitted)`;
  const slug = await generateUniqueSlug(pool, 'properties', title);

  const [result] = await pool.query(
    `INSERT INTO properties
      (title, slug, property_type, purpose, price, city, locality, description, status,
       is_user_submitted, submitted_by_name, submitted_by_phone, submitted_by_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?, ?)`,
    [
      title, slug, property_type, purpose || 'Buy', price || 0, city, locality || null,
      description || null, String(name).trim().slice(0, 150),
      phoneClean.slice(0, 20),
      email ? String(email).trim().slice(0, 190) : null
    ]
  );

  res.status(201).json({
    success: true,
    message: 'Thank you! Your property details have been submitted. Our team will review and contact you shortly.',
    data: { id: result.insertId }
  });
});

module.exports = { submitListing };
