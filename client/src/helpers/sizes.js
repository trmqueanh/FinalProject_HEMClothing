const APPAREL_SIZE_ORDER = new Map([
  ['XXS', 0],
  ['2XS', 0],
  ['XS', 1],
  ['S', 2],
  ['M', 3],
  ['L', 4],
  ['XL', 5],
  ['XXL', 6],
  ['2XL', 6],
  ['XXXL', 7],
  ['3XL', 7],
  ['4XL', 8],
  ['5XL', 9]
]);

const normalizeSize = value =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

export const isOneSizeLabel = value =>
  ['ONE SIZE', 'FREE SIZE', 'OS', 'N/A'].includes(normalizeSize(value).toUpperCase());

export const shouldDisplaySize = value => {
  const label = normalizeSize(value);
  return Boolean(label) && !isOneSizeLabel(label);
};

const sizeSortKey = value => {
  const label = normalizeSize(value);
  const upperLabel = label.toUpperCase();

  if (APPAREL_SIZE_ORDER.has(upperLabel)) {
    return [0, APPAREL_SIZE_ORDER.get(upperLabel), 0, upperLabel];
  }

  const numericRange = upperLabel.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (numericRange) {
    return [2, Number(numericRange[1]), Number(numericRange[2]), upperLabel];
  }

  if (/^\d+(?:\.\d+)?$/.test(upperLabel)) {
    const numericValue = Number(upperLabel);
    return [1, numericValue, numericValue, upperLabel];
  }

  if (['ONE SIZE', 'FREE SIZE', 'OS'].includes(upperLabel)) {
    return [4, 0, 0, upperLabel];
  }

  return [3, 0, 0, upperLabel];
};

export const compareSizes = (left, right) => {
  const leftKey = sizeSortKey(left);
  const rightKey = sizeSortKey(right);

  for (let index = 0; index < leftKey.length - 1; index += 1) {
    if (leftKey[index] !== rightKey[index]) {
      return leftKey[index] - rightKey[index];
    }
  }

  return leftKey[3].localeCompare(rightKey[3], undefined, {
    numeric: true,
    sensitivity: 'base'
  });
};

export const sortSizeLabels = values =>
  (Array.isArray(values) ? values : [])
    .map(normalizeSize)
    .filter(Boolean)
    .sort(compareSizes);

export const sortSizeItems = (items, getLabel = item => item && item.sizeLabel) =>
  [...(Array.isArray(items) ? items : [])].sort((left, right) =>
    compareSizes(getLabel(left), getLabel(right))
  );
