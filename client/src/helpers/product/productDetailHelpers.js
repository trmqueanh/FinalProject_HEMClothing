import { formatVietnamDate } from '../dateTime';
import { sortSizeItems } from '../sizes';
import { shouldDisplaySize } from '../sizes';

const readImageColorVariantId = item =>
  String(item && (item.colorVariantId || item.color_variant_id) || '').trim();

const readImageColorName = item =>
  String(item && (item.colorName || item.color_name) || '').trim().toLowerCase();

// Product gallery helper: normalizes mixed image payloads into ProductGallery-ready items.
export const buildProductGalleryImages = (product, selectedColorVariantId = '', selectedColor = '') => {
  if (!product) return [];
  const imageObjects = Array.isArray(product.productImages) ? product.productImages : [];
  const imageUrls = Array.isArray(product.images)
    ? product.images
    : Array.isArray(product.imageUrls)
      ? product.imageUrls
      : [];
  const value = imageObjects.length
    ? imageObjects
    : imageUrls.length
      ? imageUrls
      : typeof product.imageUrl === 'string'
        ? [product.imageUrl]
        : [];
  const colorKey = String(selectedColor || '').trim().toLowerCase();
  const normalizedImages = value
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          src: item.trim(),
          alt: product.name || 'HEM product',
          colorVariantId: '',
          colorName: '',
          isPrimary: index === 0,
          sortOrder: index
        };
      }

      return {
        src: String(item.imageUrl || item.image_url || item.url || '').trim(),
        alt: String(item.altText || item.alt_text || product.name || 'HEM product').trim(),
        colorVariantId: readImageColorVariantId(item),
        colorName: readImageColorName(item),
        isPrimary: Boolean(item.isPrimary || item.is_primary),
        sortOrder: Number(item.sortOrder || item.sort_order || index)
      };
    })
    .filter(item => item.src)
    .sort((left, right) => {
      const selectedVariantId = String(selectedColorVariantId || '').trim();

      if (selectedVariantId) {
        const leftMatches = left.colorVariantId === selectedVariantId ? 1 : 0;
        const rightMatches = right.colorVariantId === selectedVariantId ? 1 : 0;
        if (leftMatches !== rightMatches) {
          return rightMatches - leftMatches;
        }
      }

      if (colorKey) {
        const leftMatches = left.colorName === colorKey ? 1 : 0;
        const rightMatches = right.colorName === colorKey ? 1 : 0;
        if (leftMatches !== rightMatches) {
          return rightMatches - leftMatches;
        }
      }

      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }

      return left.sortOrder - right.sortOrder;
    });

  const selectedVariantId = String(selectedColorVariantId || '').trim();
  const variantImages = selectedVariantId
    ? normalizedImages.filter(image => image.colorVariantId === selectedVariantId)
    : [];
  const colorImages = colorKey
    ? normalizedImages.filter(image => image.colorName === colorKey)
    : [];

  return variantImages.length ? variantImages : colorImages.length ? colorImages : normalizedImages;
};

// Review summary helper: converts review ratings into the five-star histogram.
export const buildStarDistribution = reviews => {
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const items = Array.isArray(reviews) ? reviews : [];

  items.forEach(review => {
    const rating = Math.round(review.rating);
    if (counts[rating] !== undefined) {
      counts[rating] += 1;
    }
  });

  return [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: counts[stars],
    percentage: items.length > 0 ? Math.round((counts[stars] / items.length) * 100) : 0
  }));
};

// Product detail text helpers: labels for breadcrumbs, reviews, ratings, and user initials.
export const formatRouteLabel = value =>
  String(value || '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

export const formatProductDate = value =>
  formatVietnamDate(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

export const reviewVariantLabel = (review, productName = '') => {
  const parts = [
    review && review.productName ? review.productName : productName,
    review && review.colorName ? `Color ${review.colorName}` : '',
    review && shouldDisplaySize(review.sizeLabel) ? `Size ${review.sizeLabel}` : ''
  ];

  return parts
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(' · ');
};

export const reviewVariantMeta = review =>
  [
    review && review.colorName ? `Color ${review.colorName}` : '',
    review && shouldDisplaySize(review.sizeLabel) ? `Size ${review.sizeLabel}` : ''
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(' · ');

export const getRatingDescription = rating => {
  const desc = {
    5: 'Excellent - Highly recommend',
    4: 'Good - Satisfied with quality',
    3: 'Average - Met basic expectations',
    2: 'Poor - Could be better',
    1: 'Very Poor - Dissatisfied'
  };

  return desc[rating] || '';
};

// Inventory helpers: read available variants without mutating ProductDetail state.
export const getProductCategoryId = product => {
  const category = product && product.category;

  return String(
    (product && (product.categoryId || product.category_id)) ||
    (category && typeof category === 'object' ? category.id : '') ||
    ''
  ).trim();
};

export const getVariantAvailableQuantity = variant => {
  if (!variant) {
    return 0;
  }

  const explicitAvailable = Number(variant.availableQuantity ?? variant.available_quantity);

  if (Number.isFinite(explicitAvailable)) {
    return Math.max(0, explicitAvailable);
  }

  return Math.max(
    0,
    Number(variant.stockQuantity ?? variant.stock_quantity ?? 0) -
      Number(variant.reservedQuantity ?? variant.reserved_quantity ?? 0)
  );
};

export const findInventoryItem = (inventoryItems, colorName, sizeLabel, colorVariantId = '') => {
  const items = Array.isArray(inventoryItems) ? inventoryItems : [];
  const variantId = String(colorVariantId || '').trim();
  const name = String(colorName || '').trim();

  return items.find(item =>
    variantId &&
    String(item.colorVariantId || item.color_variant_id || '').trim() === variantId &&
    item.sizeLabel === sizeLabel
  ) ||
    items.find(item => item.colorName === name && item.sizeLabel === sizeLabel) ||
    null;
};

export const isColorSoldOut = (inventoryItems, colorName, colorVariantId = '') => {
  const items = Array.isArray(inventoryItems) ? inventoryItems : [];
  const variantId = String(colorVariantId || '').trim();
  const name = String(colorName || '').trim();

  if (!items.length) {
    return false;
  }

  return !items.some(
    item =>
      (
        variantId
          ? String(item.colorVariantId || item.color_variant_id || '').trim() === variantId
          : item.colorName === name
      ) &&
      getVariantAvailableQuantity(item) > 0
  );
};

export const getFirstAvailableVariant = (inventoryItems, preferredColor = '', preferredColorVariantId = '') => {
  const items = Array.isArray(inventoryItems) ? inventoryItems : [];
  const variantId = String(preferredColorVariantId || '').trim();

  if (!items.length) {
    return null;
  }

  const byColorVariant = variantId
    ? items.filter(item => String(item.colorVariantId || item.color_variant_id || '').trim() === variantId)
    : [];
  const byColor = preferredColor
    ? items.filter(item => item.colorName === preferredColor)
    : items;
  const source = sortSizeItems(byColorVariant.length ? byColorVariant : byColor.length ? byColor : items);

  return source.find(item => getVariantAvailableQuantity(item) > 0) || source[0] || null;
};
