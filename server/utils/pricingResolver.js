const PRICING_MODES = new Set(['regular', 'sale']);

const toNumber = value => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : null;
};

const readValue = (source, keys) => {
  if (!source || typeof source !== 'object') {
    return undefined;
  }

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key];
    }
  }

  return undefined;
};

const readMoney = (source, keys) => toNumber(readValue(source, keys));

const normalizePricingMode = value => {
  const mode = String(value || '').trim().toLowerCase();
  return PRICING_MODES.has(mode) ? mode : 'regular';
};

const resolveBasePrice = product => {
  const originalPrice = readMoney(product, ['originalPrice', 'original_price']);
  const legacyPrice = readMoney(product, ['price', 'productPrice', 'product_price']);

  return originalPrice !== null && originalPrice > 0
    ? originalPrice
    : legacyPrice !== null
      ? legacyPrice
      : 0;
};

const resolveProductPricing = (product = {}, colorVariant = {}) => {
  const comparePrice = resolveBasePrice(product);
  const productSalePrice = readMoney(product, ['salePrice', 'sale_price']);
  const variantSalePrice = readMoney(colorVariant, ['salePrice', 'sale_price']);
  const candidates = [
    { effectivePrice: comparePrice, pricingMode: 'regular', priceSource: 'product', priority: 4 }
  ];

  if (variantSalePrice !== null) {
    candidates.push({ effectivePrice: variantSalePrice, pricingMode: 'sale', priceSource: 'variant', priority: 2 });
  }

  if (productSalePrice !== null) {
    candidates.push({ effectivePrice: productSalePrice, pricingMode: 'sale', priceSource: 'product', priority: 3 });
  }

  const selected = [...candidates].sort((left, right) =>
    (left.effectivePrice - right.effectivePrice) ||
    (left.priority - right.priority)
  )[0];

  return {
    effectivePrice: selected.effectivePrice,
    comparePrice,
    pricingMode: selected.pricingMode,
    priceSource: selected.priceSource,
    hasDiscount: comparePrice > selected.effectivePrice
  };
};

const resolveListingPricing = (product = {}, colorVariants = []) => {
  const variants = Array.isArray(colorVariants) ? colorVariants.filter(Boolean) : [];
  const candidates = (variants.length ? variants : [null]).map(variant =>
    resolveProductPricing(product, variant || {})
  );
  const sortedCandidates = [...candidates].sort((left, right) =>
    (left.effectivePrice - right.effectivePrice) ||
    (left.pricingMode === 'sale' ? -1 : right.pricingMode === 'sale' ? 1 : 0)
  );
  const selected = sortedCandidates[0] || resolveProductPricing(product, {});
  const distinctPrices = new Set(candidates.map(candidate => Number(candidate.effectivePrice).toFixed(2)));
  const hasSalePricing =
    readMoney(product, ['salePrice', 'sale_price']) !== null ||
    variants.some(variant => readMoney(variant, ['salePrice', 'sale_price']) !== null);

  return {
    ...selected,
    priceVaries: distinctPrices.size > 1,
    pricePrefix: distinctPrices.size > 1 ? 'From' : '',
    hasSalePricing,
    hasVariantSalePricing: variants.some(variant => readMoney(variant, ['salePrice', 'sale_price']) !== null)
  };
};

const productBasePriceSql = (productAlias = 'p') =>
  `COALESCE(NULLIF(${productAlias}.original_price, 0), ${productAlias}.price, 0)`;

const validPriceSql = expression => `(${expression} IS NOT NULL AND ${expression} >= 0)`;

const productSaleExistsSql = (productAlias = 'p') => validPriceSql(`${productAlias}.sale_price`);

const variantSaleExistsSql = (productAlias = 'p', variantTable = 'product_color_variants') => `
  EXISTS (
    SELECT 1
    FROM ${variantTable} pricing_variant_sale
    WHERE pricing_variant_sale.product_id = ${productAlias}.id
      AND pricing_variant_sale.deleted_at IS NULL
      AND ${validPriceSql('pricing_variant_sale.sale_price')}
  )
`;

const selectedPricingSql = ({ productAlias = 'p', variantAlias = 'pcv' } = {}) => {
  const basePrice = productBasePriceSql(productAlias);
  const variantSale = `${variantAlias}.sale_price`;
  const productSale = `${productAlias}.sale_price`;
  const candidateRows = [
    `SELECT ${variantSale}::numeric AS price, 'sale'::text AS pricing_mode, 'variant'::text AS price_source, 2 AS priority WHERE ${validPriceSql(variantSale)}`,
    `SELECT ${productSale}::numeric AS price, 'sale'::text AS pricing_mode, 'product'::text AS price_source, 3 AS priority WHERE ${validPriceSql(productSale)}`,
    `SELECT (${basePrice})::numeric AS price, 'regular'::text AS pricing_mode, 'product'::text AS price_source, 4 AS priority`
  ];
  const selectedCandidateSql = column => `
    SELECT selected_price.${column}
    FROM (
      ${candidateRows.join('\n      UNION ALL\n      ')}
    ) selected_price
    ORDER BY selected_price.price ASC, selected_price.priority ASC
    LIMIT 1
  `;

  return {
    effectivePrice: `(${selectedCandidateSql('price')})`,
    comparePrice: `(${basePrice})`,
    pricingMode: `(${selectedCandidateSql('pricing_mode')})`,
    priceSource: `(${selectedCandidateSql('price_source')})`
  };
};

const listingPriceSql = (productAlias = 'p', variantTable = 'product_color_variants') => {
  const basePrice = productBasePriceSql(productAlias);
  const lowestPriceSql = prices => `
    COALESCE((
      SELECT MIN(price_option.price)
      FROM (
        ${prices.map(price => `SELECT (${price})::numeric AS price WHERE ${validPriceSql(price)}`).join('\n        UNION ALL\n        ')}
        UNION ALL
        SELECT (${basePrice})::numeric AS price
      ) price_option
    ), ${basePrice})
  `;
  const productFallback = lowestPriceSql([
    `${productAlias}.sale_price`
  ]);
  const variantFallback = lowestPriceSql([
    'pricing_variant.sale_price',
    `${productAlias}.sale_price`
  ]);

  return `
    COALESCE((
      SELECT MIN(price_candidate.effective_price)
      FROM (
        SELECT (${productFallback}) AS effective_price
        UNION ALL
        SELECT (${variantFallback}) AS effective_price
        FROM ${variantTable} pricing_variant
        WHERE pricing_variant.product_id = ${productAlias}.id
          AND pricing_variant.deleted_at IS NULL
      ) price_candidate
    ), ${basePrice})
  `;
};

const salePricingExistsSql = (productAlias = 'p', variantTable = 'product_color_variants') => `
  (${productSaleExistsSql(productAlias)} OR ${variantSaleExistsSql(productAlias, variantTable)})
`;

module.exports = {
  listingPriceSql,
  normalizePricingMode,
  productBasePriceSql,
  resolveListingPricing,
  resolveProductPricing,
  salePricingExistsSql,
  selectedPricingSql
};
