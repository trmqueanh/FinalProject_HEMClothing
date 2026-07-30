const CLOUDINARY_FOLDER = 'Hem_products';
const COLLECTION_CLOUDINARY_FOLDER = 'Hem_collections';
const RETURN_EVIDENCE_CLOUDINARY_FOLDER = 'Hem_returns';
const CLOUDINARY_MAX_UPLOAD_CONCURRENCY = 3;
const CLOUDINARY_UPLOAD_RETRIES = 3;
const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
const COMPRESS_IMAGE_OVER_BYTES = 1400 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const COMPRESSED_IMAGE_QUALITY = 0.8;
const COLLECTION_BANNER_COMPRESS_OVER_BYTES = 4 * 1024 * 1024;
const COLLECTION_BANNER_MAX_DIMENSION = 3200;
const COLLECTION_BANNER_QUALITY = 0.92;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const isRetryableUploadError = error => {
  const status = Number(error && error.status);
  return !status || status === 408 || status === 429 || status >= 500;
};

const formatBytes = bytes => {
  const value = Number(bytes) || 0;

  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(value / 1024))} KB`;
};

const validateImageFile = file => {
  if (!file) {
    return;
  }

  const type = String(file.type || '').toLowerCase();

  if (!SUPPORTED_IMAGE_TYPES.has(type)) {
    throw new Error(`${file.name || 'Image'} is not supported. Please use JPG, PNG, WebP, or AVIF.`);
  }

  if (Number(file.size) > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error(`${file.name || 'Image'} is too large (${formatBytes(file.size)}). Please use an image under ${formatBytes(MAX_SOURCE_IMAGE_BYTES)}.`);
  }
};

const loadImageElement = file => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };

  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error(`${file.name || 'Image'} could not be read. Please try another JPG, PNG, WebP, or AVIF file.`));
  };

  image.src = url;
});

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob(blob => {
    if (!blob) {
      reject(new Error('Could not prepare image for upload.'));
      return;
    }

    resolve(blob);
  }, type, quality);
});

const prepareImageFileForUpload = async file => {
  validateImageFile(file);

  const image = await loadImageElement(file);
  const width = Number(image.naturalWidth || image.width || 0);
  const height = Number(image.naturalHeight || image.height || 0);
  const largestSide = Math.max(width, height);
  const shouldResize = largestSide > MAX_IMAGE_DIMENSION;
  const shouldCompress = Number(file.size) > COMPRESS_IMAGE_OVER_BYTES;

  if (!shouldResize && !shouldCompress) {
    return file;
  }

  const scale = shouldResize ? MAX_IMAGE_DIMENSION / largestSide : 1;
  const nextWidth = Math.max(1, Math.round(width * scale));
  const nextHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', {
    alpha: false
  });

  canvas.width = nextWidth;
  canvas.height = nextHeight;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, nextWidth, nextHeight);
  context.drawImage(image, 0, 0, nextWidth, nextHeight);

  const blob = await canvasToBlob(canvas, 'image/jpeg', COMPRESSED_IMAGE_QUALITY);

  return new File([blob], `${String(file.name || 'product-image').replace(/\.[^.]+$/, '')}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now()
  });
};

