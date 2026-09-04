const path = require('path');
const fs = require('fs');
const { Property, PropertyImage, Broker, Location, Lead } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { generateUniqueSlug } = require('../utils/slugify');
const { logActivity } = require('../utils/activityLog');
const { cleanDocument, escapeRegex, numericId } = require('../utils/documents');
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

async function removeUploadedFiles(files) {
  await Promise.all((files || []).map(async (file) => {
    if (!file || !file.path) return;
    try {
      await fs.promises.unlink(file.path);
    } catch (error) {
      if (error.code !== 'ENOENT') console.warn(`Could not remove uploaded file ${file.path}: ${error.message}`);
    }
  }));
}

async function removeStoredImage(imagePath) {
  const filePath = uploadedFilePath(imagePath);
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') console.warn(`Could not remove stored image ${filePath}: ${error.message}`);
  }
}

const PUBLIC_PROPERTY_KEYS = [
  'id', 'title', 'slug', 'property_type', 'purpose', 'price', 'price_label',
  'city', 'locality', 'sector', 'bhk', 'bathrooms', 'area', 'area_unit',
  'property_status', 'possession_status', 'description', 'short_description',
  'amenities', 'developer', 'rera_number', 'property_facing', 'floor',
  'total_floors', 'parking', 'furnishing', 'year_built', 'featured', 'verified',
  'new_launch', 'status', 'seo_title', 'seo_description', 'canonical_url',
  'og_image', 'created_at', 'updated_at', 'cover_image', 'broker_name',
  'broker_phone', 'broker_photo', 'broker_slug'
];

const PUBLIC_LIST_SELECT = [
  'id', 'title', 'slug', 'property_type', 'purpose', 'price', 'price_label',
  'city', 'locality', 'sector', 'bhk', 'bathrooms', 'area', 'area_unit',
  'property_status', 'furnishing', 'short_description', 'featured', 'verified',
  'new_launch', 'status', 'created_at', 'updated_at'
].join(' ');

function toPublicProperty(row) {
  return Object.fromEntries(PUBLIC_PROPERTY_KEYS
    .filter(key => Object.prototype.hasOwnProperty.call(row, key))
    .map(key => [key, row[key]]));
}

async function addCoverImages(properties) {
  const ids = properties.map((property) => property.id);
  if (!ids.length) return properties.map(cleanDocument);

  const images = await PropertyImage.find({ property_id: { $in: ids } })
    .select('property_id image_path is_featured sort_order -_id')
    .sort({ is_featured: -1, sort_order: 1 })
    .lean();
  const covers = new Map();
  for (const image of images) if (!covers.has(image.property_id)) covers.set(image.property_id, image.image_path);
  return properties.map((property) => ({ ...cleanDocument(property), cover_image: covers.get(property.id) || null }));
}

function optionalNumber(value, name, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new ApiError(400, `${name} must be a number between ${min} and ${max}.`);
  }
  return parsed;
}

