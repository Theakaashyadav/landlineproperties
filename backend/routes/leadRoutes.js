const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { createLead } = require('../controllers/leadController');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();
const ALLOWED_LEAD_SOURCES = [
  'website', 'contact-page', 'homepage', 'property-page', 'property-details-page', 'buy-page',
  'featured-properties-page', 'rent-page', 'investment-page', 'new-projects-page',
  'project-details-page', 'list-property'
];

// Public form-submission limiter: 15 submissions per 15 min per IP, stops spam bots.
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many submissions. Please try again later.' }
});

// POST /api/leads
router.post('/', formLimiter,
  body('name').trim().isLength({ min: 2, max: 150 }),
  body('phone').trim().matches(/^[+\d][\d\s()-]{7,24}$/).withMessage('Please provide a valid phone number.'),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('property_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid property selection.'),
  body('project_id').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid project selection.'),
  body('project').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Invalid project selection.'),
  body('inquiry_type').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('type').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('requirement').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('location').optional({ checkFalsy: true }).trim().isLength({ max: 150 }),
  body('budget').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('source').optional({ checkFalsy: true }).trim().isIn(ALLOWED_LEAD_SOURCES).withMessage('Invalid enquiry source.'),
  body('message').optional({ checkFalsy: true }).isLength({ max: 2000 }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new ApiError(400, errors.array().map(error => error.msg).join(' ')));
    next();
  },
  createLead
);

module.exports = router;
