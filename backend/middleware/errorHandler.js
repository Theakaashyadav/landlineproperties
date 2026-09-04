// Catches errors from any route (including async ones wrapped in asyncHandler)
// and returns a consistent JSON shape without leaking internals in production.
function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;

  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') status = 400;
  if (status >= 500) console.error(err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'A record with this value already exists (duplicate slug or unique field).' });
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

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ success: false, message: 'The selected related record does not exist.' });
  }

  if (['ER_DATA_TOO_LONG', 'ER_WARN_DATA_OUT_OF_RANGE', 'ER_TRUNCATED_WRONG_VALUE', 'ER_BAD_NULL_ERROR'].includes(err.code)) {
    return res.status(400).json({ success: false, message: 'One or more values are invalid or too long.' });
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
