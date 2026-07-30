const STOP_TOKENS = new Set(['a', 'an', 'and', 'for', 'in', 'of', 'the', 'to', 'with']);

const SAFE_TOKEN_ALIASES = new Map([
  ['dresses', 'dress'],
  ['shirts', 'shirt'],
  ['skirts', 'skirt'],
  ['shorts', 'short'],
  ['trousers', 'trouser'],
  ['pants', 'trouser'],
  ['jeans', 'jean'],
  ['shoes', 'shoe'],
  ['boots', 'boot'],
  ['sandals', 'sandal'],
  ['loafers', 'loafer'],
  ['mules', 'mule'],
  ['heels', 'heel'],
  ['bags', 'bag'],
  ['wallets', 'wallet'],
  ['hoodies', 'hoodie'],
  ['sweatshirts', 'sweatshirt'],
  ['blazers', 'blazer'],
  ['jackets', 'jacket'],
  ['coats', 'coat'],
  ['polos', 'polo'],
  ['tees', 'tshirt'],
  ['tee', 'tshirt'],
  ['women', 'women'],
  ['woman', 'women'],
  ['female', 'women'],
  ['men', 'men'],
  ['man', 'men'],
  ['male', 'men'],
  ['grey', 'gray']
]);

const PHRASE_ALIASES = [
  [/(?:t[\s-]?shirts?|tee shirts?)/g, 'tshirt'],
  [/navy blue/g, 'navy'],
  [/off[\s-]?white/g, 'off white']
];

const PRODUCT_TYPE_ALIASES = {
  'dress shoe': ['dress shoe', 'formal shoe'],
  'high heel': ['high heel', 'kitten heel'],
  'ballet flat': ['ballet flat'],
  loafer: ['loafer'],
  boot: ['boot'],
  sandal: ['sandal'],
  mule: ['mule'],
  sneaker: ['sneaker', 'trainer'],
  shoe: ['shoe', 'footwear'],
  dress: ['dress', 'gown', 'mini dress', 'midi dress', 'maxi dress', 'evening dress', 'shirt dress'],
  trouser: ['trouser', 'dress trouser', 'wide leg trouser'],
  jean: ['jean', 'denim jean'],
  shirt: ['shirt', 'dress shirt', 'button shirt', 'button down shirt', 'blouse'],
  tshirt: ['tshirt', 'tee shirt'],
  polo: ['polo', 'polo shirt'],
  hoodie: ['hoodie'],
  sweatshirt: ['sweatshirt', 'sweat'],
  blazer: ['blazer'],
  jacket: ['jacket'],
  coat: ['coat'],
  skirt: ['skirt'],
  short: ['short'],
  bag: ['bag', 'handbag', 'hand bag', 'clutch', 'purse'],
  wallet: ['wallet'],
  'hair accessory': ['hair accessory', 'hair clip', 'scrunchie'],
  jewelry: ['jewelry', 'jewellery', 'earring', 'necklace', 'bracelet', 'ring']
};

const COLOR_ALIASES = {
  gray: ['grey'],
  navy: ['navy blue']
};

const FIELD_PRIORITY = [
  'productTypes',
  'colors',
  'departments',
  'materials',
  'fits',
  'sizes',
  'productGroups',
  'collections',
  'styles',
  'necklines',
  'sleeves',
  'waists',
  'lengths',
  'heelHeights'
];

export const PRODUCT_SEARCH_SCORES = Object.freeze({
  exactCode: 400,
  exactName: 350,
  nameStartsWithQuery: 260,
  nameContainsQuery: 220,
  productType: 140,
  color: 130,
  category: 110,
  productGroup: 90,
  department: 80,
  collection: 70,
  style: 65,
  fit: 65,
  material: 55,
  size: 45,
  otherAttribute: 35,
  freeTokenInName: 30,
  freeTokenInStructuredField: 16,
  freeTokenInDescription: 5
});

const arrayValue = value => (Array.isArray(value) ? value : value === null || value === undefined ? [] : [value]);

const compactUnique = values => [...new Set(arrayValue(values).map(value => String(value || '').trim()).filter(Boolean))];

const baseNormalize = value => {
  let normalized = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[‐‑‒–—−_-]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  PHRASE_ALIASES.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });

  return normalized
    .split(' ')
    .filter(Boolean)
    .map(token => SAFE_TOKEN_ALIASES.get(token) || token)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const normalizeProductSearchValue = value => baseNormalize(value);

export const normalizeProductCode = value => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/\s+/g, ' ');

const tokenList = value => normalizeProductSearchValue(value).split(' ').filter(Boolean);

