import { formatVietnamDate } from '../dateTime';

// Profile route sections: maps legacy/settings URLs to the current profile tabs.
const PROFILE_SECTIONS = new Set([
  'orders',
  'coupons',
  'reviews',
  'settings',
  'edit-information',
  'add-address',
  'edit-address',
  'change-password'
]);

const LEGACY_SETTINGS_SECTIONS = new Set(['overview', 'membership', 'personal', 'shipping', 'payment', 'offers']);

export const ORDER_STATUS_TABS = [
  {
    value: 'all',
    label: 'All',
    statuses: ['pending', 'confirmed', 'processing', 'shipping', 'delivery_failed', 'delivered', 'completed', 'cancelled']
  },
  {
    value: 'to_confirm',
    label: 'To Confirm',
    statuses: ['pending']
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    statuses: ['confirmed', 'processing']
  },
  {
    value: 'shipping',
    label: 'Shipping',
    statuses: ['shipping', 'delivery_failed', 'delivered']
  },
  {
    value: 'completed',
    label: 'Completed',
    statuses: ['completed']
  },
  {
    value: 'requests',
    label: 'Returns & Refunds',
    statuses: []
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    statuses: ['cancelled']
  }
];

export const resolveOrderStatusesForTab = value => {
  const selectedTab = ORDER_STATUS_TABS.find(tab => tab.value === value) || ORDER_STATUS_TABS[0];
  return selectedTab.value === 'all' ? [] : [...selectedTab.statuses];
};

export const isOrderRequestTab = value => value === 'requests';

export const normalizeProfileSection = value => {
  const section = String(value || '').trim();

  if (section === 'returns') return 'orders';
  if (PROFILE_SECTIONS.has(section)) return section;
  if (LEGACY_SETTINGS_SECTIONS.has(section)) return 'settings';
  return 'settings';
};

export const resolveProfileRouteSection = route => {
  if (String(route && route.path || '').startsWith('/profile/orders')) {
    return 'orders';
  }
  if (String(route && route.path || '').startsWith('/profile/returns')) {
    return 'orders';
  }

  return normalizeProfileSection(route && route.query ? route.query.section : '');
};

// Profile form factories: always return fresh objects for edit/reset flows.
export const DEFAULT_PROFILE_FORM = () => ({
  name: '',
  fullName: '',
  phone: '',
  gender: '',
  birthDate: '',
  paymentProvider: 'cod'
});

export const DEFAULT_ADDRESS_FORM = () => ({
  receiverName: '',
  receiverPhone: '',
  country: 'Vietnam',
  city: '',
  district: '',
  ward: '',
  addressLine: '',
  addressLabel: '',
  isDefault: false
});

// Profile display helpers: labels and short text used by orders, reviews, and settings.
export const displayDate = value =>
  formatVietnamDate(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

export const formatDate = value =>
  formatVietnamDate(value, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }, 'Recently');

export const reviewVariantLabel = review =>
  [
    review && review.colorName ? `Color ${review.colorName}` : '',
    review && review.sizeLabel && !['one size', 'free size', 'os', 'n/a'].includes(String(review.sizeLabel).trim().toLowerCase()) ? `Size ${review.sizeLabel}` : ''
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(' · ');

export const formatFullShippingAddress = order =>
  [
    order && order.shippingAddressLine,
    order && order.shippingWard,
    order && order.shippingDistrict,
    order && order.shippingCity
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(', ') || '-';

export const formatLabel = value => {
  if (String(value || '').toLowerCase() === 'cancelled') {
    return 'Canceled';
  }

  return String(value || 'pending')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const isOrderCanceled = order => String(order && order.orderStatus || '').toLowerCase() === 'cancelled';

export const orderStatusBadgeClass = status => ({
  'profile-order__status-badge--danger': ['cancelled', 'delivery_failed'].includes(String(status || '').toLowerCase())
});

export const formatCancelActor = value => {
  const role = String(value || '').toLowerCase();

  if (role === 'admin') return 'Canceled by admin';
  if (role === 'user') return 'Canceled by you';
  return 'Canceled';
};

export const isTimelineCancellation = event => String(event && event.newStatus || '').toLowerCase() === 'cancelled';

export const formatCancelReason = note => {
  const value = String(note || '').trim();
  const normalized = value.toLowerCase().replace(/\.$/, '');

  if (normalized === 'delivery_failed' || normalized === 'package returned to warehouse after failed delivery') {
    return 'Delivery failed';
  }

  return value;
};

export const formatOrderTimelineTitle = event => {
  const status = String(event && event.newStatus || '').toLowerCase();
  const labels = {
    pending: 'Order pending',
    confirmed: 'Order confirmed',
    processing: 'Order is being processed',
    shipping: 'Order has been shipped',
    delivery_failed: 'Delivery failed',
    delivered: 'Order has been delivered',
    completed: 'Order completed',
    cancelled: 'Order cancelled'
  };

  return labels[status] || formatLabel(status || 'pending');
};

export const formatTimelineNote = event => {
  const note = String(event && event.note || '').trim();

  if (!note) return '';
  return isTimelineCancellation(event) ? `Reason: ${formatCancelReason(note)}` : note;
};

export const formatTimelineRole = value => {
  const event = value && typeof value === 'object' ? value : null;
  const role = String(event ? event.changedByRole : value || '').toLowerCase();
  const status = String(event && event.newStatus || '').toLowerCase();
  const note = String(event && event.note || '').trim().toLowerCase().replace(/\.$/, '');

  if (
    status === 'completed' &&
    role === 'user' &&
    note !== 'customer confirmed received'
  ) {
    return 'System action';
  }

  if (role === 'admin') return 'Admin action';
  if (role === 'user') return 'Customer action';
  if (role === 'system') return 'System action';
  return 'Order update';
};

export const formatPaymentLabel = (method, status) => {
  const paymentMethod = String(method || '').toLowerCase();
  const paymentStatus = String(status || '').toLowerCase();

  if (paymentMethod === 'bank_transfer') {
    return `Bank Transfer ${formatLabel(paymentStatus || 'pending_payment')}`;
  }

  if (paymentStatus === 'payment_cancelled') {
    return 'COD payment cancelled';
  }

  return paymentStatus === 'paid' ? 'COD paid' : 'Cash on Delivery';
};

export const formatPaymentMethod = method => {
  const paymentMethod = String(method || '').toLowerCase();

  if (paymentMethod === 'bank_transfer') {
    return 'Bank Transfer (QR Code)';
  }

  return 'Cash on Delivery';
};

export const formatAddress = address =>
  [
    address.addressLine,
    address.ward,
    address.district,
    address.city,
    address.country
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(', ');

export const formatShippingAddress = order =>
  [
    order.shippingAddressLine,
    order.shippingWard,
    order.shippingDistrict,
    order.shippingCity
  ]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
