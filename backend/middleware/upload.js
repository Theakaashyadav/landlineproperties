const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_BYTES = (parseInt(process.env.MAX_UPLOAD_MB, 10) || 5) * 1024 * 1024;

function makeStorage(subfolder) {
  const dir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads', subfolder);
  fs.mkdirSync(dir, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = crypto.randomBytes(16).toString('hex') + ext;
      cb(null, safeName);
    }
  });
}

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME.includes(file.mimetype) || !ALLOWED_EXT.includes(ext)) {
    return cb(new Error('Only JPEG, PNG and WEBP images are allowed.'));
  }
  cb(null, true);
}

function createUploader(subfolder) {
  return multer({
    storage: makeStorage(subfolder),
    limits: { fileSize: MAX_BYTES, files: 20 },
    fileFilter
  });
}

module.exports = { createUploader };