const prepareCollectionBannerFileForUpload = async file => {
  validateImageFile(file);

  const image = await loadImageElement(file);
  const width = Number(image.naturalWidth || image.width || 0);
  const height = Number(image.naturalHeight || image.height || 0);
  const largestSide = Math.max(width, height);
  const shouldResize = largestSide > COLLECTION_BANNER_MAX_DIMENSION;
  const shouldCompress = Number(file.size) > COLLECTION_BANNER_COMPRESS_OVER_BYTES;

  if (!shouldResize && !shouldCompress) {
    return file;
  }

  const scale = shouldResize ? COLLECTION_BANNER_MAX_DIMENSION / largestSide : 1;
  const nextWidth = Math.max(1, Math.round(width * scale));
  const nextHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', {
    alpha: false
  });

  canvas.width = nextWidth;
  canvas.height = nextHeight;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, nextWidth, nextHeight);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, nextWidth, nextHeight);

  const blob = await canvasToBlob(canvas, 'image/jpeg', COLLECTION_BANNER_QUALITY);

  return new File([blob], `${String(file.name || 'collection-banner').replace(/\.[^.]+$/, '')}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now()
  });
};

const uploadWithRetry = async file => {
  let lastError = null;

  for (let attempt = 0; attempt <= CLOUDINARY_UPLOAD_RETRIES; attempt += 1) {
    try {
      return await uploadProductImageToCloudinary(file);
    } catch (error) {
      lastError = error;

      if (!isRetryableUploadError(error) || attempt === CLOUDINARY_UPLOAD_RETRIES) {
        throw error;
      }

      await delay(500 * (attempt + 1));
    }
  }

  throw lastError;
};

const mapWithConcurrency = async (items, limit, mapper) => {
  const results = Array.from({ length: items.length });
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
};

const getUploadConcurrency = images => {
  const newUploadCount = images.filter(image => image && image.file).length;

  if (newUploadCount <= 8) {
    return CLOUDINARY_MAX_UPLOAD_CONCURRENCY;
  }

  if (newUploadCount <= 16) {
    return 2;
  }

  return 1;
};

const uploadImageAssetToCloudinary = async (file, folder) => {
  if (!file) {
    return { imageUrl: '', publicId: '' };
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration is missing. Please check VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  let response;

  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });
  } catch (error) {
    const uploadError = new Error(`${file.name || 'Image'} could not be uploaded. Please check your connection and try again.`);
    uploadError.status = 0;
    uploadError.cause = error;
    throw uploadError;
  }

  let payload;

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok || !payload.secure_url) {
    const error = new Error(payload.error?.message || 'Could not upload product image to Cloudinary.');
    error.status = response.status;
    throw error;
  }

  return {
    imageUrl: String(payload.secure_url || ''),
    publicId: String(payload.public_id || '')
  };
};

export const uploadProductImageToCloudinary = async file => {
  const asset = await uploadImageAssetToCloudinary(file, CLOUDINARY_FOLDER);
  return asset.imageUrl;
};

export const prepareCollectionBannerForSave = async file => {
  if (!file) {
    return { imageUrl: '', publicId: '' };
  }

  const uploadFile = await prepareCollectionBannerFileForUpload(file);
  let lastError = null;

  for (let attempt = 0; attempt <= CLOUDINARY_UPLOAD_RETRIES; attempt += 1) {
    try {
      return await uploadImageAssetToCloudinary(uploadFile, COLLECTION_CLOUDINARY_FOLDER);
    } catch (error) {
      lastError = error;
      if (!isRetryableUploadError(error) || attempt === CLOUDINARY_UPLOAD_RETRIES) throw error;
      await delay(500 * (attempt + 1));
    }
  }

  throw lastError;
};

export const prepareReturnEvidenceForSave = async files => {
  const normalizedFiles = Array.from(files || []).filter(Boolean).slice(0, 8);
  return mapWithConcurrency(normalizedFiles, CLOUDINARY_MAX_UPLOAD_CONCURRENCY, async file => {
    const uploadFile = await prepareImageFileForUpload(file);
    let lastError = null;

    for (let attempt = 0; attempt <= CLOUDINARY_UPLOAD_RETRIES; attempt += 1) {
      try {
        return await uploadImageAssetToCloudinary(uploadFile, RETURN_EVIDENCE_CLOUDINARY_FOLDER);
      } catch (error) {
        lastError = error;
        if (!isRetryableUploadError(error) || attempt === CLOUDINARY_UPLOAD_RETRIES) throw error;
        await delay(500 * (attempt + 1));
      }
    }

    throw lastError;
  });
};

export const prepareProductImagesForSave = async images => {
  const normalizedImages = Array.isArray(images) ? images : [];
  const uploadConcurrency = getUploadConcurrency(normalizedImages);
  const uploadedImages = await mapWithConcurrency(normalizedImages, uploadConcurrency, async (image, index) => {
    const uploadFile = image.file
      ? await prepareImageFileForUpload(image.file)
      : null;
    const imageUrl = uploadFile
      ? await uploadWithRetry(uploadFile)
      : String(image.imageUrl || image.image_url || '').trim();

    if (!imageUrl) {
      return null;
    }

    return {
      colorName: String(image.colorName || image.color_name || '').trim(),
      imageUrl,
      altText: String(image.altText || image.alt_text || '').trim(),
      isPrimary: Boolean(image.isPrimary || image.is_primary),
      sortOrder: Number.parseInt(image.sortOrder ?? image.sort_order ?? index, 10) || 0
    };
  }).then(items => items.filter(Boolean));

  const hasPrimaryByColor = uploadedImages.reduce((accumulator, image) => {
    const key = image.colorName.toLowerCase();
    accumulator.set(key, accumulator.get(key) || image.isPrimary);
    return accumulator;
  }, new Map());
  const primaryByColor = new Set();

  return uploadedImages.map((image, index) => {
    const key = image.colorName.toLowerCase();
    const firstForColor = uploadedImages.findIndex(item => item.colorName.toLowerCase() === key) === index;
    const shouldBePrimary = (image.isPrimary && !primaryByColor.has(key)) || (!hasPrimaryByColor.get(key) && firstForColor);

    if (shouldBePrimary) {
      primaryByColor.add(key);
    }

    return {
      ...image,
      isPrimary: shouldBePrimary
    };
  });
};
