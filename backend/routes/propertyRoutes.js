const express = require('express');
const { listProperties, getPropertyBySlug } = require('../controllers/propertyController');

const router = express.Router();

// GET /api/properties?purpose=Buy&location=gurgaon&type=Apartment&budget=25000000&page=1
router.get('/', listProperties);

// GET /api/properties/:slug
router.get('/:slug', getPropertyBySlug);

module.exports = router;
