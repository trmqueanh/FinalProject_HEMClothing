// Cart item helpers: shared price, product-link, and stock helpers for cart/order item displays.
export const itemPrice = item => {
  const price = Number(item && (item.price ?? item.productPrice ?? item.unitPrice ?? item.priceAtPurchase ?? 0));
  return Number.isFinite(price) ? price : 0;
};

export const itemComparePrice = item => {
  const comparePrice = Number(item && (
    item.originalPrice ??
    item.original_price ??
    item.listingComparePrice ??
    item.listing_compare_price ??
    item.comparePrice ??
    item.compare_price ??
    (item.product && (
      item.product.originalPrice ??
      item.product.original_price ??
      item.product.listingComparePrice ??
      item.product.listing_compare_price ??
      item.product.comparePrice ??
      item.product.compare_price
    )) ??
    0
  ));
  return Number.isFinite(comparePrice) ? comparePrice : 0;
};

export const itemPricingMode = item => {
  const pricingMode = String(item && (item.pricingMode || item.pricing_mode || '')).trim().toLowerCase();

  if (['regular', 'sale'].includes(pricingMode)) {
    return pricingMode;
  }

  if (item && (item.isSale || item.is_sale)) return 'sale';

  const explicitLabel = String(item && (item.priceLabel || item.price_label || '')).trim().toLowerCase();
  if (explicitLabel.includes('sale')) return 'sale';

  return 'regular';
};

export const itemPriceTone = item => {
  const pricingMode = itemPricingMode(item);
  return pricingMode;
};

export const hasComparePrice = item => itemComparePrice(item) > itemPrice(item);

export const orderItemPrice = item => {
  const price = Number(item && (item.priceAtPurchase ?? item.productPrice ?? item.price ?? 0));
  return Number.isFinite(price) ? price : 0;
};

export const orderItemComparePrice = item => {
  const comparePrice = Number(item && (item.originalPrice ?? item.original_price ?? 0));
  return Number.isFinite(comparePrice) ? comparePrice : 0;
};

export const orderItemHasComparePrice = item => orderItemComparePrice(item) > orderItemPrice(item);

export const priceLabel = item => {
  const pricingMode = itemPricingMode(item);
  if (pricingMode === 'sale') return 'Sale';

  return String(item && (item.priceLabel || item.price_label || '')).trim();
};

const productDepartmentPath = item => {
  const department = String(
    item && (
      item.gender ||
      item.productGender ||
      item.product_gender ||
      item.department ||
      item.productDepartment ||
      item.product_department ||
      (item.product && item.product.gender) ||
      ''
    ) || ''
  ).trim().toLowerCase();

  if (department === 'men' || department === 'women') {
    return `/${department}/product`;
  }

  return '/products';
};

export const productVariantQuery = item => {
  const colorVariantId = String(
    item && (
      item.colorVariantId ||
      item.color_variant_id ||
      item.selectedColorVariantId ||
      item.selected_color_variant_id ||
      (item.product && (item.product.colorVariantId || item.product.color_variant_id)) ||
      ''
    ) || ''
  ).trim();
  const colorName = String(
    item && (
      item.colorName ||
      item.color_name ||
      item.color ||
      item.selectedColor ||
      item.selected_color ||
      (item.product && (item.product.colorName || item.product.color_name || item.product.color)) ||
      ''
    ) || ''
  ).trim();
  const query = {};

  if (colorVariantId) query.variant = colorVariantId;
  if (colorName) query.colorName = colorName;

  return query;
};

const productItemLink = (item, productId) => productId
  ? {
      path: `${productDepartmentPath(item)}/${encodeURIComponent(productId)}`,
      query: productVariantQuery(item)
    }
  : '/products';

export const cartProductLink = item => {
  const productId = item && (item.productSlug || item.slug || item.productId || item.product_id || item.id);
  return productItemLink(item, productId);
};

export const orderItemProductLink = item => {
  const productId = item && (item.productSlug || item.slug || item.productId || item.product_id);
  return productItemLink(item, productId);
};

