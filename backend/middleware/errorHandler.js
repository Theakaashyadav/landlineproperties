// Catches errors from any route (including async ones wrapped in asyncHandler)
// and returns a consistent JSON shape without leaking internals in production.
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;

  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') status = 400;
  if (status >= 500) console.error(err);

  if (err.code === 11000 || err.code === 11001) {
    return res.status(409).json({ success: false, message: 'A record with this value already exists (duplicate slug or unique field).' });
  }

  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'One or more values are invalid.' });
  }

  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'Uploaded file is too large.' });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ success: false, message: 'Too many files or an unexpected upload field was provided.' });
  }

  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (typeof err.code === 'string' && err.code.startsWith('LIMIT_')) {
    return res.status(400).json({ success: false, message: 'The upload does not meet the file-count or field limits.' });
  }

  if (['MongoServerSelectionError', 'MongooseServerSelectionError', 'MongoNetworkError', 'MongoNotConnectedError'].includes(err.name)
    || err.code === 18) {
    return res.status(503).json({ success: false, message: 'Database temporarily unavailable.' });
  }

  const message = status === 500 && process.env.NODE_ENV === 'production'
    ? 'Something went wrong. Please try again.'
    : err.message || 'Server error.';

  res.status(status).json({ success: false, message });
}

// Wraps an async route handler so thrown errors/rejections reach errorHandler
// instead of crashing the process.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { errorHandler, asyncHandler, ApiError };
