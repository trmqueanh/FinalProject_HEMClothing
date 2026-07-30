import { catalogStore } from '../stores/catalogStore';

export const DEFAULT_TITLE = 'HEM. Atelier';
export const TITLE_SUFFIX = 'HEM. Atelier';
export const ADMIN_TITLE_SUFFIX = 'HEM. Studio';

const formatTitleLabel = value =>
  String(value || '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const departmentFromRoute = route => (route.path.startsWith('/men') ? 'men' : 'women');
const departmentTitle = department => (department === 'men' ? 'Men' : 'Women');
const SPECIAL_PAGE_TITLES = {
  'new-arrivals': 'New Arrivals',
  bestsellers: 'Bestsellers',
  'best-sellers': 'Best Sellers',
  sale: 'Sale'
};

// Builds storefront titles from the same path-first page identity used by Shop.vue.
export const shopTitle = async route => {
  const department = departmentFromRoute(route);
  const departmentLabel = departmentTitle(department);
  const pageType = String((route.meta && route.meta.pageType) || '');
  const categoryParam = String((route.params && route.params.categorySlug) || '').trim();
  const searchQuery = String((route.query && route.query.q) || '').trim();

  if (searchQuery) {
    return `Search ${departmentLabel} | ${TITLE_SUFFIX}`;
  }

  if ((pageType === 'category' || pageType === 'product-group-category') && categoryParam) {
    const categories = await catalogStore.getDepartmentCategories(department);
    const matchedCategory = (Array.isArray(categories) ? categories : []).find(category =>
      [category.slug, category.name, category.label]
        .map(value => String(value || '').trim().toLowerCase())
        .includes(categoryParam.toLowerCase())
    );
    const categoryLabel = matchedCategory
      ? matchedCategory.label || formatTitleLabel(matchedCategory.name || matchedCategory.slug)
      : formatTitleLabel(categoryParam);

    return `${categoryLabel} ${departmentLabel} | ${TITLE_SUFFIX}`;
  }

  if (pageType === 'special') {
    const pageLabel = SPECIAL_PAGE_TITLES[String((route.meta && route.meta.pageKey) || '')] || 'Products';
    return `${pageLabel} ${departmentLabel} | ${TITLE_SUFFIX}`;
  }

  if (pageType === 'collection') {
    const collectionSlug = String((route.params && route.params.collectionSlug) || '').trim();
    const collections = await catalogStore.getCollections();
    const matchedCollection = (Array.isArray(collections) ? collections : []).find(collection =>
      [collection.slug, collection.name, collection.label]
        .map(value => String(value || '').trim().toLowerCase())
        .includes(collectionSlug.toLowerCase())
    );
    const collectionLabel = matchedCollection
      ? matchedCollection.label || matchedCollection.name
      : formatTitleLabel(collectionSlug);

    if (route.meta && route.meta.globalCollection) {
      return `${collectionLabel} | ${TITLE_SUFFIX}`;
    }

    return `${collectionLabel} ${departmentLabel} | ${TITLE_SUFFIX}`;
  }

  if (pageType === 'all-products') {
    return `All Products ${departmentLabel} | ${TITLE_SUFFIX}`;
  }

  return `${departmentLabel} | ${TITLE_SUFFIX}`;
};

export const productTitle = async route => {
  const product = await catalogStore.getProduct(route.params.id);
  return product && product.name ? `${product.name} | ${TITLE_SUFFIX}` : `Product | ${TITLE_SUFFIX}`;
};

export const adminStudioTitle = route =>
  `${route.meta && route.meta.adminTitle ? route.meta.adminTitle : 'Dashboard'} | ${ADMIN_TITLE_SUFFIX}`;

export const resolveRouteTitle = async route => {
  const title = route.meta && route.meta.title;
  return typeof title === 'function' ? title(route) : title || DEFAULT_TITLE;
};
