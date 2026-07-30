import { ALL_PRODUCTS_SEGMENT, BROWSE_VIEW_TO_GROUP, PRODUCT_GROUP_SLUGS, SPECIAL_PAGE_CONFIG } from './shopPageConfig';

const PRODUCT_GROUP_SEGMENTS = new Set(PRODUCT_GROUP_SLUGS);
const routeBrowseView = params => {
  const view = String(params.get('view') || '').trim();
  return BROWSE_VIEW_TO_GROUP[view] ? view : 'all';
};

// Shop route parser: reads page identity from the path before reading filter query.
export const routeContextFromPath = fullPath => {
  const [path = '', queryString = ''] = String(fullPath || '').split('?');
  const params = new URLSearchParams(queryString);
  const pathParts = path.split('/').filter(Boolean);
  const rootSegment = pathParts[0] ? decodeURIComponent(pathParts[0]) : '';
  const isDepartmentRoute = rootSegment === 'men' || rootSegment === 'women';
  const primarySegment = isDepartmentRoute && pathParts[1] ? decodeURIComponent(pathParts[1]) : '';
  const secondarySegment = isDepartmentRoute && pathParts[2] ? decodeURIComponent(pathParts[2]) : '';
  const specialPage = SPECIAL_PAGE_CONFIG[primarySegment] || null;
  let pageType = 'landing';
  let pageKey = '';
  let browseView = 'landing';
  let category = 'All';
  let collection = 'All';
  let productGroup = 'All';

  if (rootSegment === 'sale') {
    pageType = 'sale';
    pageKey = 'sale';
    browseView = 'sale';
    productGroup = params.get('group') || 'All';
    category = params.get('category') || 'All';
  } else if (rootSegment === 'collections') {
    if (pathParts[1]) {
      pageType = 'collection';
      pageKey = decodeURIComponent(pathParts[1]);
      browseView = 'all';
      category = params.get('category') || 'All';
      collection = pageKey;
      productGroup = params.get('group') || 'All';
    } else {
      pageType = 'collections';
      pageKey = 'collections';
      browseView = 'all';
    }
  } else if (specialPage) {
    pageType = 'special';
    pageKey = primarySegment;
    browseView = specialPage.browseView;
    category = params.get('category') || 'All';
  } else if (primarySegment === 'collections' && secondarySegment) {
    pageType = 'collection';
    pageKey = secondarySegment;
    browseView = 'all';
    category = params.get('category') || 'All';
    collection = secondarySegment;
    productGroup = params.get('group') || 'All';
  } else if (primarySegment === ALL_PRODUCTS_SEGMENT) {
    pageType = 'all-products';
    pageKey = ALL_PRODUCTS_SEGMENT;
    browseView = 'all';
  } else if (primarySegment && secondarySegment) {
    pageType = 'product-group-category';
    pageKey = secondarySegment;
    browseView = routeBrowseView(params);
    productGroup = primarySegment;
    category = secondarySegment;
  } else if (PRODUCT_GROUP_SEGMENTS.has(primarySegment)) {
    pageType = 'product-group';
    pageKey = primarySegment;
    browseView = routeBrowseView(params);
    productGroup = primarySegment;
  } else if (primarySegment) {
    pageType = 'category';
    pageKey = primarySegment;
    browseView = 'all';
    category = primarySegment;
  }

  return {
    department: rootSegment === 'sale'
      ? params.get('department') || 'All'
      : path.startsWith('/men') ? 'men' : 'women',
    pageType,
    pageKey,
    browseView,
    productGroup,
    category,
    collection,
    fit: params.get('fit') || 'All',
    q: params.get('q') || ''
  };
};

// Shop route reset check: tells Shop.vue when page identity changed enough to close filters.
export const shouldResetFiltersForRoute = (previousPath, nextPath) => {
  if (!previousPath) {
    return false;
  }

  const previousContext = routeContextFromPath(previousPath);
  const nextContext = routeContextFromPath(nextPath);

  return (
    previousContext.department !== nextContext.department ||
    previousContext.pageType !== nextContext.pageType ||
    previousContext.pageKey !== nextContext.pageKey ||
    previousContext.browseView !== nextContext.browseView ||
    previousContext.productGroup !== nextContext.productGroup ||
    previousContext.category !== nextContext.category ||
    previousContext.fit !== nextContext.fit ||
    previousContext.q !== nextContext.q
  );
};
