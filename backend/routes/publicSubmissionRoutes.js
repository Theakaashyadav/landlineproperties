const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { submitListing } = require('../controllers/publicSubmissionController');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please try again later.' }
});

// POST /api/list-property
router.post('/', limiter,
  body('name').trim().isLength({ min: 2, max: 150 }),
  body('phone').trim().matches(/^[+\d][\d\s()-]{7,24}$/).withMessage('Please provide a valid phone number.'),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('property_type').isIn(['Apartment','Villa','Plot','Independent House','Builder Floor','Commercial','Office','Shop','Warehouse','Land']),
  body('city').trim().isLength({ min: 2, max: 100 }),
  body('locality').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body('purpose').optional({ checkFalsy: true }).isIn(['Buy','Rent','Commercial']),
  body('price').optional({ checkFalsy: true }).isFloat({ min: 0 }),
  body('description').optional({ checkFalsy: true }).isLength({ max: 5000 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new ApiError(400, errors.array().map(error => error.msg).join(' ')));
    next();
  },
  submitListing
);

module.exports = router;
