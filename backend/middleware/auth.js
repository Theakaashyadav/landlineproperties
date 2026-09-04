const jwt = require('jsonwebtoken');
const { User } = require('../models');

function requestToken(req) {
  if (req.cookies && req.cookies.token) return req.cookies.token;
  const authorization = req.headers.authorization;
  if (authorization && /^Bearer\s+\S+$/i.test(authorization)) return authorization.replace(/^Bearer\s+/i, '');
  return null;
}

/**
 * Verifies the JWT sent either as an httpOnly cookie ("token") or as an
 * Authorization: Bearer <token> header. Attaches { id, email, role } to req.user.
 */
async function authenticate(req, res, next) {
  const token = requestToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }

  if (!Number.isInteger(Number(decoded.id))) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }

  try {
    const user = await User.findOne({ id: Number(decoded.id) })
      .select('id name email role is_active auth_version -_id')
      .lean();
    const tokenVersion = Number(decoded.ver || 0);
    if (!user || !user.is_active || Number(user.auth_version || 0) !== tokenVersion) {
      return res.status(401).json({ success: false, message: 'Your session is no longer active. Please log in again.' });
    }

    // Authorization always uses current database state, never stale JWT claims.
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    req.auth = { tokenVersion };
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Restricts a route to specific roles. Usage: authorize('super_admin', 'admin')
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (allowedRoles.length && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { authenticate, authorize, requestToken };
