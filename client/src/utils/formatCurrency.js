// Shared money formatter used by storefront and admin presentation code.
export const formatCurrency = value =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
