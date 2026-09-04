const express = require('express');
const { body, param, validationResult } = require('express-validator');
const {
  adminListProperties, adminGetProperty, createProperty, updateProperty,
  deleteProperty, duplicateProperty, toggleProperty, uploadImages, deleteImage, reorderImages
} = require('../controllers/propertyController');
const { authenticate, authorize } = require('../middleware/auth');
const { createUploader } = require('../middleware/upload');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();
const upload = createUploader('properties');

router.use(authenticate, authorize('super_admin', 'admin', 'editor'));

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new ApiError(400, errors.array().map((e) => e.msg).join(' ')));
  next();
}

const propertyValidation = [
  body('title').optional().trim().isLength({ min: 3, max: 255 }).withMessage('Title must be between 3 and 255 characters.'),
  body('price').optional({ nullable: true }).isFloat({ min: 0, max: 9999999999999.99 }).withMessage('Price must be a non-negative number.'),
  body('price_label').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('purpose').optional().isIn(['Buy', 'Rent', 'Commercial']),
  body('property_type').optional().isIn(['Apartment', 'Villa', 'Plot', 'Independent House', 'Builder Floor', 'Commercial', 'Office', 'Shop', 'Warehouse', 'Land']),
  body('city').optional().trim().isLength({ min: 2, max: 100 }),
  body('locality').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('sector').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('location_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('bhk').optional({ nullable: true }).trim().isLength({ max: 10 }),
  body('bathrooms').optional({ nullable: true }).isInt({ min: 0, max: 100 }),
  body('area').optional({ nullable: true }).isFloat({ min: 0, max: 99999999.99 }),
  body('area_unit').optional().isIn(['Sq.Ft.', 'Sq.Yd.', 'Acres']),
  body('property_status').optional().isIn(['Ready to Move', 'Under Construction']),
  body('possession_status').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('description').optional({ nullable: true }).isLength({ max: 50000 }),
  body('short_description').optional({ nullable: true }).isLength({ max: 500 }),
  body('amenities').optional({ nullable: true }).custom((value) => {
    let amenities = value;
    if (typeof amenities === 'string') {
      try { amenities = JSON.parse(amenities); } catch { throw new Error('Amenities must be an array.'); }
    }
    if (!Array.isArray(amenities) || amenities.length > 50 || amenities.some(item => typeof item !== 'string' || item.trim().length === 0 || item.length > 100)) {
      throw new Error('Amenities must contain at most 50 non-empty items of 100 characters each.');
    }
    return true;
  }),
  body('developer').optional({ nullable: true }).trim().isLength({ max: 150 }),
  body('rera_number').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('property_facing').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('floor').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('total_floors').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('parking').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('furnishing').optional({ nullable: true }).isIn(['Unfurnished', 'Semi-Furnished', 'Fully Furnished']),
  body('year_built').optional({ nullable: true }).isInt({ min: 1900, max: new Date().getFullYear() + 10 }),
  body('broker_id').optional({ nullable: true }).isInt({ min: 1 }),
  body('featured').optional().isBoolean(),
  body('verified').optional().isBoolean(),
  body('new_launch').optional().isBoolean(),
  body('status').optional().isIn(['published', 'draft', 'pending', 'sold', 'rented', 'unpublished']),
  body('seo_title').optional({ nullable: true }).isLength({ max: 255 }),
  body('seo_description').optional({ nullable: true }).isLength({ max: 500 }),
  body('canonical_url').optional({ nullable: true }).isURL({ require_protocol: true }).isLength({ max: 255 }),
  body('og_image').optional({ nullable: true }).isLength({ max: 255 })
];

const idValidation = [param('id').isInt({ min: 1 }).withMessage('Invalid property id.'), validate];
const imageIdValidation = [param('imageId').isInt({ min: 1 }).withMessage('Invalid image id.'), validate];

router.get('/', adminListProperties);
router.get('/:id', idValidation, adminGetProperty);
router.post('/', propertyValidation, validate, createProperty);
router.put('/:id', propertyValidation, idValidation, updateProperty);
router.delete('/:id', authorize('super_admin', 'admin'), idValidation, deleteProperty);
router.post('/:id/duplicate', idValidation, duplicateProperty);
router.patch('/:id/toggle', idValidation, toggleProperty);

router.post('/:id/images', idValidation, upload.array('images', 20), uploadImages);
router.delete('/images/:imageId', imageIdValidation, deleteImage);
router.patch('/:id/images/reorder', idValidation, reorderImages);

module.exports = router;
