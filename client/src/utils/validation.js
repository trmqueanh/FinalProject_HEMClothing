export const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

export const isPositiveNumber = value => {
  const nextValue = Number(value);
  return Number.isFinite(nextValue) && nextValue >= 0;
};

