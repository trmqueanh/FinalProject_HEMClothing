// Product model helpers:
// buildProductPayload normalizes admin create/edit input, serializeProduct shapes database rows for the storefront.
const { colorFamilyValue, normalizeColorFamily } = require('../utils/colorFamilies');
const { resolveListingPricing } = require('../utils/pricingResolver');
const { PRODUCT_STATUS } = require('../constants/domainConstants');

const CATEGORY_TABLE = 'categories';
const COLLECTION_TABLE = 'collections';
const COLLECTION_DEPARTMENT_TABLE = 'collection_departments';
const DEPARTMENT_TABLE = 'departments';
const FIT_TABLE = 'fits';
const MATERIAL_TABLE = 'materials';
const ORDER_ITEM_TABLE = 'order_items';
const ORDER_TABLE = 'orders';
const PRODUCT_COLOR_VARIANT_TABLE = 'product_color_variants';
const PRODUCT_IMAGE_TABLE = 'product_images';
const PRODUCT_INVENTORY_TABLE = 'product_inventory';
const PRODUCT_GROUP_TABLE = 'product_groups';
const PRODUCT_TABLE = 'products';
const STYLE_TABLE = 'styles';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_CATEGORY = 'Uncategorized';
const DEFAULT_PRODUCT_GROUP = 'clothing';
const DEFAULT_STYLE = '';
const HEEL_HEIGHT_OPTIONS = new Set(['High heel', 'Mid heel', 'Low heel', 'No heel']);
const DEFAULT_SIZES = ['S', 'M', 'L'];
const DEFAULT_COLORS = [
  { name: 'Default', hex: '#efe8df', family: 'Multi', colorFamily: 'Multi', color_family: 'Multi', value: 'multi' }
];
const DEFAULT_PALETTE = {
  base: '#efe8df',
  accent: '#1f2430',
  glow: '#faf5ef'
};
const DEFAULT_GENDER = 'women';
const DEFAULT_STATUS = PRODUCT_STATUS.ACTIVE;
const DEFAULT_PRIMARY_COLOR = 'Default';
const NEW_ARRIVAL_WINDOW_DAYS = 60;
const DEFAULT_MATERIAL_INFORMATION_TITLE = 'ADDITIONAL MATERIAL INFORMATION';
const MATERIAL_PART_NAMES = ['Main', 'Shell', 'Lining', 'Upper', 'Sole', 'Trim', 'Coating', 'Base fabric', 'Frame', 'Temple', 'Lens'];
const MATERIAL_PART_NAME_SET = new Set(MATERIAL_PART_NAMES);
const PANTS_CATEGORY_KEYWORDS = ['pants', 'trousers', 'jeans', 'shorts', 'bottoms', 'leggings', 'joggers', 'skirt', 'skirts'];
const isPantsCategoryValue = value => {
  const normalized = String(value || '').trim().toLowerCase();
  return PANTS_CATEGORY_KEYWORDS.some(keyword => normalized.includes(keyword));
};
const COLOR_HEX_BY_NAME = {
  black: '#111111',
  ink: '#1f2430',
  charcoal: '#3f3f3f',
  graphite: '#4a4a4a',
  white: '#f8f6f0',
  'off white': '#f1eee6',
  ivory: '#efe8df',
  cream: '#f3ead8',
  ecru: '#e9dfcf',
  natural: '#dfd2bf',
  stone: '#c8c0b2',
  sand: '#d2bfa5',
  beige: '#cdbb9f',
  oat: '#d7c7b4',
  taupe: '#9b8978',
  khaki: '#8f8460',
  tan: '#b98b62',
  camel: '#b58a5a',
  brown: '#6f4d36',
  espresso: '#40322d',
  chocolate: '#4b3025',
  grey: '#9a9a9a',
  gray: '#9a9a9a',
  'light grey': '#c8c8c8',
  'light gray': '#c8c8c8',
  'dark grey': '#595959',
  'dark gray': '#595959',
  silver: '#b8b8b8',
  blue: '#345d8f',
  denim: '#4f6d8c',
  'medium blue': '#4f78a7',
  'dark blue': '#243f68',
  'light blue': '#90b8e8',
  'sky blue': '#90b8e8',
  'powder blue': '#a9c8df',
  'washed blue': '#6f8fb6',
  'washed black': '#333333',
  navy: '#1b2d48',
  midnight: '#172033',
  indigo: '#2d3f69',
  cobalt: '#244fa3',
  teal: '#2f6f6c',
  turquoise: '#3d9d9b',
  green: '#5d7357',
  olive: '#7c7a48',
  sage: '#a0a98a',
  mint: '#a8cdb8',
  moss: '#66724f',
  red: '#9f2a24',
  burgundy: '#6d2333',
  wine: '#742b39',
  pink: '#d8a7ad',
  blush: '#e4b9bb',
  rose: '#c77986',
  mauve: '#a97888',
  coral: '#d47463',
  yellow: '#d8b64c',
  gold: '#b8973c',
  mustard: '#c49a2e',
  orange: '#c96f34',
  rust: '#a95635',
  purple: '#6b4b7a',
  plum: '#5b344f',
  lavender: '#b9a8d3',
  lilac: '#c4abd8'
};

const slugify = value =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const cleanString = (value, fallback = '') => {
  const nextValue = typeof value === 'string' ? value.trim() : '';
  return nextValue || fallback;
};

const cleanNumber = (value, fallback = 0) => {
  const nextValue = Number(value);

  if (!Number.isFinite(nextValue) || nextValue < 0) {
    return fallback;
  }

  return Number(nextValue.toFixed(2));
};

const cleanOptionalNumber = value => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const nextValue = Number(value);

  if (!Number.isFinite(nextValue) || nextValue < 0) {
    return null;
  }

  return Number(nextValue.toFixed(2));
};

const cleanInteger = (value, fallback = 0) => {
  const nextValue = Number.parseInt(value, 10);

  if (!Number.isFinite(nextValue) || nextValue < 0) {
    return fallback;
  }

  return nextValue;
};

const normalizeList = (value, fallback = []) => {
  if (Array.isArray(value)) {
    const list = value
      .map(item => cleanString(item))
      .filter(Boolean);

    return list.length ? list : fallback;
  }

  if (typeof value === 'string') {
    const list = value
      .split(',')
      .map(item => cleanString(item))
      .filter(Boolean);

    return list.length ? list : fallback;
  }

  return fallback;
};

const cleanMaterialName = value => {
  const name = cleanString(value).replace(/\s+/g, ' ');

  if (!name) {
    return '';
  }

  if (/(composition|shell:|lining:|upper:|sole:|trim:|coating:|base fabric:|frame:|temple:|lens:|[0-9]+%)/i.test(name)) {
    const error = new Error('Material name must be a clean material name without part labels or percentages.');
    error.statusCode = 400;
    throw error;
  }

  return name;
};

const normalizeMaterialPercent = value => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const percent = Number(value);

  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    const error = new Error('Material percent must be between 0 and 100.');
    error.statusCode = 400;
    throw error;
  }

  return Number(percent.toFixed(2));
};

const normalizeMaterialPart = value => {
  const partName = cleanString(value, 'Main');

  if (!MATERIAL_PART_NAME_SET.has(partName)) {
    const error = new Error(`Material part must be ${MATERIAL_PART_NAMES.slice(0, -1).join(', ')}, or ${MATERIAL_PART_NAMES.at(-1)}.`);
    error.statusCode = 400;
    throw error;
  }

  return partName;
};

const normalizeSubmittedMaterials = (value, fallback = []) => {
  const sourceItems = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',').map(item => ({ material_name: item }))
      : fallback;
  const rawItems = (Array.isArray(sourceItems) ? sourceItems : []).flatMap(item => {
    if (item && typeof item === 'object' && Array.isArray(item.materials)) {
      const partName = item.part_name || item.partName || 'Main';
      return item.materials.map(material => ({
        ...material,
        part_name: partName,
        partName
      }));
    }

    return [item];
  });

  return rawItems
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          part_name: 'Main',
          partName: 'Main',
          material_id: '',
          materialId: '',
          material_name: cleanMaterialName(item),
          materialName: cleanMaterialName(item),
          material_percent: null,
          materialPercent: null,
          sortOrder: index
        };
      }

      const materialName = cleanMaterialName(item && (item.material_name || item.materialName || item.name));

      if (!materialName) {
        return null;
      }

      const partName = normalizeMaterialPart(item.part_name || item.partName);
      const materialId = cleanString(item.material_id || item.materialId);
      const materialPercent = normalizeMaterialPercent(item.material_percent ?? item.materialPercent ?? item.percent);

      return {
        part_name: partName,
        partName,
        material_id: materialId,
        materialId,
        material_name: materialName,
        materialName,
        material_percent: materialPercent,
        materialPercent,
        sortOrder: cleanInteger(item.sortOrder ?? item.sort_order ?? index, index)
      };
    })
    .filter(Boolean);
};