const phraseOccursAt = (tokens, phraseTokens, start) =>
  phraseTokens.every((token, offset) => tokens[start + offset] === token);

const phraseInValue = (value, phrase) => {
  const valueTokens = tokenList(value);
  const phraseTokens = tokenList(phrase);

  if (!phraseTokens.length || phraseTokens.length > valueTokens.length) return false;

  return valueTokens.some((_, index) =>
    index <= valueTokens.length - phraseTokens.length && phraseOccursAt(valueTokens, phraseTokens, index)
  );
};

const normalizedSet = values => new Set(compactUnique(values).map(normalizeProductSearchValue).filter(Boolean));

const codeValuesForColor = color => compactUnique([
  color && (color.productCode || color.product_code),
  color && (color.articleNumber || color.article_number),
  color && (color.sku || color.variantCode || color.variant_code)
]);

const colorName = color => String(color && (color.name || color.colorName || color.color_name || color.color) || '').trim();

const colorVariantId = color => String(color && (
  color.colorVariantId || color.color_variant_id || color.variantId || color.variant_id || color.id || ''
) || '').trim();

const productColors = product => {
  const colors = arrayValue(product && product.colors).filter(Boolean).map(color => ({
    source: color,
    name: colorName(color),
    normalizedName: normalizeProductSearchValue(colorName(color)),
    variantId: colorVariantId(color),
    codes: codeValuesForColor(color)
  }));
  const seen = new Set(colors.map(color => `${color.variantId}|${color.normalizedName}`));

  arrayValue(product && product.inventoryItems).filter(Boolean).forEach(item => {
    const name = colorName(item);
    const normalizedName = normalizeProductSearchValue(name);
    const variantId = colorVariantId(item);
    const key = `${variantId}|${normalizedName}`;

    if ((variantId || normalizedName) && !seen.has(key)) {
      seen.add(key);
      colors.push({
        source: item,
        name,
        normalizedName,
        variantId,
        codes: codeValuesForColor(item)
      });
    }
  });

  return colors.filter(color => color.name || color.variantId || color.codes.length);
};

const productCodes = product => compactUnique([
  product && (product.productCode || product.product_code),
  product && (product.articleNumber || product.article_number),
  product && (product.sku || product.variantCode || product.variant_code),
  ...productColors(product).flatMap(color => color.codes),
  ...arrayValue(product && product.inventoryItems).flatMap(codeValuesForColor)
]).map(normalizeProductCode).filter(Boolean);

const canonicalProductTypes = values => {
  const types = normalizedSet(values);

  [...types].forEach(value => {
    Object.entries(PRODUCT_TYPE_ALIASES).forEach(([canonical, aliases]) => {
      const normalizedCanonical = normalizeProductSearchValue(canonical);
      const normalizedAliases = aliases.map(normalizeProductSearchValue);
      const isDressException = normalizedCanonical === 'dress' &&
        ['dress shoe', 'dress shirt', 'dress trouser'].some(exception => phraseInValue(value, exception));

      if (!isDressException && normalizedAliases.some(alias => phraseInValue(value, alias))) {
        types.add(normalizedCanonical);
      }
    });
  });

  return types;
};

const inventoryAvailableQuantity = item => {
  const explicitAvailable = Number(item && (item.availableQuantity ?? item.available_quantity));
  if (Number.isFinite(explicitAvailable)) return Math.max(0, explicitAvailable);

  const stock = Number(item && (item.stockQuantity ?? item.stock_quantity ?? item.stock));
  const reserved = Number(item && (item.reservedQuantity ?? item.reserved_quantity ?? 0));
  return Number.isFinite(stock) ? Math.max(0, stock - (Number.isFinite(reserved) ? reserved : 0)) : 0;
};

const inventoryForColor = (product, color) => {
  const targetVariantId = String(color && color.variantId || '').trim();
  const targetName = normalizeProductSearchValue(color && color.name);

  return arrayValue(product && product.inventoryItems).filter(item => {
    const itemVariantId = colorVariantId(item);
    const itemName = normalizeProductSearchValue(colorName(item));
    return (targetVariantId && itemVariantId === targetVariantId) || (targetName && itemName === targetName);
  });
};

const productHasStock = product => {
  const inventory = arrayValue(product && product.inventoryItems);
  if (inventory.length) return inventory.some(item => inventoryAvailableQuantity(item) > 0);

  const stock = Number(product && (product.inventory ?? product.stockQuantity ?? product.stock_quantity ?? product.stock));
  return Number.isFinite(stock) && stock > 0;
};

const imageVariantId = image => String(image && (
  image.colorVariantId || image.color_variant_id || image.variantId || image.variant_id || ''
) || '').trim();

