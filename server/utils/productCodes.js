const COLOR_CODE_BY_FAMILY = {
  Black: 'BLK',
  White: 'WHT',
  Grey: 'GRY',
  Gray: 'GRY',
  Beige: 'BGE',
  Brown: 'BRN',
  Blue: 'BLU',
  Navy: 'NVY',
  Green: 'GRN',
  Red: 'RED',
  Pink: 'PNK',
  Yellow: 'YLW',
  Orange: 'ORG',
  Purple: 'PRP',
  Silver: 'SLV',
  Gold: 'GLD',
  Multi: 'MLT'
};

const sanitizeCodeToken = (value, fallback = 'GEN') => {
  const token = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return token || fallback;
};

const shortSegment = (value, fallback, maxLength = 6) => {
  const token = sanitizeCodeToken(value, fallback);
  const firstMeaningfulPart = token.split('-').find(part => part && !['AND', 'THE'].includes(part)) || token;

  return firstMeaningfulPart.slice(0, maxLength) || fallback;
};

const genderSegment = gender => {
  const normalized = String(gender || '').trim().toLowerCase();

  if (normalized === 'men' || normalized === 'male') return 'M';
  if (normalized === 'women' || normalized === 'female') return 'W';
  return 'U';
};

const colorSegment = ({ colorFamily, colorName } = {}) => {
  const family = String(colorFamily || '').trim();
  const familyToken = sanitizeCodeToken(family, '').replace(/-/g, '');
  const colorToken = sanitizeCodeToken(colorName, '').replace(/-/g, '');

  if (colorToken && colorToken !== familyToken) {
    return colorToken.slice(0, 3);
  }

  if (COLOR_CODE_BY_FAMILY[family]) {
    return COLOR_CODE_BY_FAMILY[family];
  }

  return colorToken.slice(0, 3) || 'CLR';
};

const sequenceSegment = ({ productId, productName } = {}) => {
  const idToken = String(productId || '').replace(/[^a-z0-9]/gi, '').toUpperCase();

  if (idToken.length >= 6) {
    return idToken.slice(0, 8);
  }

  const nameToken = sanitizeCodeToken(productName, '').replace(/-/g, '');
  return nameToken ? nameToken.slice(0, 6) : '001';
};

const normalizeProductCode = value =>
  sanitizeCodeToken(value, '').replace(/-+/g, '-');

const generateProductCode = ({
  brand = 'HEM',
  gender,
  productGroup,
  category,
  categoryLabel,
  productId,
  productName,
  colorName,
  colorFamily
} = {}) => {
  const brandCode = shortSegment(brand, 'HEM', 4);
  const genderCode = genderSegment(gender);
  const categoryCode = shortSegment(categoryLabel || category || productGroup, 'ITEM', 6);
  const productCode = sequenceSegment({ productId, productName });
  const colorCode = colorSegment({ colorFamily, colorName });

  return [brandCode, genderCode, categoryCode, productCode, colorCode].join('-');
};

module.exports = {
  generateProductCode,
  normalizeProductCode
};