const normalizeMaterialGroups = value => {
  const groups = [];

  (Array.isArray(value) ? value : []).forEach((groupOrItem, groupIndex) => {
    if (typeof groupOrItem === 'string') {
      const materialName = cleanString(groupOrItem);
      if (materialName) {
        groups.push({
          part_name: 'Main',
          partName: 'Main',
          materials: [{
            material_id: '',
            materialId: '',
            name: materialName,
            percent: null,
            sortOrder: groupIndex
          }]
        });
      }
      return;
    }

    if (Array.isArray(groupOrItem && groupOrItem.materials)) {
      const partName = cleanString(groupOrItem.part_name || groupOrItem.partName, 'Main');
      const materials = groupOrItem.materials
        .map((material, index) => ({
          material_id: cleanString(material.material_id || material.materialId),
          materialId: cleanString(material.material_id || material.materialId),
          name: cleanString(material.name || material.material_name || material.materialName),
          percent: material.percent === null || material.percent === undefined ? null : Number(material.percent),
          sortOrder: cleanInteger(material.sortOrder ?? index, index)
        }))
        .filter(material => material.name);

      if (materials.length) {
        groups.push({
          part_name: partName,
          partName,
          materials
        });
      }
      return;
    }

    const materialName = cleanString(groupOrItem && (groupOrItem.material_name || groupOrItem.materialName || groupOrItem.name));
    if (materialName) {
      const partName = cleanString(groupOrItem.part_name || groupOrItem.partName, 'Main');
      groups.push({
        part_name: partName,
        partName,
        materials: [{
          material_id: cleanString(groupOrItem.material_id || groupOrItem.materialId),
          materialId: cleanString(groupOrItem.material_id || groupOrItem.materialId),
          name: materialName,
          percent: groupOrItem.material_percent ?? groupOrItem.materialPercent ?? groupOrItem.percent ?? null,
          sortOrder: cleanInteger(groupOrItem.sortOrder ?? groupIndex, groupIndex)
        }]
      });
    }
  });

  return groups;
};

const normalizeMaterialFilterOptions = value =>
  (Array.isArray(value) ? value : [])
    .map(option => ({
      value: cleanString(option && (option.value || option.slug || option.name)),
      label: cleanString(option && (option.label || option.name || option.value))
    }))
    .filter(option => option.value && option.label);

const normalizeMaterialInformation = (value, fallback = null) => {
  const source = value && typeof value === 'object' ? value : {};
  const fallbackSource = fallback && typeof fallback === 'object' ? fallback : {};
  const rawContent = typeof value === 'string'
    ? value
    : source.content ??
      source.highlight_text ??
      source.highlightText ??
      fallbackSource.content ??
      fallbackSource.highlight_text ??
      fallbackSource.highlightText ??
      '';
  const rawTitle =
    source.title ??
    source.materialInformationTitle ??
    fallbackSource.title ??
    fallbackSource.materialInformationTitle ??
    DEFAULT_MATERIAL_INFORMATION_TITLE;

  return {
    title: cleanString(rawTitle, DEFAULT_MATERIAL_INFORMATION_TITLE),
    content: rawContent === null || rawContent === undefined ? '' : String(rawContent)
  };
};

const normalizeColors = (value, fallback = DEFAULT_COLORS) => {
  if (!Array.isArray(value) && typeof value !== 'string') {
    return fallback;
  }

  const items = Array.isArray(value)
    ? value
    : value.split(',').map(entry => {
        const [name, hex] = entry.split(':');
        return { name, hex };
      });

  const colors = items
    .map(color => ({
      id: cleanString(color && color.id),
      colorVariantId: cleanString(color && (color.colorVariantId || color.color_variant_id || color.id)),
      name: cleanString(color && color.name),
      hex: cleanString(color && hexValue(color), inferColorHex(color && color.name, DEFAULT_PALETTE.base)),
      family: normalizeColorFamily(color && (color.family || color.colorFamily || color.color_family), color && color.name),
      colorFamily: normalizeColorFamily(color && (color.family || color.colorFamily || color.color_family), color && color.name),
      color_family: normalizeColorFamily(color && (color.family || color.colorFamily || color.color_family), color && color.name),
      value: colorFamilyValue(color && (color.family || color.colorFamily || color.color_family || color.name)),
      productCode: cleanString(color && (color.productCode || color.product_code || color.articleNumber || color.article_number)),
      articleNumber: cleanString(color && (color.articleNumber || color.article_number || color.productCode || color.product_code)),
      salePrice: cleanOptionalNumber(color && (color.salePrice ?? color.sale_price)),
      sale_price: cleanOptionalNumber(color && (color.salePrice ?? color.sale_price))
    }))
    .filter(color => color.name && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.hex));

  return colors.length ? colors : fallback;
};

const hexValue = color => color && (color.hex || color.colorHex || color.color_hex);

const normalizePalette = (value, fallback = DEFAULT_PALETTE) => {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  return {
    base: cleanString(value.base, fallback.base),
    accent: cleanString(value.accent, fallback.accent),
    glow: cleanString(value.glow, fallback.glow)
  };
};

const normalizeGender = (value, fallback = DEFAULT_GENDER) =>
  cleanString(value, fallback).toLowerCase() === 'men' ? 'men' : 'women';

const normalizeStatus = (value, fallback = DEFAULT_STATUS) => {
  const nextValue = cleanString(value, fallback).toLowerCase();
  return nextValue === PRODUCT_STATUS.ACTIVE ? PRODUCT_STATUS.ACTIVE : PRODUCT_STATUS.INACTIVE;
};

const normalizePricingMode = (value, fallback = 'regular') => {
  const nextValue = cleanString(value, fallback).toLowerCase();
  return ['regular', 'sale'].includes(nextValue) ? nextValue : 'regular';
};

const calculateSaleDiscountPercent = product => {
  const price = cleanNumber(product && product.price, 0);
  const originalPrice = cleanNumber(product && (product.originalPrice ?? product.original_price), price);
  const salePrice =
    product && product.salePrice !== undefined && product.salePrice !== null
      ? cleanNumber(product.salePrice, price)
      : product && product.sale_price !== undefined && product.sale_price !== null
        ? cleanNumber(product.sale_price, price)
        : price;
  const pricingMode = normalizePricingMode(
    product && (product.pricingMode || product.pricing_mode),
    product && (product.isSale || product.is_sale) ? 'sale' : 'regular'
  );

  if (pricingMode !== 'sale' || originalPrice <= 0 || salePrice <= 0 || salePrice >= originalPrice) {
    return 0;
  }

  return Math.ceil(((originalPrice - salePrice) / originalPrice) * 100);
};

const inferColorHex = (colorName, fallback = DEFAULT_PALETTE.base) => {
  const nextColorName = cleanString(colorName)
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  if (!nextColorName) {
    return fallback;
  }

  if (COLOR_HEX_BY_NAME[nextColorName]) {
    return COLOR_HEX_BY_NAME[nextColorName];
  }

  const matchedName = Object.keys(COLOR_HEX_BY_NAME)
    .sort((left, right) => right.length - left.length)
    .find(name => nextColorName.includes(name));

  return matchedName ? COLOR_HEX_BY_NAME[matchedName] : fallback;
};

const uniqueBy = (items, selector) => {
  const seen = new Set();
  return items.filter(item => {
    const key = selector(item);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const normalizeInventoryItems = (value, fallback = []) => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item, index) => ({
      id: cleanString(item && item.id),
      colorName: cleanString(item && (item.colorName || item.color_name), DEFAULT_PRIMARY_COLOR),
      colorHex: cleanString(
        item && (item.colorHex || item.color_hex),
        inferColorHex(item && (item.colorName || item.color_name), DEFAULT_PALETTE.base)
      ),
      colorFamily: normalizeColorFamily(
        item && (item.colorFamily || item.color_family),
        item && (item.colorName || item.color_name)
      ),
      color_family: normalizeColorFamily(
        item && (item.colorFamily || item.color_family),
        item && (item.colorName || item.color_name)
      ),
      sizeLabel: cleanString(item && (item.sizeLabel || item.size_label), 'One Size'),
      stockQuantity: cleanInteger(item && (item.stockQuantity || item.stock_quantity), 0),
      reservedQuantity: cleanInteger(item && (item.reservedQuantity || item.reserved_quantity), 0),
      soldQuantity: cleanInteger(item && (item.soldQuantity || item.sold_quantity), 0),
      availableQuantity: cleanInteger(
        item && (item.availableQuantity || item.available_quantity),
        Math.max(
          0,
          cleanInteger(item && (item.stockQuantity || item.stock_quantity), 0) -
            cleanInteger(item && (item.reservedQuantity || item.reserved_quantity), 0)
        )
      ),
      colorVariantId: cleanString(item && (item.colorVariantId || item.color_variant_id)),
      productCode: cleanString(item && (item.productCode || item.product_code || item.articleNumber || item.article_number)),
      articleNumber: cleanString(item && (item.articleNumber || item.article_number || item.productCode || item.product_code)),
      salePrice: cleanOptionalNumber(item && (item.salePrice ?? item.sale_price)),
      sale_price: cleanOptionalNumber(item && (item.salePrice ?? item.sale_price)),
      sortOrder: cleanInteger(item && (item.sortOrder || item.sort_order), index)
    }))
    .filter(item => item.colorName && item.sizeLabel);

  return items.length ? items : fallback;
};

