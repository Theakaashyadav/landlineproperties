const express = require('express');
const { body, validationResult } = require('express-validator');
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
  body('title').optional().isLength({ min: 3, max: 255 }).trim(),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('purpose').optional().isIn(['Buy', 'Rent', 'Commercial']),
  body('property_type').optional().isIn(['Apartment', 'Villa', 'Plot', 'Independent House', 'Builder Floor', 'Commercial', 'Office', 'Shop', 'Warehouse', 'Land']),
  body('city').optional().trim().isLength({ min: 2, max: 100 }),
  body('status').optional().isIn(['published', 'draft', 'pending', 'sold', 'rented', 'unpublished']),
  body('seo_title').optional({ checkFalsy: true }).isLength({ max: 255 }),
  body('seo_description').optional({ checkFalsy: true }).isLength({ max: 500 })
];

router.get('/', adminListProperties);
router.get('/:id', adminGetProperty);
router.post('/', propertyValidation, validate, createProperty);
router.put('/:id', propertyValidation, validate, updateProperty);
router.delete('/:id', authorize('super_admin', 'admin'), deleteProperty);
router.post('/:id/duplicate', duplicateProperty);
router.patch('/:id/toggle', toggleProperty);

router.post('/:id/images', upload.array('images', 20), uploadImages);
router.delete('/images/:imageId', deleteImage);
router.patch('/:id/images/reorder', reorderImages);

module.exports = router;
