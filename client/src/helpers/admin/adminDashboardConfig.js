// Admin dashboard config: route mapping, allowed tabs, default forms, and order action copy.
export const ALLOWED_SECTIONS = ['dashboard', 'orders', 'payments', 'requests', 'products', 'categories', 'collections', 'inventory', 'vouchers', 'accounts', 'notifications'];
export const ALLOWED_PRODUCT_MODES = ['products', 'stock', 'reviews'];
export const LEGACY_ADMIN_LOCATION_STORAGE_KEY = 'hem-admin-location';
export const ADMIN_PRODUCT_LIST_STATE_KEY = 'hem-admin-product-list-state';
export const ADMIN_LIST_STATE_KEYS = Object.freeze({
  products: ADMIN_PRODUCT_LIST_STATE_KEY,
  orders: 'hem-admin-order-list-state',
  payments: 'hem-admin-payment-list-state',
  requests: 'hem-admin-request-list-state',
  categories: 'hem-admin-category-list-state',
  collections: 'hem-admin-collection-list-state',
  vouchers: 'hem-admin-voucher-list-state',
  accounts: 'hem-admin-account-list-state'
});

export const readAdminListState = section => {
  if (typeof window === 'undefined') return {};

  const key = ADMIN_LIST_STATE_KEYS[String(section || '')];
  if (!key) return {};

  try {
    const value = JSON.parse(window.sessionStorage.getItem(key) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};

export const writeAdminListState = (section, state) => {
  if (typeof window === 'undefined') return;

  const key = ADMIN_LIST_STATE_KEYS[String(section || '')];
  if (!key) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(state || {}));
  } catch {
    // Keep navigation usable when session storage is unavailable.
  }
};

export const clearAdminListState = section => {
  if (typeof window === 'undefined') return;

  const key = ADMIN_LIST_STATE_KEYS[String(section || '')];
  if (!key) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Keep navigation usable when session storage is unavailable.
  }
};

export const readAdminProductListState = () => readAdminListState('products');

export const writeAdminProductListState = state => writeAdminListState('products', state);

export const clearAdminProductListState = () => clearAdminListState('products');

// Admin route map: keeps sidebar tab state synced with /studio URLs.
export const ADMIN_PATH_SECTIONS = {
  '/studio': 'dashboard',
  '/studio/products': 'products',
  '/studio/products/stock': 'products',
  '/studio/products/reviews': 'products',
  '/studio/orders': 'orders',
  '/studio/payments': 'payments',
  '/studio/requests': 'requests',
  '/studio/categories': 'categories',
  '/studio/collections': 'collections',
  '/studio/inventory': 'inventory',
  '/studio/vouchers': 'vouchers',
  '/studio/customers': 'accounts',
  '/studio/accounts': 'accounts',
  '/studio/notifications': 'notifications'
};

export const ADMIN_SECTION_ROUTES = {
  dashboard: '/studio',
  products: '/studio/products',
  orders: '/studio/orders',
  payments: '/studio/payments',
  requests: '/studio/requests',
  categories: '/studio/categories',
  collections: '/studio/collections',
  inventory: '/studio/inventory',
  vouchers: '/studio/vouchers',
  accounts: '/studio/customers',
  notifications: '/studio/notifications'
};

export const ADMIN_PRODUCT_MODE_ROUTES = {
  products: '/studio/products',
  stock: '/studio/products/stock',
  reviews: '/studio/products/reviews'
};

export const ADMIN_TITLE_SUFFIX = 'HEM. Studio';
export const ADMIN_SECTION_TITLES = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  payments: 'Payments',
  requests: 'Requests',
  products: 'Products',
  categories: 'Categories',
  collections: 'Collections',
  inventory: 'Inventory',
  vouchers: 'Vouchers',
  accounts: 'Accounts',
  notifications: 'Notifications'
};