const normalizeColorVariants = (value, fallback = []) => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const variants = value
    .map((item, index) => ({
      id: cleanString(item && item.id),
      colorVariantId: cleanString(item && (item.colorVariantId || item.color_variant_id || item.id)),
      name: cleanString(item && (item.name || item.colorName || item.color_name), DEFAULT_PRIMARY_COLOR),
      hex: cleanString(hexValue(item), inferColorHex(item && (item.name || item.colorName || item.color_name), DEFAULT_PALETTE.base)),
      family: normalizeColorFamily(item && (item.family || item.colorFamily || item.color_family), item && (item.name || item.colorName || item.color_name)),
      colorFamily: normalizeColorFamily(item && (item.family || item.colorFamily || item.color_family), item && (item.name || item.colorName || item.color_name)),
      color_family: normalizeColorFamily(item && (item.family || item.colorFamily || item.color_family), item && (item.name || item.colorName || item.color_name)),
      value: colorFamilyValue(item && (item.family || item.colorFamily || item.color_family || item.name || item.colorName || item.color_name)),
      productCode: cleanString(item && (item.productCode || item.product_code || item.articleNumber || item.article_number)),
      articleNumber: cleanString(item && (item.articleNumber || item.article_number || item.productCode || item.product_code)),
      salePrice: cleanOptionalNumber(item && (item.salePrice ?? item.sale_price)),
      sale_price: cleanOptionalNumber(item && (item.salePrice ?? item.sale_price)),
      productCodeAutoGenerated: Boolean(item && (item.productCodeAutoGenerated || item.product_code_auto_generated)),
      product_code_auto_generated: Boolean(item && (item.productCodeAutoGenerated || item.product_code_auto_generated)),
      sortOrder: cleanInteger(item && (item.sortOrder || item.sort_order), index)
    }))
    .filter(item => item.name);

  return variants.length ? variants : fallback;
};

const normalizeProductImages = (value, fallback = []) => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const images = value
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: '',
          productId: '',
          colorName: '',
          imageUrl: cleanString(item),
          altText: '',
          isPrimary: index === 0,
          sortOrder: index
        };
      }

      return {
        id: cleanString(item && item.id),
        productId: cleanString(item && (item.productId || item.product_id)),
        colorName: cleanString(item && (item.colorName || item.color_name)),
        imageUrl: cleanString(item && (item.imageUrl || item.image_url || item.url)),
        altText: cleanString(item && (item.altText || item.alt_text)),
        isPrimary: Boolean(item && (item.isPrimary || item.is_primary)),
        sortOrder: cleanInteger(item && (item.sortOrder || item.sort_order), index)
      };
    })
    .filter(item => item.imageUrl);

  return images.length ? images : fallback;
};

const distributeInventoryAcrossVariants = (totalInventory, sizes, colors) => {
  const safeSizes = sizes.length ? sizes : ['One Size'];
  const safeColors = colors.length ? colors : DEFAULT_COLORS;
  const variantsCount = safeSizes.length * safeColors.length;
  const baseQuantity = variantsCount ? Math.floor(totalInventory / variantsCount) : totalInventory;
  let remainder = variantsCount ? totalInventory % variantsCount : 0;
  let index = 0;

  return safeColors.flatMap(color =>
    safeSizes.map(size => {
      const stockQuantity = baseQuantity + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;

      return {
        id: '',
        colorName: color.name,
        colorHex: color.hex || inferColorHex(color.name, DEFAULT_PALETTE.base),
        colorFamily: normalizeColorFamily(color.family || color.colorFamily || color.color_family, color.name),
        color_family: normalizeColorFamily(color.family || color.colorFamily || color.color_family, color.name),
        sizeLabel: size,
        stockQuantity,
        reservedQuantity: 0,
        soldQuantity: 0,
        sortOrder: index++
      };
    })
  );
};