const imageColor = image => normalizeProductSearchValue(image && (
  image.colorName || image.color_name || image.color || ''
));

const matchedImageForColor = (product, color) => {
  if (!color) return null;
  const images = arrayValue(product && (product.productImages || product.product_images || product.images)).filter(Boolean);
  const variantMatch = color.variantId && images.find(image => imageVariantId(image) === color.variantId);
  return variantMatch || images.find(image => color.normalizedName && imageColor(image) === color.normalizedName) || null;
};

const buildProductSearchDocument = (product, index) => {
  const categoryValues = compactUnique([
    product && product.category,
    product && product.categoryLabel,
    product && product.categorySlug
  ]);
  const colors = productColors(product);
  const materials = compactUnique([
    ...arrayValue(product && product.materialFilterValues),
    ...arrayValue(product && product.materials).flatMap(material =>
      typeof material === 'object'
        ? [material.name, material.label, material.materialName, material.material_name]
        : [material]
    )
  ]);
  const fields = {
    productTypes: canonicalProductTypes(categoryValues),
    categories: normalizedSet(categoryValues),
    productGroups: normalizedSet([
      product && product.productGroup,
      product && product.productGroupLabel,
      product && product.productGroupSlug
    ]),
    colors: new Set(colors.map(color => color.normalizedName).filter(Boolean)),
    departments: normalizedSet([product && product.gender, product && product.department, product && product.departmentName]),
    materials: normalizedSet(materials),
    styles: normalizedSet([product && product.styleName, product && product.styleSlug, product && product.style]),
    fits: normalizedSet([product && product.fit, product && product.fitName, product && product.fitSlug]),
    sizes: normalizedSet(product && product.sizes),
    collections: normalizedSet([
      product && product.collection,
      product && product.collectionLabel,
      product && product.collectionSlug
    ]),
    necklines: normalizedSet([product && product.neckline, product && product.collar]),
    sleeves: normalizedSet([product && (product.sleeveLength || product.sleeve_length)]),
    waists: normalizedSet([product && (product.waistRise || product.waist_rise)]),
    lengths: normalizedSet([product && (product.garmentLength || product.garment_length || product.length)]),
    heelHeights: normalizedSet([product && (product.heelHeight || product.heel_height)])
  };

  return {
    product,
    index,
    name: normalizeProductSearchValue(product && product.name),
    slug: normalizeProductSearchValue(product && product.slug),
    description: normalizeProductSearchValue(product && product.description),
    fields,
    colors,
    codes: productCodes(product),
    soldCount: Math.max(0, Number(product && (product.soldCount ?? product.sold_count) || 0)),
    hasStock: productHasStock(product)
  };
};

const dictionaryForDocuments = documents => {
  const dictionaries = Object.fromEntries(FIELD_PRIORITY.map(field => [field, new Map()]));

  documents.forEach(document => {
    FIELD_PRIORITY.forEach(field => {
      document.fields[field].forEach(value => dictionaries[field].set(value, value));
    });
  });

  const availableTypes = new Set(dictionaries.productTypes.values());
  Object.entries(PRODUCT_TYPE_ALIASES).forEach(([canonical, aliases]) => {
    const normalizedCanonical = normalizeProductSearchValue(canonical);
    if (!availableTypes.has(normalizedCanonical)) return;
    [canonical, ...aliases].forEach(alias => dictionaries.productTypes.set(normalizeProductSearchValue(alias), normalizedCanonical));
  });

  const availableColors = new Set(dictionaries.colors.values());
  Object.entries(COLOR_ALIASES).forEach(([canonical, aliases]) => {
    const normalizedCanonical = normalizeProductSearchValue(canonical);
    if (!availableColors.has(normalizedCanonical)) return;
    aliases.forEach(alias => dictionaries.colors.set(normalizeProductSearchValue(alias), normalizedCanonical));
  });

  return dictionaries;
};

export const createProductSearchIndex = products => {
  const documents = arrayValue(products).filter(product => product && (product.id || product.slug || product.name))
    .map(buildProductSearchDocument);
  const codeDocuments = new Map();

  documents.forEach(document => {
    document.codes.forEach(code => {
      const matches = codeDocuments.get(code) || [];
      matches.push(document);
      codeDocuments.set(code, matches);
    });
  });

  return {
    documents,
    dictionaries: dictionaryForDocuments(documents),
    codeDocuments
  };
};

let cachedProductSearchIndex = null;
let cachedProductSearchSignature = '';

