const ALL_PRODUCTS_SEGMENT = 'all-products';
const PRODUCT_GROUP_SEGMENTS = new Set(['clothing', 'shoes', 'accessories']);
const LEGACY_VIEW_SEGMENTS = {
  new: 'new-arrivals',
  best: 'best-sellers',
  sale: 'sale'
};
const SPECIAL_SEGMENT_TO_VIEW = {
  'new-arrivals': 'new',
  bestsellers: 'best',
  'best-sellers': 'best'
};
const LISTING_FILTER_KEYS = ['q', 'category', 'fit', 'color', 'size', 'minPrice', 'maxPrice', 'sort', 'page'];

const ADMIN_LEGACY_SECTION_PATHS = {
  dashboard: '/studio',
  products: '/studio/products',
  orders: '/studio/orders',
  categories: '/studio/categories',
  collections: '/studio/collections',
  inventory: '/studio/inventory',
  vouchers: '/studio/vouchers',
  accounts: '/studio/customers',
  customers: '/studio/customers'
};

const ADMIN_LEGACY_PRODUCT_VIEW_PATHS = {
  products: '/studio/products',
  stock: '/studio/products/stock',
  reviews: '/studio/products/reviews'
};

// Converts old view/collection query URLs into first-class listing routes.
export const legacyStorefrontRedirect = route => {
  const department = route.path.startsWith('/men') ? 'men' : route.path.startsWith('/women') ? 'women' : '';
  const pageType = String((route.meta && route.meta.pageType) || '');

  if (!department || pageType === 'product') {
    return null;
  }

  const basePath = `/${department}`;
  const nextQuery = { ...route.query };
  const legacyView = String(nextQuery.view || '').trim();
  const legacyCollection = String(nextQuery.collection || '').trim();
  const productGroupSlug = String((route.params && route.params.productGroupSlug) || '').trim();
  const categorySlug = String((route.params && route.params.categorySlug) || '').trim();
  const currentSegment = String(route.path || '').split('/').filter(Boolean)[1] || '';
  let nextPath = route.path;

  const isProductGroupPath =
    PRODUCT_GROUP_SEGMENTS.has(productGroupSlug) ||
    (pageType === 'category' && PRODUCT_GROUP_SEGMENTS.has(categorySlug));
  const isGroupScopedView = Boolean(legacyView && isProductGroupPath);
  const specialGroupView = SPECIAL_SEGMENT_TO_VIEW[currentSegment];
  const specialCategorySlug = String(nextQuery.category || '').trim();

  if (specialGroupView && PRODUCT_GROUP_SEGMENTS.has(specialCategorySlug)) {
    delete nextQuery.category;
    return {
      path: `${basePath}/${encodeURIComponent(specialCategorySlug)}`,
      query: {
        ...nextQuery,
        view: specialGroupView
      },
      replace: true
    };
  }

  if (isGroupScopedView) {
    return null;
  }

  delete nextQuery.view;
  delete nextQuery.collection;

  if (legacyView) {
    const specialSegment = LEGACY_VIEW_SEGMENTS[legacyView];

    if (specialSegment) {
      nextPath = `${basePath}/${specialSegment}`;
      if (categorySlug && !nextQuery.category) nextQuery.category = categorySlug;
    } else if (legacyView === 'all') {
      nextPath = categorySlug ? `${basePath}/${encodeURIComponent(categorySlug)}` : `${basePath}/${ALL_PRODUCTS_SEGMENT}`;
    } else {
      nextPath = pageType === 'landing' ? `${basePath}/${ALL_PRODUCTS_SEGMENT}` : route.path;
    }
  } else if (legacyCollection && pageType !== 'special') {
    nextPath = `${basePath}/collections/${encodeURIComponent(legacyCollection)}`;
    if (categorySlug && !nextQuery.category) nextQuery.category = categorySlug;
  } else if (pageType === 'landing' && LISTING_FILTER_KEYS.some(key => nextQuery[key] !== undefined)) {
    const queryCategory = String(nextQuery.category || '').trim();

    if (queryCategory) {
      nextPath = `${basePath}/${encodeURIComponent(queryCategory)}`;
      delete nextQuery.category;
    } else {
      nextPath = `${basePath}/${ALL_PRODUCTS_SEGMENT}`;
    }
  } else if (pageType === 'all-products' && nextQuery.category) {
    nextPath = `${basePath}/${encodeURIComponent(String(nextQuery.category))}`;
    delete nextQuery.category;
  } else if (pageType === 'category' && nextQuery.category) {
    delete nextQuery.category;
  }

  if (nextPath === route.path && JSON.stringify(route.query || {}) === JSON.stringify(nextQuery)) {
    return null;
  }

  return { path: nextPath, query: nextQuery, replace: true };
};

export const legacyAdminRedirect = route => {
  if (!route.path.startsWith('/studio') || !route.query) return null;

  const legacySection = String(route.query.section || '').trim();
  const legacyView = String(route.query.view || '').trim();

  if (!legacySection && !legacyView) return null;

  const nextQuery = { ...route.query };
  delete nextQuery.section;
  delete nextQuery.view;

  let nextPath = route.path;
  if (legacySection === 'products') {
    nextPath = ADMIN_LEGACY_PRODUCT_VIEW_PATHS[legacyView] || ADMIN_LEGACY_SECTION_PATHS.products;
  } else if (legacySection) {
    nextPath = ADMIN_LEGACY_SECTION_PATHS[legacySection] || '/studio';
  } else if (legacyView) {
    nextPath = ADMIN_LEGACY_PRODUCT_VIEW_PATHS[legacyView] || ADMIN_LEGACY_SECTION_PATHS.products;
  }

  return { path: nextPath, query: nextQuery, replace: true };
};