const buildProductPayload = (payload = {}, existingProduct = {}) => {
  const name = cleanString(payload.name, existingProduct.name);

  if (!name) {
    const error = new Error('Product name is required.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedColors = normalizeColors(payload.colors, existingProduct.colors || DEFAULT_COLORS);
  const fallbackPalette = existingProduct.palette || {
    base: normalizedColors[0].hex,
    accent: normalizedColors[0].hex,
    glow: DEFAULT_PALETTE.glow
  };

  const rawPricingMode = payload.pricingMode || payload.pricing_mode || existingProduct.pricingMode || existingProduct.pricing_mode;
  const pricingMode = rawPricingMode
    ? normalizePricingMode(rawPricingMode)
    : existingProduct.isSale || existingProduct.is_sale
      ? 'sale'
      : 'regular';
  const hasPayloadValue = key => Object.prototype.hasOwnProperty.call(payload, key);
  const readPayloadValue = (...keys) => {
    for (const key of keys) {
      if (hasPayloadValue(key)) {
        return payload[key];
      }
    }

    return undefined;
  };
  const rawSubmittedPrice = readPayloadValue('price');
  const rawOriginalPrice = readPayloadValue('originalPrice', 'original_price');
  const fallbackOriginalPrice =
    existingProduct.originalPrice ??
    existingProduct.original_price ??
    existingProduct.price ??
    rawSubmittedPrice ??
    0;
  const originalPrice = cleanNumber(
    rawOriginalPrice !== undefined
      ? rawOriginalPrice
      : pricingMode === 'regular' && rawSubmittedPrice !== undefined
        ? rawSubmittedPrice
        : fallbackOriginalPrice,
    0
  );
  const rawSalePrice = Object.prototype.hasOwnProperty.call(payload, 'salePrice')
    ? payload.salePrice
    : Object.prototype.hasOwnProperty.call(payload, 'sale_price')
      ? payload.sale_price
      : existingProduct.salePrice ?? existingProduct.sale_price;
  const hasSalePriceInput = rawSalePrice !== null && rawSalePrice !== undefined && rawSalePrice !== '';
  const salePrice = pricingMode === 'sale' && hasSalePriceInput ? cleanNumber(rawSalePrice, -1) : null;

  if (pricingMode === 'sale' && (salePrice === null || !Number.isFinite(salePrice) || salePrice < 0 || salePrice >= originalPrice)) {
    const error = new Error('Sale price is required and must be lower than the original price.');
    error.statusCode = 400;
    throw error;
  }

  const price = pricingMode === 'sale' ? salePrice : originalPrice;

  const productGroup = cleanString(
    payload.productGroup || payload.product_group || payload.productGroupSlug || payload.product_group_slug,
    existingProduct.productGroupSlug ||
      existingProduct.productGroup ||
      existingProduct.product_group_slug ||
      existingProduct.product_group ||
      DEFAULT_PRODUCT_GROUP
  ).toLowerCase();
  const category = cleanString(payload.category, existingProduct.category || DEFAULT_CATEGORY);
  const isPantsCategory = isPantsCategoryValue(category);
  const isClothing = productGroup === 'clothing';
  const isShoes = productGroup === 'shoes';
  const styleName = cleanString(
    payload.styleName || payload.style_name,
    existingProduct.styleName || existingProduct.style_name || DEFAULT_STYLE
  );
  const rawHeelHeight = cleanString(
    payload.heelHeight || payload.heel_height,
    existingProduct.heelHeight || existingProduct.heel_height || ''
  );
  const sleeveLength = cleanString(
    payload.sleeveLength || payload.sleeve_length,
    existingProduct.sleeveLength || existingProduct.sleeve_length || ''
  );
  const garmentLength = cleanString(
    payload.garmentLength || payload.garment_length || payload.length,
    existingProduct.garmentLength || existingProduct.garment_length || existingProduct.length || ''
  );
  const neckline = cleanString(
    payload.neckline,
    existingProduct.neckline || ''
  );
  const waistRise = cleanString(
    payload.waistRise || payload.waist_rise,
    existingProduct.waistRise || existingProduct.waist_rise || (isPantsCategory ? existingProduct.neckline : '') || ''
  );

  if (isShoes && rawHeelHeight && !HEEL_HEIGHT_OPTIONS.has(rawHeelHeight)) {
    const error = new Error('Heel height must be High heel, Mid heel, Low heel, or No heel.');
    error.statusCode = 400;
    throw error;
  }

  const collection = cleanString(payload.collection, existingProduct.collection || '');
  const slug = cleanString(payload.slug, existingProduct.slug || slugify(name));
  const providedInventory = cleanInteger(payload.inventory, existingProduct.inventory || 0);
  const sizes = normalizeList(payload.sizes, existingProduct.sizes || DEFAULT_SIZES);
  const materials = normalizeSubmittedMaterials(payload.materials, existingProduct.materials || []);
  const hasMaterialInformationInput =
    Object.prototype.hasOwnProperty.call(payload, 'materialInformation') ||
    Object.prototype.hasOwnProperty.call(payload, 'material_information') ||
    Object.prototype.hasOwnProperty.call(payload, 'materialInformationContent') ||
    Object.prototype.hasOwnProperty.call(payload, 'material_information_content') ||
    Object.prototype.hasOwnProperty.call(payload, 'materialInformationTitle') ||
    Object.prototype.hasOwnProperty.call(payload, 'material_information_title');
  const materialInformationInput = hasMaterialInformationInput
    ? payload.materialInformation ||
      payload.material_information || {
        title: payload.materialInformationTitle || payload.material_information_title,
        content: payload.materialInformationContent ?? payload.material_information_content
      }
    : undefined;
  const materialInformation = normalizeMaterialInformation(
    materialInformationInput,
    existingProduct.materialInformation || existingProduct.material_information
  );
  const shouldReuseExistingInventoryItems =
    !Array.isArray(payload.inventoryItems) &&
    !Object.prototype.hasOwnProperty.call(payload, 'inventory') &&
    !Object.prototype.hasOwnProperty.call(payload, 'sizes') &&
    !Object.prototype.hasOwnProperty.call(payload, 'colors');
  const inventoryItems = normalizeInventoryItems(
    Array.isArray(payload.inventoryItems)
      ? payload.inventoryItems
      : shouldReuseExistingInventoryItems
        ? existingProduct.inventoryItems
        : [],
    distributeInventoryAcrossVariants(providedInventory, sizes, normalizedColors)
  );
  const computedInventory = inventoryItems.reduce((total, item) => total + cleanInteger(item.stockQuantity, 0), 0);
  const productColors = uniqueBy(
    inventoryItems.map(item => ({
      name: item.colorName,
      hex:
        normalizedColors.find(color => color.name.toLowerCase() === item.colorName.toLowerCase())?.hex ||
        inferColorHex(item.colorName, normalizedColors[0] ? normalizedColors[0].hex : DEFAULT_PALETTE.base),
      family:
        normalizedColors.find(color => color.name.toLowerCase() === item.colorName.toLowerCase())?.family ||
        item.colorFamily ||
        normalizeColorFamily(item.color_family, item.colorName),
      colorFamily:
        normalizedColors.find(color => color.name.toLowerCase() === item.colorName.toLowerCase())?.family ||
        item.colorFamily ||
        normalizeColorFamily(item.color_family, item.colorName),
      color_family:
        normalizedColors.find(color => color.name.toLowerCase() === item.colorName.toLowerCase())?.family ||
        item.colorFamily ||
        normalizeColorFamily(item.color_family, item.colorName)
    })),
    color => color.name.toLowerCase()
  );
  const reviewCount = cleanInteger(existingProduct.reviews, 0);

  return {
    slug,
    name,
    gender: normalizeGender(payload.gender, existingProduct.gender || DEFAULT_GENDER),
    category,
    productGroup,
    styleName,
    collection,
    price,
    pricingMode,
    salePrice,
    originalPrice,
    isSale: pricingMode === 'sale',
    inventory: computedInventory,
    rating: reviewCount > 0 ? cleanNumber(existingProduct.rating, 0) : 0,
    reviews: reviewCount,
    soldCount: cleanInteger(existingProduct.soldCount || existingProduct.sold_count, 0),
    description: cleanString(payload.description, existingProduct.description || ''),
    fit: isClothing ? cleanString(payload.fit || payload.fitName || payload.fit_name, existingProduct.fitName || existingProduct.fit_name || existingProduct.fit || '') : '',
    fitId: isClothing ? cleanString(payload.fitId || payload.fit_id, existingProduct.fitId || existingProduct.fit_id || '') : '',
    sleeveLength: isClothing && !isPantsCategory ? sleeveLength : '',
    garmentLength: isClothing ? garmentLength : '',
    neckline: isClothing && !isPantsCategory ? neckline : '',
    waistRise: isClothing && isPantsCategory ? waistRise : '',
    heelHeight: isShoes ? rawHeelHeight : '',
    spotlight: cleanString(payload.spotlight, existingProduct.spotlight || ''),
    status: normalizeStatus(payload.status, existingProduct.status || DEFAULT_STATUS),
    primaryColor: cleanString(payload.primaryColor, existingProduct.primaryColor || productColors[0]?.name || DEFAULT_PRIMARY_COLOR),
    sizes: uniqueBy(inventoryItems.map(item => item.sizeLabel), value => value),
    materials,
    materialInformation,
    colors: productColors.length ? productColors : normalizedColors,
    inventoryItems,
    colorVariants: normalizeColorVariants(payload.colorVariants || payload.color_variants, existingProduct.colorVariants || existingProduct.color_variants || []),
    productImages: normalizeProductImages(payload.productImages || payload.product_images, existingProduct.productImages || []),
    palette: normalizePalette(payload.palette, fallbackPalette)
  };
};

const serializeProduct = product => {
  if (!product) {
    return null;
  }

  const productWithoutHighlights = { ...product };
  delete productWithoutHighlights.highlights;
  delete productWithoutHighlights.product_highlights;
  delete productWithoutHighlights.product_highlights_json;
  const productImages = normalizeProductImages(product.productImages || product.product_images || product.images, []);
  const imageUrls = productImages.map(image => image.imageUrl);
  const createdAtValue = product.createdAt || product.created_at || null;
  const createdAtTime = createdAtValue ? new Date(createdAtValue).getTime() : 0;
  const reviewCount = cleanInteger(product.reviews, 0);
  const isAutomaticNewArrival = Number.isFinite(createdAtTime) && createdAtTime > 0
    ? Date.now() - createdAtTime <= NEW_ARRIVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000
    : false;
  const price = cleanNumber(product.price, 0);
  const pricingMode = normalizePricingMode(
    product.pricingMode || product.pricing_mode,
    product.isSale || product.is_sale ? 'sale' : 'regular'
  );
  const salePrice =
    product.salePrice !== undefined && product.salePrice !== null
      ? cleanNumber(product.salePrice, 0)
      : product.sale_price !== undefined && product.sale_price !== null
        ? cleanNumber(product.sale_price, 0)
        : null;
  const originalPrice = cleanNumber(product.originalPrice ?? product.original_price, price);
  const normalizedColors = normalizeColors(product.colors, DEFAULT_COLORS);
  const normalizedInventoryItems = normalizeInventoryItems(product.inventoryItems || product.inventory_items, []);
  const normalizedColorVariants = normalizeColorVariants(product.colorVariants || product.color_variants, []);
  const listingPricing = resolveListingPricing(
    {
      price,
      originalPrice,
      salePrice
    },
    normalizedColorVariants.length ? normalizedColorVariants : normalizedColors
  );
  const saleDiscountPercent = listingPricing.pricingMode === 'sale' && listingPricing.comparePrice > listingPricing.effectivePrice
    ? Math.ceil(((listingPricing.comparePrice - listingPricing.effectivePrice) / listingPricing.comparePrice) * 100)
    : calculateSaleDiscountPercent({
        price,
        pricingMode,
        salePrice,
        originalPrice,
        isSale: pricingMode === 'sale' || product.isSale || product.is_sale
      });

  return {
    ...productWithoutHighlights,
    id: String(product.id),
    gender: normalizeGender(product.gender, DEFAULT_GENDER),
    departmentId: product.departmentId || product.department_id ? String(product.departmentId || product.department_id) : '',
    departmentLabel: cleanString(product.departmentLabel || product.department_label, ''),
    categoryId: product.categoryId || product.category_id ? String(product.categoryId || product.category_id) : '',
    categoryLabel: cleanString(product.categoryLabel || product.category_label, ''),
    categorySlug: cleanString(product.categorySlug || product.category_slug, ''),
    category: cleanString(product.category, DEFAULT_CATEGORY),
    productGroupId: product.productGroupId || product.product_group_id ? String(product.productGroupId || product.product_group_id) : '',
    productGroup: cleanString(product.productGroup || product.product_group || product.product_group_name, DEFAULT_PRODUCT_GROUP),
    productGroupLabel: cleanString(product.productGroupLabel || product.product_group_label, ''),
    productGroupSlug: cleanString(product.productGroupSlug || product.product_group_slug, ''),
    productGroupSortOrder: cleanInteger(product.productGroupSortOrder || product.product_group_sort_order, 0),
    styleName: cleanString(product.styleName || product.style_name, DEFAULT_STYLE),
    styleSlug: cleanString(product.styleSlug || product.style_slug, ''),
    collection: cleanString(product.collection || product.collection_name, ''),
    collectionId: product.collectionId || product.collection_id ? String(product.collectionId || product.collection_id) : '',
    collectionSlug: cleanString(product.collectionSlug || product.collection_slug, ''),
    styleId: product.styleId || product.style_id ? String(product.styleId || product.style_id) : '',
    fitId: product.fitId || product.fit_id ? String(product.fitId || product.fit_id) : '',
    fitName: cleanString(product.fitName || product.fit_name || product.fit, ''),
    fitSlug: cleanString(product.fitSlug || product.fit_slug, ''),
    sleeveLength: cleanString(product.sleeveLength || product.sleeve_length, ''),
    sleeve_length: cleanString(product.sleeveLength || product.sleeve_length, ''),
    garmentLength: cleanString(product.garmentLength || product.garment_length || product.length, ''),
    garment_length: cleanString(product.garmentLength || product.garment_length || product.length, ''),
    neckline: cleanString(product.neckline, ''),
    waistRise: cleanString(product.waistRise || product.waist_rise, ''),
    waist_rise: cleanString(product.waistRise || product.waist_rise, ''),
    heelHeight: cleanString(product.heelHeight || product.heel_height, ''),
    slug: cleanString(product.slug, ''),
    price,
    pricingMode,
    salePrice,
    originalPrice,
    saleDiscountPercent,
    sale_discount_percent: saleDiscountPercent,
    listingPrice: listingPricing.effectivePrice,
    listing_price: listingPricing.effectivePrice,
    listingComparePrice: listingPricing.comparePrice,
    listing_compare_price: listingPricing.comparePrice,
    listingPricingMode: listingPricing.pricingMode,
    listing_pricing_mode: listingPricing.pricingMode,
    listingPriceSource: listingPricing.priceSource,
    listing_price_source: listingPricing.priceSource,
    priceVaries: listingPricing.priceVaries,
    price_varies: listingPricing.priceVaries,
    pricePrefix: listingPricing.pricePrefix,
    price_prefix: listingPricing.pricePrefix,
    hasSalePricing: listingPricing.hasSalePricing,
    has_sale_pricing: listingPricing.hasSalePricing,
    hasVariantSalePricing: listingPricing.hasVariantSalePricing,
    has_variant_sale_pricing: listingPricing.hasVariantSalePricing,
    isSale: pricingMode === 'sale' || Boolean(product.isSale || product.is_sale) || listingPricing.hasSalePricing,
    inventory: cleanInteger(product.inventory, 0),
    rating: reviewCount > 0 ? cleanNumber(product.rating, 0) : 0,
    reviews: reviewCount,
    soldCount: cleanInteger(product.soldCount || product.sold_count, 0),
    isBestseller: cleanInteger(product.soldCount || product.sold_count || product.ordered_quantity, 0) > 0,
    newArrival: isAutomaticNewArrival,
    description: cleanString(product.description, ''),
    fit: cleanString(product.fitName || product.fit_name || product.fit, ''),
    spotlight: cleanString(product.spotlight, ''),
    status: normalizeStatus(product.status, DEFAULT_STATUS),
    primaryColor: cleanString(product.primaryColor || product.primary_color || product.colors?.[0]?.name, DEFAULT_PRIMARY_COLOR),
    sizes: normalizeList(product.sizes, DEFAULT_SIZES),
    materials: normalizeMaterialGroups(product.materials),
    materialFilterValues: normalizeList(product.materialFilterValues || product.material_filter_values, []),
    materialFilterOptions: normalizeMaterialFilterOptions(product.materialFilterOptions || product.material_filter_options),
    materialInformation: normalizeMaterialInformation(product.materialInformation || product.material_information),
    colors: normalizedColors,
    inventoryItems: normalizedInventoryItems,
    colorVariants: normalizedColorVariants,
    productImages,
    images: imageUrls,
    imageUrls,
    imageUrl: imageUrls[0] || '',
    palette: normalizePalette(
      product.palette || {
        base: product.palette_base,
        accent: product.palette_accent,
        glow: product.palette_glow
      },
      DEFAULT_PALETTE
    )
  };
};

const listPublicRows = (db, {
  selectSql,
  whereSql = '',
  orderBy,
  values = [],
  limit,
  offset
}) => {
  const queryValues = [...values];
  const hasPagination = Number.isFinite(limit) && Number.isFinite(offset);
  const paginationSql = hasPagination
    ? `LIMIT $${queryValues.length + 1} OFFSET $${queryValues.length + 2}`
    : '';

  if (hasPagination) queryValues.push(limit, offset);

  return db.query(
    `
      ${selectSql}
      ${whereSql}
      ORDER BY ${orderBy}
      ${paginationSql}
    `,
    queryValues
  );
};

const countPublicRows = (db, { whereSql = '', values = [] }) => db.query(
  `
    SELECT COUNT(DISTINCT p.id)::int AS total
    FROM ${PRODUCT_TABLE} p
    LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
    LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = COALESCE(p.product_group_id, c.product_group_id)
    LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = COALESCE(p.department_id, c.department_id)
    LEFT JOIN ${COLLECTION_TABLE} col ON col.id = p.collection_id
    LEFT JOIN ${STYLE_TABLE} st ON st.id = p.style_id
    LEFT JOIN (
      SELECT
        oi.product_id,
        SUM(oi.quantity)::int AS ordered_quantity
      FROM ${ORDER_ITEM_TABLE} oi
      JOIN ${ORDER_TABLE} o ON o.id = oi.order_id
      WHERE o.order_status = 'completed'
      GROUP BY oi.product_id
    ) order_stats ON order_stats.product_id = p.id
    ${whereSql}
  `,
  values
);

const findPublicRow = async (db, {
  selectSql,
  key,
  useId,
  activeOnly = false
}) => {
  const result = await db.query(
    `
      ${selectSql}
      WHERE ${useId ? 'p.id = $1' : 'LOWER(p.slug) = LOWER($1)'}
        ${activeOnly ? "AND LOWER(COALESCE(p.status, 'active')) = 'active'" : ''}
        AND (to_jsonb(p)->>'deleted_at') IS NULL
      LIMIT 1
    `,
    [key]
  );

  return result.rows[0] || null;
};

const loadPublicRelations = async (db, productIds, {
  materialInformationTitle = DEFAULT_MATERIAL_INFORMATION_TITLE,
  materialInformationType = 'material_information'
} = {}) => {
  const [inventoryResult, imageResult, materialsResult, materialInformationResult] = await Promise.all([
    db.query(
      `
        SELECT
          pi.id,
          pi.product_id,
          pi.color_variant_id,
          pi.color_name,
          pi.color_hex,
          pcv.color_family,
          pcv.sale_price,
          pi.product_code,
          pi.article_number,
          pi.size_label,
          pi.stock_quantity,
          pi.reserved_quantity,
          pi.sold_quantity,
          pi.created_at,
          pi.updated_at
        FROM ${PRODUCT_INVENTORY_TABLE} pi
        LEFT JOIN ${PRODUCT_COLOR_VARIANT_TABLE} pcv
          ON pcv.id = pi.color_variant_id
         AND pcv.deleted_at IS NULL
        WHERE pi.product_id = ANY($1::uuid[])
        ORDER BY pi.product_id, pi.created_at, pi.id
      `,
      [productIds]
    ),
    db.query(
      `
        SELECT
          id,
          product_id,
          color_variant_id,
          color_name,
          image_url,
          alt_text,
          is_primary,
          sort_order,
          created_at
        FROM ${PRODUCT_IMAGE_TABLE}
        WHERE product_id = ANY($1::uuid[])
        ORDER BY product_id, is_primary DESC, sort_order ASC, created_at ASC, id ASC
      `,
      [productIds]
    ),
    db.query(
      `
        SELECT
          pm.id,
          pm.product_id,
          pm.material_id,
          m.slug AS material_slug,
          pm.part_name,
          pm.material_name,
          pm.material_percent,
          pm.sort_order
        FROM product_materials pm
        LEFT JOIN ${MATERIAL_TABLE} m ON m.id = pm.material_id
        WHERE pm.product_id = ANY($1::uuid[])
        ORDER BY pm.product_id, pm.sort_order, pm.id
      `,
      [productIds]
    ),
    db.query(
      `
        SELECT
          product_id,
          COALESCE(NULLIF(title, ''), $2) AS title,
          highlight_text AS content,
          sort_order
        FROM product_highlights
        WHERE product_id = ANY($1::uuid[])
          AND highlight_type = $3
        ORDER BY product_id, sort_order, id
      `,
      [productIds, materialInformationTitle, materialInformationType]
    )
  ]);

  return {
    imageRows: imageResult.rows,
    inventoryRows: inventoryResult.rows,
    materialInformationRows: materialInformationResult.rows,
    materialRows: materialsResult.rows
  };
};

const findAdminUpdateBaseById = async (db, productId) => {
  if (!UUID_PATTERN.test(String(productId || '').trim())) {
    return null;
  }

  const result = await db.query(
    `
      SELECT *
      FROM ${PRODUCT_TABLE}
      WHERE id = $1
        AND (to_jsonb(${PRODUCT_TABLE})->>'deleted_at') IS NULL
      LIMIT 1
    `,
    [productId]
  );

  return result.rows[0] || null;
};

const resolveUniqueSlug = async (db, baseSlug, excludedProductId = null) => {
  const normalizedBase = String(baseSlug || 'product')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
  let candidate = normalizedBase;
  let suffix = 2;

  while (true) {
    const values = [candidate];
    const excludedClause = excludedProductId ? 'AND id <> $2' : '';
    if (excludedProductId) values.push(excludedProductId);

    const result = await db.query(
      `
        SELECT 1
        FROM ${PRODUCT_TABLE}
        WHERE slug = $1
          ${excludedClause}
        LIMIT 1
      `,
      values
    );

    if (!result.rowCount) return candidate;
    candidate = `${normalizedBase}-${suffix}`;
    suffix += 1;
  }
};

const createAdminRow = (db, product, references, slug) => db.query(
  `
    INSERT INTO ${PRODUCT_TABLE} (
      name,
      price,
      original_price,
      sale_price,
      pricing_mode,
      is_sale,
      rating,
      reviews,
      sold_count,
      description,
      fit,
      fit_id,
      sleeve_length,
      garment_length,
      neckline,
      waist_rise,
      heel_height,
      category_id,
      product_group_id,
      department_id,
      slug,
      status,
      collection_id,
      style_id,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18, $19, $20, $21, $22, $23, $24, now(), now()
    )
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `,
  [
    product.name,
    product.price,
    product.originalPrice,
    product.salePrice,
    product.pricingMode,
    product.isSale,
    0,
    0,
    product.soldCount,
    product.description || null,
    product.fit || null,
    references.fitId,
    product.sleeveLength || null,
    product.garmentLength || null,
    product.neckline || null,
    product.waistRise || null,
    product.heelHeight || null,
    references.category.id,
    references.productGroup ? references.productGroup.id : null,
    references.department.id,
    slug,
    product.status,
    references.collectionId,
    references.styleId
  ]
);

const updateAdminRow = (db, productId, product, references, slug) => db.query(
  `
    UPDATE ${PRODUCT_TABLE}
    SET
      name = $2,
      price = $3,
      original_price = $4,
      sale_price = $5,
      pricing_mode = $6,
      is_sale = $7,
      rating = COALESCE((
        SELECT AVG(pr.rating)::numeric(3,2)
        FROM product_reviews pr
        WHERE pr.product_id = $1
          AND pr.is_approved = true
      ), 0),
      reviews = (
        SELECT COUNT(*)::int
        FROM product_reviews pr
        WHERE pr.product_id = $1
          AND pr.is_approved = true
      ),
      description = $8,
      fit = $9,
      fit_id = $10,
      sleeve_length = $11,
      garment_length = $12,
      neckline = $13,
      waist_rise = $14,
      heel_height = $15,
      category_id = $16,
      product_group_id = $17,
      department_id = $18,
      slug = $19,
      status = $20,
      collection_id = $21,
      style_id = $22,
      updated_at = now()
    WHERE id = $1
  `,
  [
    productId,
    product.name,
    product.price,
    product.originalPrice,
    product.salePrice,
    product.pricingMode,
    product.isSale,
    product.description || null,
    product.fit || null,
    references.fitId,
    product.sleeveLength || null,
    product.garmentLength || null,
    product.neckline || null,
    product.waistRise || null,
    product.heelHeight || null,
    references.category.id,
    references.productGroup ? references.productGroup.id : null,
    references.department.id,
    slug,
    product.status,
    references.collectionId,
    references.styleId
  ]
);

const deleteAdminProduct = async (db, productId) => {
  const result = await db.query(
    `
      WITH target AS MATERIALIZED (
        SELECT id
        FROM ${PRODUCT_TABLE}
        WHERE id = $1
      ),
      usage AS MATERIALIZED (
        SELECT EXISTS(
          SELECT 1
          FROM ${ORDER_ITEM_TABLE}
          WHERE product_id = $1
        ) AS has_orders
        FROM target
      ),
      deleted AS (
        DELETE FROM ${PRODUCT_TABLE} product
        USING target
        WHERE product.id = target.id
          AND NOT COALESCE((SELECT has_orders FROM usage), false)
        RETURNING product.id
      )
      SELECT
        EXISTS(SELECT 1 FROM target) AS product_exists,
        COALESCE((SELECT has_orders FROM usage), false) AS has_orders,
        (SELECT id FROM deleted) AS deleted_id
    `,
    [productId]
  );

  return result.rows[0] || {};
};

const clearPrimaryImage = (db, productId, colorName) => db.query(
  `
    UPDATE ${PRODUCT_IMAGE_TABLE}
    SET is_primary = false
    WHERE product_id = $1
      AND COALESCE(color_name, '') = COALESCE($2, '')
  `,
  [productId, colorName || null]
);

const insertAdminImage = (db, {
  productId,
  colorName,
  imageUrl,
  altText,
  isPrimary,
  sortOrder
}) => db.query(
  `
    INSERT INTO ${PRODUCT_IMAGE_TABLE} (
      product_id,
      color_name,
      image_url,
      alt_text,
      is_primary,
      sort_order,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, now())
    RETURNING id, product_id, color_name, image_url, alt_text, is_primary, sort_order, created_at
  `,
  [productId, colorName || null, imageUrl, altText, isPrimary, sortOrder]
);

const replaceAdminImages = async (db, productId, imagesJson) => {
  await db.query(`DELETE FROM ${PRODUCT_IMAGE_TABLE} WHERE product_id = $1`, [productId]);

  if (!imagesJson) {
    return;
  }

  await db.query(
    `
      INSERT INTO ${PRODUCT_IMAGE_TABLE} (
        product_id,
        color_variant_id,
        color_name,
        image_url,
        alt_text,
        is_primary,
        sort_order,
        created_at
      )
      SELECT
        $1,
        image.color_variant_id,
        NULLIF(TRIM(image.color_name), ''),
        image.image_url,
        NULLIF(TRIM(image.alt_text), ''),
        image.is_primary,
        image.sort_order,
        now()
      FROM jsonb_to_recordset($2::jsonb) AS image(
        color_name text,
        color_variant_id uuid,
        image_url text,
        alt_text text,
        is_primary boolean,
        sort_order int
      )
      ORDER BY image.sort_order
    `,
    [productId, imagesJson]
  );
};

const listAdminInventoryRowsForUpdate = async (db, productId) => {
  const result = await db.query(
    `
      SELECT id, color_name, size_label
      FROM ${PRODUCT_INVENTORY_TABLE}
      WHERE product_id = $1
      FOR UPDATE
    `,
    [productId]
  );

  return result.rows;
};

const hasAdminColorOrderHistory = async (db, productId, removedColors, removedVariantIds) => {
  const result = await db.query(
    `
      SELECT EXISTS(
        SELECT 1
        FROM ${ORDER_ITEM_TABLE} oi
        WHERE oi.product_id = $1
          AND (
            LOWER(TRIM(COALESCE(oi.color_name, ''))) = ANY($2::text[])
            OR oi.variant_id = ANY($3::uuid[])
          )
      ) AS has_orders
    `,
    [productId, removedColors, removedVariantIds]
  );

  return Boolean(result.rows[0] && result.rows[0].has_orders);
};

const hasAdminSizeOrderHistory = async (db, productId, removedVariantIds, removedVariantKeys) => {
  const result = await db.query(
    `
      SELECT EXISTS(
        SELECT 1
        FROM ${ORDER_ITEM_TABLE} oi
        WHERE oi.product_id = $1
          AND (
            oi.variant_id = ANY($2::uuid[])
            OR (
              LOWER(TRIM(COALESCE(oi.color_name, '')))
              || '__'
              || LOWER(TRIM(COALESCE(oi.size_label, '')))
            ) = ANY($3::text[])
          )
      ) AS has_orders
    `,
    [productId, removedVariantIds, removedVariantKeys]
  );

  return Boolean(result.rows[0] && result.rows[0].has_orders);
};

const loadAdminRelationsSignatureRow = async (db, productId) => {
  const result = await db.query(
    `
      SELECT
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'colorName', pcv.color_name,
              'colorHex', pcv.color_hex,
              'colorFamily', pcv.color_family,
              'productCode', pcv.product_code,
              'salePrice', pcv.sale_price,
              'sortOrder', pcv.sort_order
            )
            ORDER BY pcv.sort_order, pcv.color_name
          )
          FROM ${PRODUCT_COLOR_VARIANT_TABLE} pcv
          WHERE pcv.product_id = $1
            AND pcv.deleted_at IS NULL
        ), '[]'::jsonb) AS colors,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'colorName', image.color_name,
              'imageUrl', image.image_url,
              'altText', image.alt_text,
              'isPrimary', image.is_primary,
              'sortOrder', image.sort_order
            )
            ORDER BY image.sort_order, image.color_name, image.image_url
          )
          FROM ${PRODUCT_IMAGE_TABLE} image
          WHERE image.product_id = $1
        ), '[]'::jsonb) AS images,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'materialId', material.material_id,
              'partName', material.part_name,
              'materialName', material.material_name,
              'materialPercent', material.material_percent,
              'sortOrder', material.sort_order
            )
            ORDER BY material.sort_order, material.part_name, material.material_name
          )
          FROM product_materials material
          WHERE material.product_id = $1
        ), '[]'::jsonb) AS materials,
        (
          SELECT jsonb_build_object(
            'title', COALESCE(NULLIF(material_info.title, ''), '${DEFAULT_MATERIAL_INFORMATION_TITLE}'),
            'content', material_info.highlight_text,
            'sortOrder', material_info.sort_order
          )
          FROM product_highlights material_info
          WHERE material_info.product_id = $1
            AND material_info.highlight_type = 'material_information'
          ORDER BY material_info.sort_order, material_info.id
          LIMIT 1
        ) AS material_information,
        COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'colorName', inventory.color_name,
              'colorHex', inventory.color_hex,
              'sizeLabel', inventory.size_label,
              'stockQuantity', inventory.stock_quantity,
              'reservedQuantity', inventory.reserved_quantity,
              'soldQuantity', inventory.sold_quantity,
              'productCode', inventory.product_code,
              'articleNumber', inventory.article_number
            )
            ORDER BY inventory.color_name, inventory.size_label
          )
          FROM ${PRODUCT_INVENTORY_TABLE} inventory
          WHERE inventory.product_id = $1
        ), '[]'::jsonb) AS inventory
    `,
    [productId]
  );

  return result.rows[0] || {};
};

const persistAdminColorVariantRows = async (db, productId, colorVariantsJson, isNew) => {
  const result = await db.query(
    `
      WITH submitted AS (
        SELECT
          color.color_name,
          NULLIF(TRIM(color.color_hex), '') AS color_hex,
          color.color_family,
          NULLIF(TRIM(color.product_code), '') AS product_code,
          color.sale_price,
          color.sort_order
        FROM jsonb_to_recordset($2::jsonb) AS color(
          color_name text,
          color_hex text,
          color_family text,
          product_code text,
          sale_price numeric,
          sort_order int
        )
      ),
      cleared_codes AS (
        UPDATE ${PRODUCT_COLOR_VARIANT_TABLE} pcv
        SET product_code = NULL,
            updated_at = now()
        WHERE pcv.product_id = $1
          AND pcv.deleted_at IS NULL
          AND $3::boolean = false
        RETURNING 1
      ),
      deleted AS (
        UPDATE ${PRODUCT_COLOR_VARIANT_TABLE} pcv
        SET deleted_at = now(),
            updated_at = now()
        WHERE pcv.product_id = $1
          AND pcv.deleted_at IS NULL
          AND $3::boolean = false
          AND NOT EXISTS (
            SELECT 1
            FROM submitted
            WHERE LOWER(TRIM(submitted.color_name)) = LOWER(TRIM(pcv.color_name))
          )
        RETURNING 1
      ),
      updated AS (
        UPDATE ${PRODUCT_COLOR_VARIANT_TABLE} pcv
        SET
          color_name = submitted.color_name,
          color_hex = submitted.color_hex,
          color_family = submitted.color_family,
          product_code = submitted.product_code,
          sale_price = submitted.sale_price,
          sort_order = submitted.sort_order,
          deleted_at = NULL,
          updated_at = now()
        FROM submitted
        WHERE pcv.product_id = $1
          AND pcv.deleted_at IS NULL
          AND LOWER(TRIM(pcv.color_name)) = LOWER(TRIM(submitted.color_name))
        RETURNING
          pcv.id,
          pcv.color_name,
          pcv.color_hex,
          pcv.color_family,
          pcv.product_code,
          pcv.sale_price,
          pcv.sort_order
      ),
      inserted AS (
        INSERT INTO ${PRODUCT_COLOR_VARIANT_TABLE} (
          product_id,
          color_name,
          color_hex,
          color_family,
          product_code,
          sale_price,
          sort_order,
          created_at,
          updated_at
        )
        SELECT
          $1,
          submitted.color_name,
          submitted.color_hex,
          submitted.color_family,
          submitted.product_code,
          submitted.sale_price,
          submitted.sort_order,
          now(),
          now()
        FROM submitted
        WHERE NOT EXISTS (
          SELECT 1
          FROM updated
          WHERE LOWER(TRIM(updated.color_name)) = LOWER(TRIM(submitted.color_name))
        )
        RETURNING
          id,
          color_name,
          color_hex,
          color_family,
          product_code,
          sale_price,
          sort_order
      )
      SELECT * FROM updated
      UNION ALL
      SELECT * FROM inserted
      ORDER BY sort_order, color_name
    `,
    [productId, colorVariantsJson, Boolean(isNew)]
  );

  return result.rows;
};

const deleteStaleAdminRelations = (db, productId, submittedInventoryJson) => db.query(
  `
    WITH submitted AS (
      SELECT
        LOWER(TRIM(item.color_name)) AS color_name,
        LOWER(TRIM(item.size_label)) AS size_label
      FROM jsonb_to_recordset($2::jsonb) AS item(
        color_name text,
        size_label text
      )
    ),
    deleted_materials AS (
      DELETE FROM product_materials
      WHERE product_id = $1
    ),
    deleted_material_information AS (
      DELETE FROM product_highlights
      WHERE product_id = $1
        AND highlight_type = 'material_information'
    ),
    deleted_images AS (
      DELETE FROM ${PRODUCT_IMAGE_TABLE}
      WHERE product_id = $1
    ),
    deleted_inventory AS (
      DELETE FROM ${PRODUCT_INVENTORY_TABLE} inventory
      WHERE inventory.product_id = $1
        AND NOT EXISTS (
          SELECT 1
          FROM submitted
          WHERE submitted.color_name = LOWER(TRIM(inventory.color_name))
            AND submitted.size_label = LOWER(TRIM(inventory.size_label))
        )
      RETURNING 1
    )
    SELECT 1
  `,
  [productId, submittedInventoryJson]
);

const upsertAdminRelations = (
  db,
  productId,
  imagesJson,
  materialsJson,
  materialInformationJson,
  inventoryJson
) => db.query(
  `
    WITH image_insert AS (
      INSERT INTO ${PRODUCT_IMAGE_TABLE} (
        product_id,
        color_variant_id,
        color_name,
        image_url,
        alt_text,
        is_primary,
        sort_order,
        created_at
      )
      SELECT
        $1,
        image.color_variant_id,
        NULLIF(TRIM(image.color_name), ''),
        image.image_url,
        NULLIF(TRIM(image.alt_text), ''),
        image.is_primary,
        image.sort_order,
        now()
      FROM jsonb_to_recordset($2::jsonb) AS image(
        color_variant_id uuid,
        color_name text,
        image_url text,
        alt_text text,
        is_primary boolean,
        sort_order int
      )
      ORDER BY image.sort_order
      RETURNING 1
    ),
    material_insert AS (
      INSERT INTO product_materials (
        product_id,
        material_id,
        part_name,
        material_name,
        material_percent,
        sort_order
      )
      SELECT
        $1,
        material.material_id,
        material.part_name,
        material.material_name,
        material.material_percent,
        material.sort_order
      FROM jsonb_to_recordset($3::jsonb) AS material(
        material_id uuid,
        part_name text,
        material_name text,
        material_percent numeric,
        sort_order int
      )
      WHERE material.material_name <> ''
      RETURNING 1
    ),
    material_information_insert AS (
      INSERT INTO product_highlights (
        product_id,
        highlight_type,
        title,
        highlight_text,
        sort_order
      )
      SELECT
        $1,
        'material_information',
        COALESCE(NULLIF(TRIM(material_info.title), ''), '${DEFAULT_MATERIAL_INFORMATION_TITLE}'),
        material_info.highlight_text,
        material_info.sort_order
      FROM jsonb_to_record($4::jsonb) AS material_info(
        title text,
        highlight_text text,
        sort_order int
      )
      WHERE material_info.highlight_text IS NOT NULL
        AND BTRIM(material_info.highlight_text) <> ''
      RETURNING 1
    ),
    inventory_upsert AS (
      INSERT INTO ${PRODUCT_INVENTORY_TABLE} (
        product_id,
        color_variant_id,
        color_name,
        color_hex,
        size_label,
        stock_quantity,
        reserved_quantity,
        sold_quantity,
        product_code,
        article_number,
        created_at,
        updated_at
      )
      SELECT
        $1,
        inventory.color_variant_id,
        inventory.color_name,
        NULLIF(TRIM(inventory.color_hex), ''),
        inventory.size_label,
        inventory.stock_quantity,
        inventory.reserved_quantity,
        inventory.sold_quantity,
        NULLIF(TRIM(inventory.product_code), ''),
        NULLIF(TRIM(inventory.article_number), ''),
        now(),
        now()
      FROM jsonb_to_recordset($5::jsonb) AS inventory(
        color_name text,
        color_variant_id uuid,
        product_code text,
        article_number text,
        color_hex text,
        size_label text,
        stock_quantity int,
        reserved_quantity int,
        sold_quantity int
      )
      ON CONFLICT ON CONSTRAINT unique_product_color_size
      DO UPDATE SET
        color_variant_id = EXCLUDED.color_variant_id,
        color_hex = EXCLUDED.color_hex,
        stock_quantity = EXCLUDED.stock_quantity,
        product_code = EXCLUDED.product_code,
        article_number = EXCLUDED.article_number,
        updated_at = now()
      RETURNING 1
    )
    SELECT 1
  `,
  [productId, imagesJson, materialsJson, materialInformationJson, inventoryJson]
);

const resolveAdminReferenceRow = async (db, {
  gender,
  categoryValue,
  productGroupValue,
  collectionName,
  collectionSlug,
  styleName,
  styleSlug,
  fitName,
  fitSlug
}) => {
  const result = await db.query(
    `
      WITH input AS (
        SELECT
          $1::text AS gender,
          $2::text AS category_value,
          $3::text AS product_group_value,
          $4::text AS collection_name,
          $5::text AS collection_slug,
          $6::text AS style_name,
          $7::text AS style_slug,
          $8::text AS fit_name,
          $9::text AS fit_slug
      ),
      department_match AS (
        SELECT d.id, d.name, d.label
        FROM ${DEPARTMENT_TABLE} d, input i
        WHERE LOWER(d.name) = LOWER(i.gender)
           OR LOWER(COALESCE(d.label, '')) = LOWER(i.gender)
        LIMIT 1
      ),
      requested_product_group AS (
        SELECT pg.id, pg.name, pg.label, pg.slug, pg.sort_order
        FROM ${PRODUCT_GROUP_TABLE} pg, input i
        WHERE i.product_group_value <> ''
          AND (to_jsonb(pg)->>'deleted_at') IS NULL
          AND (
            LOWER(pg.name) = LOWER(i.product_group_value)
            OR LOWER(COALESCE(pg.label, '')) = LOWER(i.product_group_value)
            OR LOWER(COALESCE(pg.slug, '')) = LOWER(i.product_group_value)
          )
        LIMIT 1
      ),
      category_match AS (
        SELECT c.id, c.name, c.label, c.slug, c.product_group_id
        FROM ${CATEGORY_TABLE} c
        JOIN department_match d ON c.department_id = d.id
        CROSS JOIN input i
        LEFT JOIN requested_product_group rpg ON true
        WHERE (
            LOWER(c.name) = LOWER(i.category_value)
            OR LOWER(COALESCE(c.label, '')) = LOWER(i.category_value)
            OR LOWER(COALESCE(c.slug, '')) = LOWER(i.category_value)
          )
          AND (rpg.id IS NULL OR c.product_group_id = rpg.id)
        LIMIT 1
      ),
      category_product_group AS (
        SELECT pg.id, pg.name, pg.label, pg.slug, pg.sort_order
        FROM ${PRODUCT_GROUP_TABLE} pg
        JOIN category_match c ON c.product_group_id = pg.id
        WHERE (to_jsonb(pg)->>'deleted_at') IS NULL
        LIMIT 1
      ),
      resolved_product_group AS (
        SELECT * FROM requested_product_group
        UNION ALL
        SELECT * FROM category_product_group
        WHERE NOT EXISTS (SELECT 1 FROM requested_product_group)
        LIMIT 1
      ),
      collection_match AS (
        SELECT col.id
        FROM ${COLLECTION_TABLE} col
        JOIN ${COLLECTION_DEPARTMENT_TABLE} cd ON cd.collection_id = col.id
        JOIN department_match d ON d.id = cd.department_id
        CROSS JOIN input i
        WHERE i.collection_name <> ''
          AND COALESCE(to_jsonb(col)->>'status', 'active') = 'active'
          AND (to_jsonb(col)->>'deleted_at') IS NULL
          AND cd.status = 'active'
          AND cd.deleted_at IS NULL
          AND (
            LOWER(col.name) = LOWER(i.collection_name)
            OR LOWER(COALESCE(col.slug, '')) = LOWER(i.collection_slug)
          )
        LIMIT 1
      ),
      style_match AS (
        SELECT st.id
        FROM ${STYLE_TABLE} st, input i
        WHERE i.style_name <> ''
          AND COALESCE(to_jsonb(st)->>'status', 'active') = 'active'
          AND (to_jsonb(st)->>'deleted_at') IS NULL
          AND (
            LOWER(st.name) = LOWER(i.style_name)
            OR LOWER(COALESCE(st.slug, '')) = LOWER(i.style_slug)
          )
          AND (st.product_group_id IS NULL OR st.product_group_id = (SELECT id FROM resolved_product_group))
          AND (st.department_id IS NULL OR st.department_id = (SELECT id FROM department_match))
          AND (st.category_id IS NULL OR st.category_id = (SELECT id FROM category_match))
        LIMIT 1
      ),
      style_insert AS (
        INSERT INTO ${STYLE_TABLE} (
          name,
          slug,
          product_group_id,
          department_id,
          category_id,
          status,
          sort_order,
          created_at,
          updated_at
        )
        SELECT
          i.style_name,
          i.style_slug,
          (SELECT id FROM resolved_product_group),
          (SELECT id FROM department_match),
          CASE
            WHEN LOWER(COALESCE((SELECT slug FROM resolved_product_group), '')) = 'clothing'
              THEN (SELECT id FROM category_match)
            ELSE NULL
          END,
          'active',
          999,
          now(),
          now()
        FROM input i
        WHERE i.style_name <> ''
          AND NOT EXISTS (SELECT 1 FROM style_match)
        ON CONFLICT (slug) DO UPDATE
        SET
          name = EXCLUDED.name,
          status = 'active',
          updated_at = now(),
          deleted_at = NULL
        RETURNING id
      ),
      fit_match AS (
        SELECT f.id
        FROM ${FIT_TABLE} f, input i
        WHERE i.fit_name <> ''
          AND LOWER(COALESCE((SELECT slug FROM resolved_product_group), '')) = 'clothing'
          AND COALESCE(to_jsonb(f)->>'status', 'active') = 'active'
          AND (to_jsonb(f)->>'deleted_at') IS NULL
          AND (
            LOWER(f.name) = LOWER(i.fit_name)
            OR LOWER(COALESCE(f.slug, '')) = LOWER(i.fit_slug)
          )
          AND (f.product_group_id IS NULL OR f.product_group_id = (SELECT id FROM resolved_product_group))
          AND (f.department_id IS NULL OR f.department_id = (SELECT id FROM department_match))
        LIMIT 1
      )
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        d.label AS department_label,
        c.id AS category_id,
        c.name AS category_name,
        c.label AS category_label,
        c.slug AS category_slug,
        pg.id AS product_group_id,
        pg.name AS product_group_name,
        pg.label AS product_group_label,
        pg.slug AS product_group_slug,
        pg.sort_order AS product_group_sort_order,
        (SELECT id FROM collection_match) AS collection_id,
        COALESCE((SELECT id FROM style_match), (SELECT id FROM style_insert)) AS style_id,
        (SELECT id FROM fit_match) AS fit_id
      FROM department_match d
      LEFT JOIN category_match c ON true
      LEFT JOIN resolved_product_group pg ON true
    `,
    [gender, categoryValue, productGroupValue, collectionName, collectionSlug, styleName, styleSlug, fitName, fitSlug]
  );

  return result.rows[0] || {};
};

const listAdminRows = async (db, {
  whereSql,
  sortSql,
  values,
  limit,
  offset,
  newArrivalWindowDays = NEW_ARRIVAL_WINDOW_DAYS
}) => {
  const rowsPromise = db.query(
    `
      SELECT
        p.id, p.name, p.slug, p.price, p.original_price,
        COALESCE(to_jsonb(p)->>'pricing_mode', 'regular') AS pricing_mode,
        (to_jsonb(p)->>'sale_price')::numeric AS sale_price,
        COALESCE((to_jsonb(p)->>'is_sale')::boolean, false) AS is_sale,
        (p.created_at >= now() - ($${values.length + 1}::int * interval '1 day')) AS new_arrival,
        p.status, p.created_at, p.updated_at,
        d.name AS department_name,
        pg.id AS product_group_id, pg.name AS product_group_name,
        pg.label AS product_group_label, pg.slug AS product_group_slug,
        c.name AS category_name, c.label AS category_label, c.slug AS category_slug,
        col.name AS collection_name, col.slug AS collection_slug,
        st.id AS style_id, st.name AS style_name, st.slug AS style_slug,
        COALESCE(stock.stock_quantity, 0)::int AS stock_quantity,
        COALESCE(stock.reserved_quantity, 0)::int AS reserved_quantity,
        COALESCE(stock.sold_quantity, 0)::int AS sold_quantity,
        COALESCE(p.sold_count, 0)::int AS ordered_quantity,
        image.image_url
      FROM ${PRODUCT_TABLE} p
      LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
      LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = COALESCE(p.department_id, c.department_id)
      LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = COALESCE(p.product_group_id, c.product_group_id)
      LEFT JOIN ${COLLECTION_TABLE} col ON col.id = p.collection_id
      LEFT JOIN ${STYLE_TABLE} st ON st.id = p.style_id
      LEFT JOIN (
        SELECT product_id,
               SUM(stock_quantity)::int AS stock_quantity,
               SUM(reserved_quantity)::int AS reserved_quantity,
               SUM(sold_quantity)::int AS sold_quantity
        FROM ${PRODUCT_INVENTORY_TABLE}
        GROUP BY product_id
      ) stock ON stock.product_id = p.id
      LEFT JOIN LATERAL (
        SELECT image_url
        FROM ${PRODUCT_IMAGE_TABLE}
        WHERE product_id = p.id
        ORDER BY is_primary DESC, sort_order ASC, created_at ASC, id ASC
        LIMIT 1
      ) image ON true
      ${whereSql}
      ORDER BY ${sortSql}
      LIMIT $${values.length + 2} OFFSET $${values.length + 3}
    `,
    [...values, newArrivalWindowDays, limit, offset]
  );
  const totalPromise = db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM ${PRODUCT_TABLE} p
      LEFT JOIN ${CATEGORY_TABLE} c ON c.id = p.category_id
      LEFT JOIN ${DEPARTMENT_TABLE} d ON d.id = COALESCE(p.department_id, c.department_id)
      LEFT JOIN ${PRODUCT_GROUP_TABLE} pg ON pg.id = COALESCE(p.product_group_id, c.product_group_id)
      LEFT JOIN ${COLLECTION_TABLE} col ON col.id = p.collection_id
      LEFT JOIN ${STYLE_TABLE} st ON st.id = p.style_id
      ${whereSql}
    `,
    values
  );
  const [rowsResult, totalResult] = await Promise.all([rowsPromise, totalPromise]);
  return { rows: rowsResult.rows, total: Number(totalResult.rows[0]?.total || 0) };
};

const updateAdminStatus = (db, productId, status) => db.query(
  `
    UPDATE ${PRODUCT_TABLE}
    SET status = $2, updated_at = now()
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING id, status, updated_at
  `,
  [productId, status]
);

module.exports = {
  buildProductPayload,
  clearPrimaryImage,
  countPublicRows,
  createAdminRow,
  deleteStaleAdminRelations,
  deleteAdminProduct,
  findAdminUpdateBaseById,
  findPublicRow,
  hasAdminColorOrderHistory,
  hasAdminSizeOrderHistory,
  insertAdminImage,
  listAdminInventoryRowsForUpdate,
  listAdminRows,
  listPublicRows,
  loadAdminRelationsSignatureRow,
  loadPublicRelations,
  persistAdminColorVariantRows,
  replaceAdminImages,
  resolveAdminReferenceRow,
  resolveUniqueSlug,
  serializeProduct,
  slugify,
  updateAdminRow,
  updateAdminStatus,
  upsertAdminRelations
};