export const ADMIN_SECTIONS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: '▦'
  },
  {
    key: 'orders',
    label: 'Orders',
    icon: '□'
  },
  {
    key: 'payments',
    label: 'Payments',
    icon: '◇'
  },
  {
    key: 'requests',
    label: 'Requests',
    icon: '!'
  },
  {
    key: 'products',
    label: 'Manage Product',
    icon: '▱'
  },
  {
    key: 'categories',
    label: 'Categories',
    icon: '◇'
  },
  {
    key: 'collections',
    label: 'Collections',
    icon: '◎'
  },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: '≡'
  },
  {
    key: 'vouchers',
    label: 'Vouchers',
    icon: '%'
  },
  {
    key: 'accounts',
    label: 'Accounts',
    icon: '○'
  }
];

// Default dashboard state: creates clean objects each time the admin page initializes.
export const DEFAULT_METRICS = () => ({
  products: 0,
  stockProducts: 0,
  categories: 0,
  lowStockProducts: 0,
  outOfStockProducts: 0,
  users: 0,
  admins: 0,
  orders: 0,
  completedOrders: 0,
  revenue: 0,
  refundRequests: 0,
  ordersTableReady: false
});

export const DEFAULT_ORDER_STATS = () => ({
  totalOrders: 0,
  pending: 0,
  confirmed: 0,
  processing: 0,
  shipping: 0,
  deliveryFailed: 0,
  delivered: 0,
  completed: 0,
  returnOrders: 0,
  cancelled: 0,
});

// Order action copy: controls confirm dialogs for status transitions.
export const ORDER_ACTIONS = {
  pending: {
    nextStatus: 'confirmed',
    label: 'Confirm Order',
    title: 'Confirm order?',
    message: 'This moves the order to confirmed. Payment status will stay managed by the system.'
  },
  confirmed: {
    nextStatus: 'processing',
    label: 'Start Processing',
    title: 'Start processing?',
    message: 'This moves the order to processing so the team can prepare fulfillment.'
  },
  processing: {
    nextStatus: 'shipping',
    label: 'Ship Order',
    title: 'Ship order?',
    message: 'This moves the order to shipping. Payment status will not be changed.'
  },
  shipping: {
    nextStatus: 'delivered',
    label: 'Mark as Delivered',
    title: 'Mark as delivered?',
    message: 'After this order is delivered, the customer will be able to confirm received.'
  },
  delivery_failed: {
    nextStatus: 'shipping',
    label: 'Retry Delivery',
    title: 'Retry delivery?',
    message: 'This moves the order back to shipping so the team can attempt delivery again.'
  }
};

export const ORDER_STATE_COPY = {
  delivery_failed: 'Waiting for package return',
  delivered: 'Waiting for customer confirmation',
  completed: 'Completed',
  cancelled: 'Cancelled'
};

// Empty admin forms: reset modals without reusing stale object references.
export const EMPTY_CATEGORY_FORM = () => ({
  id: '',
  name: '',
  label: '',
  slug: '',
  departmentId: '',
  productGroupId: '',
  status: 'active'
});

export const EMPTY_COLLECTION_FORM = () => ({
  id: '',
  name: '',
  slug: '',
  bannerImage: '',
  departments: {
    women: {
      enabled: true,
      departmentId: '',
      bannerImage: '',
      bannerPublicId: '',
      file: null,
      previewUrl: ''
    },
    men: {
      enabled: false,
      departmentId: '',
      bannerImage: '',
      bannerPublicId: '',
      file: null,
      previewUrl: ''
    }
  },
  status: 'active'
});

export const EMPTY_VOUCHER_FORM = () => ({
  id: '',
  code: '',
  discountType: 'percent',
  discountValue: 10,
  minOrderAmount: 0,
  maxDiscountAmount: '',
  startDate: '',
  endDate: '',
  usageLimit: '',
  status: 'active'
});

export const resolveInitialProductMode = route => {
  const routeMode = String(route.meta && route.meta.adminProductMode || '').trim();

  if (ALLOWED_PRODUCT_MODES.includes(routeMode)) {
    return routeMode;
  }

  if (route.path === '/studio/products/stock') return 'stock';
  if (route.path === '/studio/products/reviews') return 'reviews';
  return 'products';
};

export const resolveInitialSection = route => {
  const routeSection = String(route.meta && route.meta.adminSection || '').trim();

  if (ALLOWED_SECTIONS.includes(routeSection)) {
    return routeSection;
  }

  return ADMIN_PATH_SECTIONS[route.path] || 'dashboard';
};