const normalizeImageValue = (image, index = 0, fallbackAlt = 'HEM product') => {
  if (typeof image === 'string') {
    return {
      src: image.trim(),
      isPrimary: index === 0,
      sortOrder: index,
      alt: fallbackAlt
    };
  }

  if (!image || typeof image !== 'object') {
    return null;
  }

  return {
    src: String(image.imageUrl || image.image_url || image.productImage || image.product_image || image.url || '').trim(),
    isPrimary: Boolean(image.isPrimary || image.is_primary),
    sortOrder: Number(image.sortOrder || image.sort_order || index),
    colorVariantId: String(image.colorVariantId || image.color_variant_id || '').trim(),
    colorName: String(image.colorName || image.color_name || '').trim().toLowerCase(),
    alt: String(image.altText || image.alt_text || fallbackAlt).trim()
  };
};

const collectImageCandidates = source => {
  if (!source || typeof source !== 'object') {
    return [];
  }

  const fallbackAlt = source.name || source.productName || 'HEM product';
  const arrays = [
    source.productImages,
    source.product_images,
    source.images,
    source.imageUrls,
    source.image_urls
  ].filter(Array.isArray);

  const candidates = arrays
    .flatMap(images => images.map((image, index) => normalizeImageValue(image, index, fallbackAlt)))
    .filter(image => image && image.src);

  [
    source.imageUrl,
    source.image_url,
    source.productImage,
    source.product_image
  ].forEach((image, index) => {
    const normalized = normalizeImageValue(image, candidates.length + index, fallbackAlt);
    if (normalized && normalized.src) {
      candidates.push(normalized);
    }
  });

  return candidates;
};

export const primaryProductImage = item => {
  const candidates = [
    ...collectImageCandidates(item && item.product),
    ...collectImageCandidates(item)
  ];

  if (!candidates.length) {
    return '';
  }

  const selectedVariantId = String(
    item && (
      item.colorVariantId ||
      item.color_variant_id ||
      item.selectedColorVariantId ||
      item.variantColorId ||
      (item.product && (item.product.colorVariantId || item.product.color_variant_id))
    ) || ''
  ).trim();
  const selectedColor = String(
    item && (
      item.colorName ||
      item.color_name ||
      item.color ||
      (item.product && (item.product.colorName || item.product.color_name || item.product.color))
    ) || ''
  ).trim().toLowerCase();
  const [firstImage] = [...candidates].sort((left, right) => {
    if (selectedVariantId) {
      const leftMatches = left.colorVariantId === selectedVariantId ? 1 : 0;
      const rightMatches = right.colorVariantId === selectedVariantId ? 1 : 0;

      if (leftMatches !== rightMatches) {
        return rightMatches - leftMatches;
      }
    }

    if (selectedColor) {
      const leftMatches = left.colorName === selectedColor ? 1 : 0;
      const rightMatches = right.colorName === selectedColor ? 1 : 0;

      if (leftMatches !== rightMatches) {
        return rightMatches - leftMatches;
      }
    }

    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    return left.sortOrder - right.sortOrder;
  });

  return firstImage.src;
};

export const stockQuantity = item => {
  const quantity = Number(
    item
      ? item.maxQuantity ?? item.availableQuantity ?? item.max_quantity ?? item.available_quantity
      : NaN
  );

  return Number.isFinite(quantity) ? quantity : null;
};

export const maxQuantity = item => {
  const currentQuantity = Number(item && item.quantity) || 1;
  const quantity = stockQuantity(item);

  if (quantity === null || quantity <= 0) {
    return currentQuantity;
  }

  return Math.max(1, quantity);
};

export const canIncrease = item => {
  const quantity = stockQuantity(item);

  if (quantity !== null && quantity <= 0) {
    return false;
  }

  return Number(item && item.quantity) < maxQuantity(item);
};

export const stockLimitLabel = item => {
  const quantity = stockQuantity(item);

  return quantity && quantity > 0
    ? `Only ${quantity} left · Maximum quantity reached`
    : 'Maximum quantity reached';
};

export const cartItemCount = items =>
  (Array.isArray(items) ? items : []).reduce((total, item) => total + Number(item.quantity || 0), 0);

export const cartSubtotal = items =>
  (Array.isArray(items) ? items : []).reduce((total, item) => total + itemPrice(item) * Number(item.quantity || 0), 0);

export const FREE_SHIPPING_THRESHOLD = 500000;
export const DEFAULT_SHIPPING_FEE = 30000;

export const cartShipping = subtotal => {
  if (subtotal === 0) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
};

export const cartTotal = subtotal => subtotal + cartShipping(subtotal);
