const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Slow down brute-force login attempts: 10 tries per 15 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticate, me);

module.exports = router;
