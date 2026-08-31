const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000 // 8 hours
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = ? LIMIT 1',
    [email.trim().toLowerCase()]
  );

  // Same generic message whether the email doesn't exist or the password is wrong,
  // so we don't reveal which accounts exist.
  const genericError = 'Invalid email or password.';
  if (rows.length === 0) throw new ApiError(401, genericError);

  const user = rows[0];
  if (!user.is_active) throw new ApiError(403, 'This account has been deactivated.');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new ApiError(401, genericError);

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
  await logActivity(pool, { userId: user.id, action: 'Logged in', entity: 'user', entityId: user.id, ip: req.ip });

  res.cookie('token', token, COOKIE_OPTIONS);
  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  res.json({ success: true, message: 'Logged out.' });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = { login, logout, me };
