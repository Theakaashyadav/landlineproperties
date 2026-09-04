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

  if (!name || !phone || !property_type || !city || !purpose) {
    throw new ApiError(400, 'Name, phone, property type, purpose and city are required.');
  }

  const phoneClean = String(phone).replace(/[^\d+]/g, '');
  if (phoneClean.length < 8) throw new ApiError(400, 'Please provide a valid phone number.');

  const normalizedType = String(property_type).trim();
  const normalizedCity = String(city).trim();
  const normalizedLocality = locality ? String(locality).trim() : '';
  const titleSuffix = ' (Owner Submitted)';
  const descriptiveTitle = `${normalizedType} in ${normalizedLocality ? `${normalizedLocality}, ` : ''}${normalizedCity}`;
  const title = `${descriptiveTitle.slice(0, 255 - titleSuffix.length).trim()}${titleSuffix}`;
  const slug = await generateUniqueSlug(pool, 'properties', title);
  const hasPrice = price !== undefined && price !== null && price !== '';
  const normalizedPrice = hasPrice ? Number(price) : null;

  const [result] = await pool.query(
    `INSERT INTO properties
      (title, slug, property_type, purpose, price, price_label, city, locality, description, status,
       is_user_submitted, submitted_by_name, submitted_by_phone, submitted_by_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?, ?, ?)`,
    [
      title, slug, normalizedType, purpose, normalizedPrice,
      hasPrice ? null : 'Price on request', normalizedCity, normalizedLocality || null,
      description ? String(description).trim() : null, String(name).trim().slice(0, 150),
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
