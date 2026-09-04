const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { requestToken } = require('../middleware/auth');
const { logActivity } = require('../utils/activityLog');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || Boolean(process.env.LSNODE_SOCKET),
  sameSite: 'lax',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000 // 8 hours
};

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() })
    .select('id name email password_hash role is_active auth_version -_id')
    .lean();

  // Same generic message whether the email doesn't exist or the password is wrong,
  // so we don't reveal which accounts exist.
  const genericError = 'Invalid email or password.';
  if (!user) throw new ApiError(401, genericError);
  if (!user.is_active) throw new ApiError(403, 'This account has been deactivated.');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new ApiError(401, genericError);

  const token = jwt.sign(
    { id: user.id, ver: Number(user.auth_version || 0) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  await User.updateOne({ id: user.id }, { $set: { last_login_at: new Date() } });
  await logActivity({ userId: user.id, action: 'Logged in', entity: 'user', entityId: user.id, ip: req.ip });

  res.cookie('token', token, COOKIE_OPTIONS);
  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

const logout = asyncHandler(async (req, res) => {
  const token = requestToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (Number.isInteger(Number(decoded.id))) {
        await User.updateOne(
          { id: Number(decoded.id), auth_version: Number(decoded.ver || 0) },
          { $inc: { auth_version: 1 } }
        );
      }
    } catch (error) {
      // Expired/invalid tokens still get removed from this browser. Database
      // failures remain actionable instead of pretending revocation succeeded.
      if (!['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(error.name)) throw error;
    }
  }
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || Boolean(process.env.LSNODE_SOCKET),
    sameSite: 'lax',
    path: '/'
  });
  res.json({ success: true, message: 'Logged out.' });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = { login, logout, me };