const productSearchSignature = products => arrayValue(products)
  .map(product => [
    product && (product.id || product.slug || product.name),
    product && (product.updatedAt || product.updated_at || ''),
    arrayValue(product && product.colors).length,
    arrayValue(product && product.inventoryItems).length
  ].join(':'))
  .join('|');

export const getCachedProductSearchIndex = products => {
  const signature = productSearchSignature(products);

  if (!cachedProductSearchIndex || signature !== cachedProductSearchSignature) {
    cachedProductSearchSignature = signature;
    cachedProductSearchIndex = createProductSearchIndex(products);
  }

  return cachedProductSearchIndex;
};

const addDetectedValue = (detected, field, value) => {
  if (!detected[field].includes(value)) detected[field].push(value);
};

export const parseProductSearchQuery = (query, index) => {
  const normalizedQuery = normalizeProductSearchValue(query);
  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const detected = Object.fromEntries(FIELD_PRIORITY.map(field => [field, []]));
  const candidates = [];

  FIELD_PRIORITY.forEach((field, priority) => {
    const dictionary = index && index.dictionaries && index.dictionaries[field] || new Map();

    dictionary.forEach((canonical, phrase) => {
      const phraseTokens = tokenList(phrase);
      if (!phraseTokens.length || phraseTokens.length > tokens.length) return;

      tokens.forEach((_, start) => {
        if (start <= tokens.length - phraseTokens.length && phraseOccursAt(tokens, phraseTokens, start)) {
          candidates.push({ field, canonical, start, length: phraseTokens.length, priority });
        }
      });
    });
  });

  candidates.sort((left, right) =>
    right.length - left.length || left.start - right.start || left.priority - right.priority
  );

  const consumed = new Set();
  candidates.forEach(candidate => {
    const positions = Array.from({ length: candidate.length }, (_, offset) => candidate.start + offset);
    if (positions.some(position => consumed.has(position))) return;
    positions.forEach(position => consumed.add(position));
    addDetectedValue(detected, candidate.field, candidate.canonical);
  });

  const freeTextTokens = tokens.filter((token, position) => !consumed.has(position) && !STOP_TOKENS.has(token));

  return {
    originalQuery: String(query || '').trim(),
    normalizedQuery,
    detected,
    freeTextTokens
  };
};

const setHasAny = (values, required) => !required.length || required.some(value => values.has(value));

const matchesRequiredAttributes = (document, parsed) => FIELD_PRIORITY.every(field =>
  setHasAny(document.fields[field], parsed.detected[field])
);

const fieldContainsToken = (values, token) => [...values].some(value => phraseInValue(value, token));

const matchColor = (document, parsed, exactCode = '') => {
  if (exactCode) {
    const byCode = document.colors.find(color => color.codes.map(normalizeProductCode).includes(exactCode));
    if (byCode) return byCode;
  }

  const requestedColors = parsed.detected.colors;
  if (!requestedColors.length) return null;

  return requestedColors
    .map(requested => document.colors.find(color => color.normalizedName === requested))
    .find(Boolean) || null;
};

const scoreStructuredMatches = parsed => {
  const detected = parsed.detected;
  return (
    detected.productTypes.length * PRODUCT_SEARCH_SCORES.productType +
    detected.colors.length * PRODUCT_SEARCH_SCORES.color +
    detected.productGroups.length * PRODUCT_SEARCH_SCORES.productGroup +
    detected.departments.length * PRODUCT_SEARCH_SCORES.department +
    detected.collections.length * PRODUCT_SEARCH_SCORES.collection +
    detected.styles.length * PRODUCT_SEARCH_SCORES.style +
    detected.fits.length * PRODUCT_SEARCH_SCORES.fit +
    detected.materials.length * PRODUCT_SEARCH_SCORES.material +
    detected.sizes.length * PRODUCT_SEARCH_SCORES.size +
    (detected.necklines.length + detected.sleeves.length + detected.waists.length + detected.lengths.length + detected.heelHeights.length) *
      PRODUCT_SEARCH_SCORES.otherAttribute
  );
};

const scoreFreeText = (document, tokens) => tokens.reduce((score, token) => {
  if (phraseInValue(document.name, token)) return score;

  const structuredMatch = Object.values(document.fields).some(values => fieldContainsToken(values, token));
  if (structuredMatch) return score + PRODUCT_SEARCH_SCORES.freeTokenInStructuredField;
  if (phraseInValue(document.description, token)) return score + PRODUCT_SEARCH_SCORES.freeTokenInDescription;
  return score;
}, 0);

