const COLOR_FAMILY_OPTIONS = [
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

const COLOR_FAMILY_SWATCHES = {
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
  multi: '#CCCCCC'
};

const DEFAULT_COLOR_HEX = '#CCCCCC';

const COLOR_FAMILY_HEX = {
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
  Multi: DEFAULT_COLOR_HEX
};

const COLOR_FAMILY_LABELS = COLOR_FAMILY_OPTIONS.reduce((labels, family) => {
  labels[family.toLowerCase()] = family;
  return labels;
}, {});

const cleanColorText = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

const stripPatternWords = value =>
  cleanColorText(value)
    .replace(/\b(striped|floral|checked|printed|pattern)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const includesAny = (value, tokens) => tokens.some(token => value.includes(token));

const inferColorFamilyValue = colorName => {
  const cleanName = cleanColorText(colorName);

  if (!cleanName) {
    return 'multi';
  }

  if (COLOR_FAMILY_VALUES.has(cleanName)) {
    return cleanName;
  }

  const mainPart = stripPatternWords(cleanName.split('/')[0] || cleanName);
  const value = mainPart || cleanName;

  if (value.includes('multi')) return 'multi';
  if (includesAny(value, ['black', 'ink', 'washed black'])) return 'black';
  if (includesAny(value, ['white', 'off white', 'ivory'])) return 'white';
  if (includesAny(value, ['gray', 'grey', 'silver', 'charcoal', 'graphite'])) return 'gray';
  if (includesAny(value, ['green', 'teal', 'olive', 'sage', 'mint', 'moss'])) return 'green';
  if (includesAny(value, ['blue', 'navy', 'denim', 'midnight', 'indigo', 'cobalt', 'turquoise'])) return 'blue';
  if (includesAny(value, ['red', 'burgundy', 'wine'])) return 'red';
  if (includesAny(value, ['pink', 'blush', 'rose', 'mauve'])) return 'pink';
  if (includesAny(value, ['purple', 'plum', 'lavender', 'lilac'])) return 'purple';
  if (includesAny(value, ['yellow', 'gold', 'mustard'])) return 'yellow';
  if (includesAny(value, ['orange', 'rust', 'coral'])) return 'orange';
  if (includesAny(value, ['brown', 'espresso', 'chocolate'])) return 'brown';
  if (includesAny(value, ['beige', 'cream', 'ecru', 'natural', 'stone', 'sand', 'oat', 'taupe', 'khaki', 'tan', 'camel'])) {
    return 'beige';
  }

  return 'multi';
};

const colorFamilyValue = value => inferColorFamilyValue(value);

const normalizeColorFamily = (value, fallbackColorName = '') => {
  const familyValue = colorFamilyValue(value || fallbackColorName);
  return COLOR_FAMILY_LABELS[familyValue] || 'Multi';
};

const isValidColorHex = value => /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(value || '').trim());

const defaultHexForColorFamily = (family, fallback = DEFAULT_COLOR_HEX) => {
  const cleanFamily = cleanColorText(family);
  const directKey = Object.keys(COLOR_FAMILY_HEX).find(key => cleanColorText(key) === cleanFamily);

  if (directKey) {
    return COLOR_FAMILY_HEX[directKey];
  }

  return COLOR_FAMILY_SWATCHES[colorFamilyValue(family)] || fallback;
};

const normalizeColorHex = (hex, family, fallback = DEFAULT_COLOR_HEX) => {
  const value = String(hex || '').trim();

  return value && isValidColorHex(value)
    ? value
    : defaultHexForColorFamily(family, fallback);
};

module.exports = {
  COLOR_FAMILY_OPTIONS,
  COLOR_FAMILY_HEX,
  COLOR_FAMILY_SWATCHES,
  DEFAULT_COLOR_HEX,
  colorFamilyValue,
  defaultHexForColorFamily,
  isValidColorHex,
  normalizeColorHex,
  normalizeColorFamily
};