function positiveInteger(value, name, fallback, max) {
  if (value === undefined || value === null || value === '') return fallback;
  if (!/^\d+$/.test(String(value))) throw new ApiError(400, `${name} must be a positive integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ApiError(400, `${name} must be between 1 and ${max}.`);
  }
  return parsed;
}

// ---------------------------------------------------------------
// GET /api/properties  (public — paginated + filterable)
// ---------------------------------------------------------------
const listProperties = asyncHandler(async (req, res) => {
  const {
    purpose, location, city, type, bhk, furnishing, property_status, min_area,
    min_price, max_price, budget, featured, new_launch, q,
    sort = 'newest', page = 1, limit = 12
  } = req.query;

  const filter = { status: 'published' };

  const allowedPurposes = ['Buy', 'Rent', 'Commercial'];
  const allowedTypes = ['Apartment', 'Villa', 'Plot', 'Independent House', 'Builder Floor', 'Commercial', 'Office', 'Shop', 'Warehouse', 'Land'];
  const allowedFurnishing = ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'];
  const allowedPropertyStatuses = ['Ready to Move', 'Under Construction'];
  if (purpose && !allowedPurposes.includes(purpose)) throw new ApiError(400, 'Invalid property purpose.');
  if (type && !allowedTypes.includes(type)) throw new ApiError(400, 'Invalid property type.');
  if (furnishing && !allowedFurnishing.includes(furnishing)) throw new ApiError(400, 'Invalid furnishing value.');
  if (property_status && !allowedPropertyStatuses.includes(property_status)) throw new ApiError(400, 'Invalid property status.');
  if (city && String(city).length > 100) throw new ApiError(400, 'City is too long.');
  if (location && String(location).length > 150) throw new ApiError(400, 'Location is too long.');
  if (bhk && String(bhk).length > 10) throw new ApiError(400, 'BHK value is too long.');
  if (q && String(q).length > 150) throw new ApiError(400, 'Search query is too long.');

  const minArea = optionalNumber(min_area, 'min_area', { min: 0, max: 99999999.99 });
  const minPrice = optionalNumber(min_price, 'min_price', { min: 0, max: 9999999999999.99 });
  const maxPrice = optionalNumber(max_price ?? budget, 'max_price', { min: 0, max: 9999999999999.99 });
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    throw new ApiError(400, 'min_price cannot be greater than max_price.');
  }

  if (purpose) filter.purpose = purpose;
  if (city) filter.city = city;
  if (location) {
    const normalizedLocation = String(location).trim().replace(/-/g, ' ');
    const pattern = { $regex: escapeRegex(normalizedLocation), $options: 'i' };
    filter.$or = [{ city: pattern }, { locality: pattern }, { sector: pattern }];
  }
  if (type) filter.property_type = type;
  if (bhk) filter.bhk = bhk;
  if (furnishing) filter.furnishing = furnishing;
  if (property_status) filter.property_status = property_status;
  if (minArea !== null) filter.area = { $gte: minArea };
  if (featured === 'true') filter.featured = 1;
  if (new_launch === 'true') filter.new_launch = 1;
  if (minPrice !== null || maxPrice !== null) {
    filter.price = {};
    if (minPrice !== null) filter.price.$gte = minPrice;
    if (maxPrice !== null) filter.price.$lte = maxPrice;
  }
  if (q) {
    const search = { $regex: escapeRegex(q), $options: 'i' };
    const clauses = [{ title: search }, { locality: search }, { description: search }];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: clauses }];
      delete filter.$or;
    } else {
      filter.$or = clauses;
    }
  }

  const sortMap = {
    newest: { created_at: -1 },
    price_low: { price: 1 },
    price_high: { price: -1 }
  };
  const orderBy = sortMap[sort] || sortMap.newest;

  const pageNum = positiveInteger(page, 'page', 1, 1000000);
  const perPage = positiveInteger(limit, 'limit', 12, 48);
  const offset = (pageNum - 1) * perPage;

  const [rows, total] = await Promise.all([
    Property.find(filter).select(`${PUBLIC_LIST_SELECT} -_id`).sort(orderBy).skip(offset).limit(perPage).lean(),
    Property.countDocuments(filter)
  ]);
  const properties = await addCoverImages(rows);

  res.json({
    success: true,
    data: properties.map(toPublicProperty),
    pagination: {
      page: pageNum,
      limit: perPage,
      total,
      totalPages: Math.ceil(total / perPage)
    }
  });
});

// ---------------------------------------------------------------
// GET /api/properties/:slug  (public — full detail + related)
// ---------------------------------------------------------------
const getPropertyBySlug = asyncHandler(async (req, res) => {
  const row = await Property.findOne({ slug: req.params.slug, status: 'published' }).lean();
  if (!row) throw new ApiError(404, 'Property not found.');

  const [images, broker] = await Promise.all([
    PropertyImage.find({ property_id: row.id })
      .select('id image_path alt_text is_featured sort_order -_id')
      .sort({ is_featured: -1, sort_order: 1 }).lean(),
    row.broker_id
      ? Broker.findOne({ id: row.broker_id }).select('name phone photo slug -_id').lean()
      : null
  ]);
  const property = toPublicProperty({
    ...cleanDocument(row),
    cover_image: images[0]?.image_path || null,
    broker_name: broker?.name || null,
    broker_phone: broker?.phone || null,
    broker_photo: broker?.photo || null,
    broker_slug: broker?.slug || null
  });
  property.images = cleanDocument(images);

  Property.updateOne({ id: property.id }, { $inc: { views: 1 } }).catch(() => {});

  const relatedRows = await Property.find({
    status: 'published',
    id: { $ne: property.id },
    $or: [{ city: property.city }, { property_type: property.property_type }]
  }).select(`${PUBLIC_LIST_SELECT} -_id`).sort({ created_at: -1 }).limit(4).lean();
  const related = await addCoverImages(relatedRows);

  res.json({ success: true, data: property, related: related.map(toPublicProperty) });
});

// ---------------------------------------------------------------
// GET /api/admin/properties  (admin — all statuses, no status filter)
// ---------------------------------------------------------------
const adminListProperties = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20, q } = req.query;
  const filter = {};
  if (status && !ALLOWED_STATUSES.includes(status)) throw new ApiError(400, 'Invalid status value.');
  if (q && String(q).length > 150) throw new ApiError(400, 'Search query is too long.');
  if (status) filter.status = status;
  if (q) filter.title = { $regex: escapeRegex(q), $options: 'i' };

  const pageNum = positiveInteger(page, 'page', 1, 1000000);
  const perPage = positiveInteger(limit, 'limit', 20, 100);
  const offset = (pageNum - 1) * perPage;

  const [rows, total] = await Promise.all([
    Property.find(filter)
      .select(`${PUBLIC_LIST_SELECT} is_user_submitted submitted_by_name submitted_by_phone submitted_by_email -_id`)
      .sort({ created_at: -1 }).skip(offset).limit(perPage).lean(),
    Property.countDocuments(filter)
  ]);
  const properties = await addCoverImages(rows);
  const data = properties.map((property) => ({
    ...toPublicProperty(property),
    is_user_submitted: property.is_user_submitted,
    submitted_by_name: property.submitted_by_name,
    submitted_by_phone: property.submitted_by_phone,
    submitted_by_email: property.submitted_by_email
  }));

  res.json({
    success: true,
    data,
    pagination: { page: pageNum, limit: perPage, total, totalPages: Math.ceil(total / perPage) }
  });
});

const adminGetProperty = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id);
  const property = id ? await Property.findOne({ id }).lean() : null;
  if (!property) throw new ApiError(404, 'Property not found.');
  const images = await PropertyImage.find({ property_id: id }).sort({ sort_order: 1 }).lean();
  res.json({ success: true, data: { ...cleanDocument(property), images: cleanDocument(images) } });
});

const ALLOWED_FIELDS = [
  'title', 'property_type', 'purpose', 'price', 'price_label', 'city', 'locality', 'sector',
  'location_id', 'bhk', 'bathrooms', 'area', 'area_unit', 'property_status', 'possession_status',
  'description', 'short_description', 'amenities', 'developer', 'rera_number', 'property_facing',
  'floor', 'total_floors', 'parking', 'furnishing', 'year_built', 'broker_id', 'featured',
  'verified', 'new_launch', 'status', 'seo_title', 'seo_description', 'canonical_url', 'og_image'
];
const NULLABLE_FIELDS = new Set([
  'price', 'price_label', 'locality', 'sector', 'location_id', 'bhk', 'bathrooms',
  'area', 'possession_status', 'description', 'short_description', 'amenities',
  'developer', 'rera_number', 'property_facing', 'floor', 'total_floors', 'parking',
  'furnishing', 'year_built', 'broker_id', 'seo_title', 'seo_description',
  'canonical_url', 'og_image'
]);
const BOOLEAN_FIELDS = new Set(['featured', 'verified', 'new_launch']);
const NUMBER_FIELDS = new Set(['price', 'location_id', 'bathrooms', 'area', 'year_built', 'broker_id']);

function pickFields(body) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) {
      let value = body[key];
      if ((value === '' || value === null) && NULLABLE_FIELDS.has(key)) value = null;
      if (key === 'amenities' && value !== null) {
        if (typeof value === 'string') {
          try { value = JSON.parse(value); } catch { value = []; }
        }
        value = Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
      }
      if (BOOLEAN_FIELDS.has(key)) value = value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0;
      if (NUMBER_FIELDS.has(key) && value !== null) value = Number(value);
      out[key] = value;
    }
  }
  return out;
}

async function validatePropertyReferences(fields) {
  if (fields.location_id && !await Location.exists({ id: fields.location_id })) {
    throw new ApiError(400, 'The selected location does not exist.');
  }
  if (fields.broker_id && !await Broker.exists({ id: fields.broker_id })) {
    throw new ApiError(400, 'The selected broker does not exist.');
  }
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
  await validatePropertyReferences(fields);
  fields.slug = await generateUniqueSlug(Property, body.title);
  fields.created_by = req.user.id;

  const property = await Property.create(fields);

  await logActivity({ userId: req.user.id, action: 'Property Added', entity: 'property', entityId: property.id, ip: req.ip });
  res.status(201).json({ success: true, data: { id: property.id, slug: fields.slug } });
});

// ---------------------------------------------------------------
// PUT /api/properties/:id  (admin only)
// ---------------------------------------------------------------
const updateProperty = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id);
  if (!id || !await Property.exists({ id })) throw new ApiError(404, 'Property not found.');

  const fields = pickFields(req.body);
  // Slugs remain stable after publication so title edits do not break indexed
  // URLs and saved links. Duplicate/create operations still generate new slugs.
  if (Object.keys(fields).length === 0) throw new ApiError(400, 'No valid fields to update.');
  await validatePropertyReferences(fields);

  await Property.updateOne({ id }, { $set: fields }, { runValidators: true });

  await logActivity({ userId: req.user.id, action: 'Property Updated', entity: 'property', entityId: id, ip: req.ip });
  res.json({ success: true, message: 'Property updated.' });
});

// ---------------------------------------------------------------
// DELETE /api/properties/:id  (admin only)
// ---------------------------------------------------------------
const deleteProperty = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id);
  const images = id ? await PropertyImage.find({ property_id: id }).select('image_path -_id').lean() : [];
  const result = id ? await Property.deleteOne({ id }) : { deletedCount: 0 };
  if (result.deletedCount === 0) throw new ApiError(404, 'Property not found.');
  await Promise.all([
    PropertyImage.deleteMany({ property_id: id }),
    Lead.updateMany({ property_id: id }, { $set: { property_id: null } })
  ]);

  await Promise.all(images.map(img => removeStoredImage(img.image_path)));

  await logActivity({ userId: req.user.id, action: 'Property Deleted', entity: 'property', entityId: id, ip: req.ip });
  res.json({ success: true, message: 'Property deleted.' });
});

// ---------------------------------------------------------------
// POST /api/properties/:id/duplicate  (admin only)
// ---------------------------------------------------------------
const duplicateProperty = asyncHandler(async (req, res) => {
  const original = await Property.findOne({ id: Number(req.params.id) }).lean();
  if (!original) throw new ApiError(404, 'Property not found.');

  const fields = pickFields(original);
  const duplicateSuffix = ' (Copy)';
  fields.title = `${String(original.title).slice(0, 255 - duplicateSuffix.length)}${duplicateSuffix}`;
  fields.slug = await generateUniqueSlug(Property, fields.title);
  fields.status = 'draft';
  fields.created_by = req.user.id;

  const property = await Property.create(fields);

  // Images are intentionally not shared between records. Upload images to the
  // draft copy so deleting either property can never break the other.

  await logActivity({ userId: req.user.id, action: 'Property Duplicated', entity: 'property', entityId: property.id, ip: req.ip });
  res.status(201).json({ success: true, data: { id: property.id } });
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
    const result = await Property.updateOne({ id: Number(id) }, { $set: { status } }, { runValidators: true });
    if (result.matchedCount === 0) throw new ApiError(404, 'Property not found.');
    await logActivity({ userId: req.user.id, action: `Property status set to ${status}`, entity: 'property', entityId: Number(id), ip: req.ip });
    return res.json({ success: true, message: `Status updated to ${status}.` });
  }

  if (!ALLOWED_TOGGLES.includes(field)) throw new ApiError(400, 'Invalid toggle field.');
  const result = await Property.updateOne({ id: Number(id) }, { $set: { [field]: value ? 1 : 0 } }, { runValidators: true });
  if (result.matchedCount === 0) throw new ApiError(404, 'Property not found.');
  await logActivity({ userId: req.user.id, action: `Property ${field} set to ${!!value}`, entity: 'property', entityId: Number(id), ip: req.ip });
  res.json({ success: true, message: 'Property updated.' });
});

// ---------------------------------------------------------------
// IMAGES
// ---------------------------------------------------------------
const uploadImages = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id);
  let keepFiles = false;
  try {
    if (!id || !await Property.exists({ id })) throw new ApiError(404, 'Property not found.');

    if (!req.files || req.files.length === 0) throw new ApiError(400, 'No images uploaded.');
    if (req.files.some(file => !hasValidImageSignature(file.path))) {
      throw new ApiError(400, 'One or more files are not valid JPEG, PNG or WEBP images.');
    }

    const lastImage = await PropertyImage.findOne({ property_id: id })
      .select('sort_order -_id').sort({ sort_order: -1 }).lean();
    let sortOrder = lastImage ? lastImage.sort_order + 1 : 0;
    const inserted = [];
    try {
      for (const file of req.files) {
        const relativePath = `/uploads/properties/${file.filename}`;
        const isFeatured = sortOrder === 0 ? 1 : 0;
        const image = await PropertyImage.create({
          property_id: id,
          image_path: relativePath,
          alt_text: String(req.body.alt_text || '').trim().slice(0, 255) || null,
          is_featured: isFeatured,
          sort_order: sortOrder
        });
        inserted.push({ id: image.id, image_path: relativePath });
        sortOrder += 1;
      }
    } catch (error) {
      if (inserted.length) await PropertyImage.deleteMany({ id: { $in: inserted.map((image) => image.id) } });
      throw error;
    }

    keepFiles = true;
    res.status(201).json({ success: true, data: inserted });
  } finally {
    if (!keepFiles) await removeUploadedFiles(req.files);
  }
});

const deleteImage = asyncHandler(async (req, res) => {
  const imageId = numericId(req.params.imageId);
  const image = imageId ? await PropertyImage.findOneAndDelete({ id: imageId }) : null;
  if (!image) throw new ApiError(404, 'Image not found.');
  await removeStoredImage(image.image_path);

  res.json({ success: true, message: 'Image deleted.' });
});

const reorderImages = asyncHandler(async (req, res) => {
  const id = numericId(req.params.id);
  const { order } = req.body; // array of { id, sort_order, is_featured }
  if (!Array.isArray(order) || order.length === 0) throw new ApiError(400, 'order must be a non-empty array.');
  if (order.filter(item => item.is_featured).length > 1) throw new ApiError(400, 'Only one image can be featured.');
  if (order.some(item => !Number.isInteger(Number(item.id)) || !Number.isInteger(Number(item.sort_order)) || Number(item.sort_order) < 0)) {
    throw new ApiError(400, 'Each image requires a valid id and sort order.');
  }

  const ids = order.map(item => Number(item.id));
  const owned = id
    ? await PropertyImage.find({ property_id: id, id: { $in: ids } }).select('id -_id').lean()
    : [];
  if (owned.length !== new Set(ids).size) throw new ApiError(400, 'One or more images do not belong to this property.');

  await PropertyImage.bulkWrite(order.map((item) => ({
    updateOne: {
      filter: { id: Number(item.id), property_id: id },
      update: { $set: { sort_order: Number(item.sort_order), is_featured: item.is_featured ? 1 : 0 } }
    }
  })));
  res.json({ success: true, message: 'Image order updated.' });
});

module.exports = {
  listProperties, getPropertyBySlug, adminListProperties, adminGetProperty,
  createProperty, updateProperty, deleteProperty, duplicateProperty, toggleProperty,
  uploadImages, deleteImage, reorderImages
};