const calculateScore = (document, parsed, exactCode = '') => {
  const query = parsed.normalizedQuery;
  let score = scoreStructuredMatches(parsed) + scoreFreeText(document, parsed.freeTextTokens);
  let exactName = false;

  score += [...new Set(tokenList(query).filter(token => !STOP_TOKENS.has(token)))]
    .filter(token => phraseInValue(document.name, token))
    .length * PRODUCT_SEARCH_SCORES.freeTokenInName;

  if (exactCode) score += PRODUCT_SEARCH_SCORES.exactCode;

  if (query && document.name === query) {
    exactName = true;
    score += PRODUCT_SEARCH_SCORES.exactName;
  } else if (query && document.name.startsWith(query)) {
    score += PRODUCT_SEARCH_SCORES.nameStartsWithQuery;
  } else if (query && phraseInValue(document.name, query)) {
    score += PRODUCT_SEARCH_SCORES.nameContainsQuery;
  }

  return { score, exactName };
};

const matchedFieldsFor = parsed => FIELD_PRIORITY.filter(field => parsed.detected[field].length);

const decorateResultProduct = (document, result) => ({
  ...document.product,
  searchMatch: {
    query: result.parsed.normalizedQuery,
    score: result.score,
    matchedFields: result.matchedFields,
    matchedColor: result.matchedColor,
    matchedColorVariantId: result.matchedColorVariantId,
    matchedColorInStock: result.matchedColorInStock,
    exactCode: result.exactCode
  }
});

const resultComparator = (left, right) =>
  Number(Boolean(right.exactCode)) - Number(Boolean(left.exactCode)) ||
  right.score - left.score ||
  Number(right.matchedColorInStock) - Number(left.matchedColorInStock) ||
  Number(right.hasStock) - Number(left.hasStock) ||
  Number(right.exactName) - Number(left.exactName) ||
  right.soldCount - left.soldCount ||
  String(left.product && left.product.name || '').localeCompare(String(right.product && right.product.name || '')) ||
  left.index - right.index;

export const searchProductIndex = (index, query, options = {}) => {
  const normalizedCode = normalizeProductCode(query);
  const parsed = parseProductSearchQuery(query, index);
  const hasStructuredAttributes = FIELD_PRIORITY.some(field => parsed.detected[field].length);
  const documents = index && Array.isArray(index.documents) ? index.documents : [];
  const exactCodeDocuments = normalizedCode && index && index.codeDocuments
    ? index.codeDocuments.get(normalizedCode) || []
    : normalizedCode
      ? documents.filter(document => document.codes.includes(normalizedCode))
      : [];
  const sourceDocuments = exactCodeDocuments.length ? exactCodeDocuments : documents;
  const limit = Number.isFinite(Number(options.limit)) ? Math.max(0, Number(options.limit)) : Number.POSITIVE_INFINITY;

  if (!parsed.normalizedQuery || limit === 0) return [];

  const matchedFields = matchedFieldsFor(parsed);

  return sourceDocuments
    .filter(document => exactCodeDocuments.length || matchesRequiredAttributes(document, parsed))
    .map(document => {
      const exactCode = exactCodeDocuments.length && document.codes.includes(normalizedCode) ? normalizedCode : '';
      const { score, exactName } = calculateScore(document, parsed, exactCode);
      const matchedColorRecord = matchColor(document, parsed, exactCode);
      const matchedInventory = matchedColorRecord ? inventoryForColor(document.product, matchedColorRecord) : [];
      const matchedColorInStock = matchedColorRecord
        ? matchedInventory.some(item => inventoryAvailableQuantity(item) > 0)
        : false;
      return {
        product: document.product,
        document,
        index: document.index,
        parsed,
        score,
        exactName,
        exactCode,
        hasStock: document.hasStock,
        soldCount: document.soldCount,
        matchedFields,
        matchedColor: matchedColorRecord ? matchedColorRecord.name : '',
        matchedColorVariantId: matchedColorRecord ? matchedColorRecord.variantId : '',
        matchedColorInStock,
        matchedVariant: matchedColorRecord ? matchedColorRecord.source : null
      };
    })
    .filter(result => exactCodeDocuments.length || hasStructuredAttributes || result.score > 0)
    .sort(resultComparator)
    .slice(0, limit)
    .map(result => {
      const matchedColorRecord = result.matchedVariant
        ? {
            source: result.matchedVariant,
            variantId: result.matchedColorVariantId,
            normalizedName: normalizeProductSearchValue(result.matchedColor)
          }
        : null;
      result.matchedImage = matchedImageForColor(result.product, matchedColorRecord);
      result.product = decorateResultProduct(result.document, result);
      delete result.document;
      return result;
    });
};

export const searchProducts = (products, query, options = {}) =>
  searchProductIndex(createProductSearchIndex(products), query, options);
