import { colorFamilyValue, normalizeColorOption } from '../colors';

const readPrice = value => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
};

const productComparePrice = product =>
  readPrice(product && (product.originalPrice ?? product.original_price)) ??
  readPrice(product && (product.listingComparePrice ?? product.listing_compare_price)) ??
  readPrice(product && (product.comparePrice ?? product.compare_price)) ??
  readPrice(product && product.price) ??
  0;

const productSalePrice = product =>
  readPrice(product && (product.salePrice ?? product.sale_price));

export const listingCardPrice = product =>
  readPrice(product && (product.listingPrice ?? product.listing_price)) ??
  readPrice(product && product.price) ??
  0;

export const listingCardComparePrice = product =>
  readPrice(product && (product.listingComparePrice ?? product.listing_compare_price)) ??
  readPrice(product && (product.originalPrice ?? product.original_price)) ??
  listingCardPrice(product);

export const listingCardDiscountPercent = product => {
  const explicitPercent = Number(product && (product.saleDiscountPercent ?? product.sale_discount_percent ?? 0));

  if (Number.isFinite(explicitPercent) && explicitPercent > 0) {
    return explicitPercent;
  }

  const price = listingCardPrice(product);
  const comparePrice = listingCardComparePrice(product);

  return comparePrice > price && comparePrice > 0
    ? ((comparePrice - price) / comparePrice) * 100
    : 0;
};

export const isListingSaleCard = product =>
  listingCardDiscountPercent(product) > 0 ||
  String(product && (product.listingPricingMode || product.listing_pricing_mode || product.pricingMode || product.pricing_mode || '')).toLowerCase() === 'sale' ||
  Boolean(product && (product.isSale || product.is_sale || product.hasSalePricing || product.has_sale_pricing));

