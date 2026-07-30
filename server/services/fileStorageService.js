const fs = require('fs/promises');

const matchesImageSignature = (buffer, mimeType) => {
  const type = String(mimeType || '').toLowerCase();

  if (type === 'image/jpeg') {
    return buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;
  }

  if (type === 'image/png') {
    return buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (type === 'image/webp') {
    return buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }

  if (type === 'image/avif') {
    return buffer.length >= 16 &&
      buffer.subarray(4, 8).toString('ascii') === 'ftyp' &&
      ['avif', 'avis'].includes(buffer.subarray(8, 12).toString('ascii'));
  }

  return false;
};

const validateStoredImage = async file => {
  if (!file?.path || !file?.mimetype) {
    return false;
  }

  const handle = await fs.open(file.path, 'r');

  try {
    const buffer = Buffer.alloc(32);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return matchesImageSignature(buffer.subarray(0, bytesRead), file.mimetype);
  } finally {
    await handle.close();
  }
};

const removeStoredFile = async filePath => {
  if (!filePath) {
    return;
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

module.exports = {
  matchesImageSignature,
  validateStoredImage,
  removeStoredFile
};
