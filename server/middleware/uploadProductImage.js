const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadRoot = path.resolve(__dirname, '../public/uploads/products');
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif']
]);

fs.mkdirSync(uploadRoot, {
  recursive: true
});

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadRoot);
  },
  filename: (req, file, callback) => {
    const extension = ALLOWED_IMAGE_TYPES.get(String(file.mimetype || '').toLowerCase()) || '.jpg';
    const safeBaseName = path
      .basename(file.originalname || 'product-image', path.extname(file.originalname || ''))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    callback(null, `${Date.now()}-${crypto.randomUUID()}-${safeBaseName || 'product-image'}${extension}`);
  }
});

const fileFilter = (req, file, callback) => {
  if (!ALLOWED_IMAGE_TYPES.has(String(file.mimetype || '').toLowerCase())) {
    const error = new Error('Only JPG, PNG, WebP, or AVIF image files can be uploaded.');
    error.statusCode = 400;
    return callback(error);
  }

  return callback(null, true);
};

module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