const listingCreatedTime = product => {
  const timestamp = product && product.createdAt ? new Date(product.createdAt).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const sortListingColorCards = (products, sortBy = 'newest') =>
  [...(Array.isArray(products) ? products : [])].sort((left, right) => {
    if (sortBy === 'price-asc') {
      return listingCardPrice(left) - listingCardPrice(right) || listingCreatedTime(right) - listingCreatedTime(left);
    }

    if (sortBy === 'price-desc') {
      return listingCardPrice(right) - listingCardPrice(left) || listingCreatedTime(right) - listingCreatedTime(left);
    }

    if (sortBy === 'discount-desc') {
      return listingCardDiscountPercent(right) - listingCardDiscountPercent(left) || listingCreatedTime(right) - listingCreatedTime(left);
    }

    if (sortBy === 'name') {
      return String(left && left.name || '').localeCompare(String(right && right.name || ''));
    }

    return listingCreatedTime(right) - listingCreatedTime(left);
  });

const listingCategoryKey = product =>
  String(
    product && (
      product.categorySlug ||
      product.category_slug ||
      product.category ||
      product.categoryLabel ||
      product.category_label ||
      product.productGroupSlug ||
      product.product_group_slug ||
      product.productGroup ||
      product.product_group ||
      'other'
    ) || 'other'
  ).trim().toLowerCase();

// Interleave category buckets deterministically while preserving the existing
// ranking inside each category. This prevents one category (or one product's
// color cards) from filling an entire catalog row.
export const mixListingColorCardsByCategory = products => {
  const source = Array.isArray(products) ? products : [];
  const bucketsByKey = new Map();

  source.forEach((product, index) => {
    const key = listingCategoryKey(product);
    const bucket = bucketsByKey.get(key) || { key, firstIndex: index, items: [], cursor: 0 };

    bucket.items.push(product);
    bucketsByKey.set(key, bucket);
  });

  const buckets = [...bucketsByKey.values()];
  if (buckets.length <= 1) return [...source];

  const mixed = [];
  let previousKey = '';

  while (mixed.length < source.length) {
    const available = buckets.filter(bucket => bucket.cursor < bucket.items.length);
    const alternatives = available.filter(bucket => bucket.key !== previousKey);
    const candidates = alternatives.length ? alternatives : available;
    const nextBucket = [...candidates].sort((left, right) =>
      (right.items.length - right.cursor) - (left.items.length - left.cursor) ||
      left.firstIndex - right.firstIndex
    )[0];

    if (!nextBucket) break;

    mixed.push(nextBucket.items[nextBucket.cursor]);
    nextBucket.cursor += 1;
    previousKey = nextBucket.key;
  }

  return mixed;
};

const variantEffectivePricing = (product, color) => {
  const comparePrice = productComparePrice(product);
  const saleCandidates = [
    readPrice(color && (color.salePrice ?? color.sale_price)),
    productSalePrice(product)
  ].filter(price => price !== null && price < comparePrice);
  const effectivePrice = saleCandidates.length ? Math.min(...saleCandidates) : comparePrice;
  const hasDiscount = comparePrice > effectivePrice;

  return {
    comparePrice,
    effectivePrice,
    hasDiscount,
    pricingMode: hasDiscount ? 'sale' : 'regular',
    discountPercent: hasDiscount && comparePrice > 0
      ? Math.ceil(((comparePrice - effectivePrice) / comparePrice) * 100)
      : 0
  };
};

const normalizeProductColors = product => {
  const configuredColors = Array.isArray(product && product.colors) ? product.colors : [];
  const inventoryColors = Array.isArray(product && product.inventoryItems) ? product.inventoryItems : [];
  const sourceColors = configuredColors.length ? configuredColors : inventoryColors;
  const seen = new Set();

  return sourceColors
    .map((color, index) => ({
      ...normalizeColorOption(color),
      source: color,
      index
    }))
    .filter(color => {
      const key = `${color.colorVariantId || ''}|${String(color.name || '').trim().toLowerCase()}`;
      if (!color.name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const colorMatchesFilter = (color, activeColor) => {
  const rawValue = String(activeColor || '').trim();

  if (!rawValue || rawValue.toLowerCase() === 'all') {
    return true;
  }

  const activeValue = colorFamilyValue(activeColor);

  return !activeValue || activeValue === 'all' || color.value === activeValue;
};

const listingColorKey = color =>
  color.colorVariantId ||
  color.productCode ||
  `${color.value}-${color.name}-${color.index}`;

const FAVORITE_KEY_SEPARATOR = ':';

export const listingFavoriteKey = (productId, colorVariantId = '') => {
  const normalizedProductId = String(productId || '').trim();
  const normalizedVariantId = String(colorVariantId || '').trim();

  if (!normalizedProductId) {
    return '';
  }

  return normalizedVariantId
    ? `${normalizedProductId}${FAVORITE_KEY_SEPARATOR}${normalizedVariantId}`
    : normalizedProductId;
};

export const parseListingFavoriteKey = key => {
  const normalizedKey = String(key || '').trim();
  const [productId, colorVariantId = ''] = normalizedKey.split(FAVORITE_KEY_SEPARATOR);

  return {
    productId: String(productId || '').trim(),
    colorVariantId: String(colorVariantId || '').trim()
  };
};

export const listingFavoriteKeyForProduct = product =>
  listingFavoriteKey(
    product && product.id,
    product && (
      product.selectedColorVariantId ||
      product.colorVariantId ||
      product.color_variant_id ||
      ''
    )
  );

export const listingCardSizeValues = product => {
  const inventoryItems = Array.isArray(product && product.inventoryItems)
    ? product.inventoryItems
    : [];
  const selectedVariantId = String(product && (
    product.selectedColorVariantId ||
    product.colorVariantId ||
    product.color_variant_id ||
    ''
  ) || '').trim();
  const selectedColorName = String(product && (
    product.selectedColor ||
    product.colorName ||
    product.color_name ||
    product.color ||
    ''
  ) || '').trim().toLowerCase();
  const matchingInventory = inventoryItems.filter(item => {
    const itemVariantId = String(item && (item.colorVariantId || item.color_variant_id || '') || '').trim();
    const itemColorName = String(item && (item.colorName || item.color_name || '') || '').trim().toLowerCase();

    if (selectedVariantId) return itemVariantId === selectedVariantId;
    if (selectedColorName) return itemColorName === selectedColorName;
    return true;
  });
  const inventorySizes = matchingInventory
    .map(item => String(item && (item.sizeLabel || item.size_label || item.size) || '').trim())
    .filter(Boolean);

  if (inventorySizes.length) return [...new Set(inventorySizes)];

  return [...new Set(
    (Array.isArray(product && product.sizes) ? product.sizes : [])
      .map(size => String(size || '').trim())
      .filter(Boolean)
  )];
};

const listingCardColorValue = product => {
  const firstColor = Array.isArray(product && product.colors) ? product.colors[0] : null;

  return colorFamilyValue(
    product && (
      product.listingColorValue ||
      product.listingColorFamily ||
      product.selectedColor ||
      product.colorName ||
      product.color_name ||
      product.color ||
      product.primaryColor
    ) || firstColor || ''
  );
};

export const mixListingColorCards = products => {
  const colorBuckets = (Array.isArray(products) ? products : []).reduce((buckets, product, index) => {
    const color = listingCardColorValue(product);

    if (!buckets.has(color)) {
      buckets.set(color, []);
    }

    buckets.get(color).push({ product, index });
    return buckets;
  }, new Map());
  const mixed = [];
  let previousColor = '';

  while ([...colorBuckets.values()].some(bucket => bucket.length)) {
    const availableBuckets = [...colorBuckets.entries()].filter(([, bucket]) => bucket.length);
    const differentColorBuckets = availableBuckets.filter(([color]) => color !== previousColor);
    const candidates = differentColorBuckets.length ? differentColorBuckets : availableBuckets;

    candidates.sort((left, right) =>
      right[1].length - left[1].length || left[1][0].index - right[1][0].index
    );

    const [nextColor, nextBucket] = candidates[0];
    const { product: nextProduct } = nextBucket.shift();

    mixed.push(nextProduct);
    previousColor = nextColor;
  }

  return mixed;
};

const imageColorVariantId = image =>
  String(image && (
    image.colorVariantId ||
    image.color_variant_id ||
    image.variantId ||
    image.variant_id ||
    image.colorId ||
    image.color_id ||
    ''
  ) || '').trim();

const imageColorName = image =>
  String(image && (
    image.colorName ||
    image.color_name ||
    image.color ||
    image.variantColor ||
    image.variant_color ||
    ''
  ) || '').trim().toLowerCase();

const imageSortValue = image =>
  Number(image && (
    image.sortOrder ??
    image.sort_order ??
    image.position ??
    999
  )) || 999;

const imagePrimaryValue = image => Number(Boolean(image && (image.isPrimary || image.is_primary)));

const reorderProductImagesForColor = (images, color) => {
  const sourceImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const colorVariantId = String(color && color.colorVariantId || '').trim();
  const colorName = String(color && color.name || '').trim().toLowerCase();

  if (!sourceImages.length || (!colorVariantId && !colorName)) {
    return sourceImages;
  }

  return [...sourceImages].sort((left, right) => {
    const leftVariantMatch = colorVariantId && imageColorVariantId(left) === colorVariantId ? 1 : 0;
    const rightVariantMatch = colorVariantId && imageColorVariantId(right) === colorVariantId ? 1 : 0;
    const leftColorMatch = colorName && imageColorName(left) === colorName ? 1 : 0;
    const rightColorMatch = colorName && imageColorName(right) === colorName ? 1 : 0;

    return (
      rightVariantMatch - leftVariantMatch ||
      rightColorMatch - leftColorMatch ||
      imagePrimaryValue(right) - imagePrimaryValue(left) ||
      imageSortValue(left) - imageSortValue(right)
    );
  });
};

const primaryImageUrl = image =>
  String((typeof image === 'string' ? image : '') || image && (
    image.url ||
    image.imageUrl ||
    image.image_url ||
    image.src ||
    ''
  ) || '').trim();

const colorSoldCount = (product, color) => {
  const source = color && color.source ? color.source : color;
  const value = Number(source && (
    source.soldQuantity ??
    source.sold_quantity ??
    source.soldCount ??
    source.sold_count ??
    (product && (product.soldCount ?? product.sold_count)) ??
    0
  ));

  return Number.isFinite(value) && value >= 0 ? value : 0;
};

export const expandProductsToColorCards = (products, options = {}) => {
  const activeColor = options.activeColor || 'All';
  const singleCardPerProduct = Boolean(options.singleCardPerProduct);
  const minPrice = Number.isFinite(Number(options.priceMin)) ? Number(options.priceMin) : Number.NEGATIVE_INFINITY;
  const maxPrice = Number.isFinite(Number(options.priceMax)) ? Number(options.priceMax) : Number.POSITIVE_INFINITY;

  return (Array.isArray(products) ? products : []).flatMap(product => {
    const colors = normalizeProductColors(product);

    if (!colors.length) {
      const fallbackPrice = readPrice(product && (product.listingPrice ?? product.listing_price ?? product.price)) ?? 0;
      return fallbackPrice >= minPrice && fallbackPrice <= maxPrice
        ? [{
            ...product,
            listingKey: String(product && (product.id || product.slug || product.name || 'product')),
            favoriteKey: listingFavoriteKey(product && product.id),
            favorite_key: listingFavoriteKey(product && product.id)
          }]
        : [];
    }

    const searchMatch = product && product.searchMatch || {};
    const matchedVariantId = String(searchMatch.matchedColorVariantId || '').trim();
    const matchedColorName = String(searchMatch.matchedColor || '').trim().toLowerCase();
    const filteredColors = colors.filter(color => colorMatchesFilter(color, activeColor));
    const exactMatchedColors = filteredColors.filter(color =>
      (matchedVariantId && String(color.colorVariantId || '').trim() === matchedVariantId) ||
      (matchedColorName && String(color.name || '').trim().toLowerCase() === matchedColorName)
    );
    const preferredColors = exactMatchedColors.length ? exactMatchedColors : filteredColors;
    const listingColors = singleCardPerProduct ? preferredColors.slice(0, 1) : preferredColors;

    return listingColors
      .map(color => {
        const pricing = variantEffectivePricing(product, color);
        const reorderedColors = [
          color,
          ...colors.filter(item => listingColorKey(item) !== listingColorKey(color))
        ].map(item => item.source || item);
        const reorderedImages = reorderProductImagesForColor(
          product && (product.productImages || product.product_images || product.images),
          color
        );
        const selectedImageUrl = primaryImageUrl(reorderedImages[0]);
        const favoriteKey = listingFavoriteKey(product && product.id, color.colorVariantId);

        return {
          ...product,
          colors: reorderedColors,
          productImages: reorderedImages,
          product_images: reorderedImages,
          images: reorderedImages,
          imageUrl: selectedImageUrl || product.imageUrl || product.image_url || product.image,
          image_url: selectedImageUrl || product.image_url || product.imageUrl || product.image,
          image: selectedImageUrl || product.image || product.imageUrl || product.image_url,
          listingKey: `${product.id || product.slug || product.name}-${listingColorKey(color)}`,
          favoriteKey,
          favorite_key: favoriteKey,
          isColorCatalogCard: true,
          is_color_catalog_card: true,
          listingColorFamily: color.family,
          listingColorValue: color.value,
          selectedColor: color.name,
          selectedColorVariantId: color.colorVariantId,
          color: color.name,
          colorName: color.name,
          color_name: color.name,
          colorVariantId: color.colorVariantId,
          color_variant_id: color.colorVariantId,
          primaryColor: color.name,
          productCode: color.productCode || product.productCode || product.product_code,
          product_code: color.productCode || product.product_code,
          listingPrice: pricing.effectivePrice,
          listing_price: pricing.effectivePrice,
          listingComparePrice: pricing.comparePrice,
          listing_compare_price: pricing.comparePrice,
          listingPricingMode: pricing.pricingMode,
          listing_pricing_mode: pricing.pricingMode,
          pricingMode: pricing.pricingMode,
          pricing_mode: pricing.pricingMode,
          pricePrefix: '',
          price_prefix: '',
          priceVaries: false,
          price_varies: false,
          isSale: pricing.hasDiscount,
          is_sale: pricing.hasDiscount,
          hasSalePricing: pricing.hasDiscount,
          has_sale_pricing: pricing.hasDiscount,
          saleDiscountPercent: pricing.discountPercent,
          sale_discount_percent: pricing.discountPercent,
          soldCount: colorSoldCount(product, color),
          sold_count: colorSoldCount(product, color)
        };
      })
      .filter(productCard => {
        const price = readPrice(productCard.listingPrice ?? productCard.listing_price) ?? 0;
        return price >= minPrice && price <= maxPrice;
      });
  });
};
