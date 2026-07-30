const FALLBACK_COLOR_HEX = '#CCCCCC';
const NEUTRAL_FALLBACK_HEXES = new Set(['#efe8df', '#e7dfd4', '#d8d2c8']);

export const COLOR_FAMILY_OPTIONS = [
  'Black',
  'White',
  'Gray',
  'Beige',
  'Brown',
  'Red',
  'Pink',
  'Purple',
  'Blue',
  'Green',
  'Yellow',
  'Orange',
  'Multi'
];

const COLOR_FAMILY_VALUES = new Set(COLOR_FAMILY_OPTIONS.map(value => value.toLowerCase()));

export const COLOR_FAMILY_SWATCHES = {
  black: '#000000',
  white: '#FFFFFF',
  gray: '#808080',
  beige: '#D8C3A5',
  brown: '#8B5E3C',
  red: '#B3261E',
  pink: '#E45A84',
  purple: '#7E57C2',
  blue: '#2F5D9A',
  green: '#4F7D4A',
  yellow: '#F2C94C',
  orange: '#F2994A',
  multi: FALLBACK_COLOR_HEX
};

export const COLOR_FAMILY_HEX = {
  Black: '#000000',
  White: '#FFFFFF',
  Gray: '#808080',
  Grey: '#808080',
  Beige: '#D8C3A5',
  Brown: '#8B5E3C',
  Blue: '#2F5D9A',
  Navy: '#1F2A44',
  Green: '#4F7D4A',
  Red: '#B3261E',
  Pink: '#E45A84',
  Yellow: '#F2C94C',
  Orange: '#F2994A',
  Purple: '#7E57C2',
  Silver: '#C0C0C0',
  Gold: '#D4AF37',
  Multi: FALLBACK_COLOR_HEX
};

const COLOR_FAMILY_LABELS = COLOR_FAMILY_OPTIONS.reduce((labels, family) => {
  labels[family.toLowerCase()] = family;
  return labels;
}, {});

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

const cleanColorName = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

const stripPatternWords = value =>
  cleanColorName(value)
    .replace(/\b(striped|floral|checked|printed|pattern)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const readColorName = color => String((color && (color.name || color.colorName || color.color_name)) || color || '').trim();

const readDirectHex = color => String((color && color.hex) || '').trim();

const readColorFamily = color =>
  String((color && (color.family || color.colorFamily || color.color_family)) || '').trim();

const includesAny = (value, tokens) => tokens.some(token => value.includes(token));

export const isValidColorHex = value => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value || '').trim());

const resolveNamedColorHex = colorName => {
  const normalizedName = cleanColorName(colorName);

  if (!normalizedName) {
    return '';
  }

  if (COLOR_HEX_BY_NAME[normalizedName]) {
    return COLOR_HEX_BY_NAME[normalizedName];
  }

  const sortedNames = Object.keys(COLOR_HEX_BY_NAME).sort((left, right) => right.length - left.length);
  const matchedName = sortedNames.find(name => normalizedName.includes(name));

  return matchedName ? COLOR_HEX_BY_NAME[matchedName] : '';
};

export const resolveColorHex = (color, fallback = FALLBACK_COLOR_HEX) => {
  const directHex = readDirectHex(color);
  const normalizedDirectHex = directHex.toLowerCase();
  const namedHex = resolveNamedColorHex(readColorName(color));
  const familyHex = defaultHexForColorFamily(readColorFamily(color), '');

  if (isValidColorHex(directHex) && !NEUTRAL_FALLBACK_HEXES.has(normalizedDirectHex)) {
    return directHex;
  }

  if (namedHex) {
    return namedHex;
  }

  return familyHex || fallback;
};

export const colorFamilyValue = value => {
  const cleanName = cleanColorName(value);

  if (!cleanName) {
    return 'multi';
  }

  if (COLOR_FAMILY_VALUES.has(cleanName)) {
    return cleanName;
  }

  const mainPart = stripPatternWords(cleanName.split('/')[0] || cleanName);
  const familySource = mainPart || cleanName;

  if (familySource.includes('multi')) return 'multi';
  if (includesAny(familySource, ['black', 'ink', 'washed black'])) return 'black';
  if (includesAny(familySource, ['white', 'off white', 'ivory'])) return 'white';
  if (includesAny(familySource, ['gray', 'grey', 'silver', 'charcoal', 'graphite'])) return 'gray';
  if (includesAny(familySource, ['green', 'teal', 'olive', 'sage', 'mint', 'moss'])) return 'green';
  if (includesAny(familySource, ['blue', 'navy', 'denim', 'midnight', 'indigo', 'cobalt', 'turquoise'])) return 'blue';
  if (includesAny(familySource, ['red', 'burgundy', 'wine'])) return 'red';
  if (includesAny(familySource, ['pink', 'blush', 'rose', 'mauve'])) return 'pink';
  if (includesAny(familySource, ['purple', 'plum', 'lavender', 'lilac'])) return 'purple';
  if (includesAny(familySource, ['yellow', 'gold', 'mustard'])) return 'yellow';
  if (includesAny(familySource, ['orange', 'rust', 'coral'])) return 'orange';
  if (includesAny(familySource, ['brown', 'espresso', 'chocolate'])) return 'brown';
  if (includesAny(familySource, ['beige', 'cream', 'ecru', 'natural', 'stone', 'sand', 'oat', 'taupe', 'khaki', 'tan', 'camel'])) {
    return 'beige';
  }

  return 'multi';
};

export const normalizeColorFamily = (value, fallbackColorName = '') => {
  const familyValue = colorFamilyValue(value || fallbackColorName);
  return COLOR_FAMILY_LABELS[familyValue] || 'Multi';
};

export const colorFamilySwatch = (family, fallback = FALLBACK_COLOR_HEX) =>
  COLOR_FAMILY_SWATCHES[colorFamilyValue(family)] || fallback;

export const defaultHexForColorFamily = (family, fallback = FALLBACK_COLOR_HEX) => {
  const directKey = Object.keys(COLOR_FAMILY_HEX).find(key => key.toLowerCase() === cleanColorName(family));

  if (directKey) {
    return COLOR_FAMILY_HEX[directKey];
  }

  return COLOR_FAMILY_SWATCHES[colorFamilyValue(family)] || fallback;
};

export const normalizeColorOption = color => {
  const name = readColorName(color);
  const productCode = String((color && (color.productCode || color.product_code || color.articleNumber || color.article_number)) || '').trim();
  const family = normalizeColorFamily(readColorFamily(color), name);
  const value = colorFamilyValue(family);
  const normalizeOptionalPrice = price => {
    if (price === null || price === undefined || price === '') {
      return null;
    }

    const nextPrice = Number(price);
    return Number.isFinite(nextPrice) && nextPrice >= 0 ? nextPrice : null;
  };
  const salePrice = normalizeOptionalPrice(color && (color.salePrice ?? color.sale_price));

  return {
    name,
    color_name: name,
    hex: resolveColorHex(color, defaultHexForColorFamily(family)),
    family,
    colorFamily: family,
    color_family: family,
    value,
    label: family,
    swatch: colorFamilySwatch(family, resolveColorHex(color)),
    colorVariantId: String((color && (color.colorVariantId || color.color_variant_id || color.id)) || '').trim(),
    productCode,
    product_code: productCode,
    articleNumber: String((color && (color.articleNumber || color.article_number || color.productCode || color.product_code)) || '').trim(),
    salePrice,
    sale_price: salePrice
  };
};
