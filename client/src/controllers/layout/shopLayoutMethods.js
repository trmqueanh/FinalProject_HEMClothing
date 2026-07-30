// Các action của ShopLayout.vue được tách khỏi view để dễ theo dõi và debug.
import { catalogStore } from '../../stores/catalogStore';
import { hasComparePrice, itemComparePrice, itemPriceTone, priceLabel } from '../../helpers/cart/cartItemHelpers';
import { formatVietnamDate } from '../../helpers/dateTime';
import { shouldDisplaySize } from '../../helpers/sizes';
import { normalizeSearchText } from '../../helpers/shop/shopLayoutSearch';
import { categoryRouteSlug, mergeProductGroups, slugifyRouteSegment } from '../../helpers/shop/shopPageConfig';
import { expandProductsToColorCards, isListingSaleCard } from '../../helpers/shop/listingColorCards';
import { searchApi } from '../../services/searchApi';
import { formatCurrency } from '../../utils/formatCurrency';
import { clearFavoriteNotice } from '../../stores/favoriteNoticeStore';
import { shopLayoutAuthMethods } from './shopLayoutAuthMethods';

const FEATURED_LINKS = [
  { key: 'new', label: 'New Arrivals' },
  { key: 'best', label: 'Bestsellers' }
];
const NAV_MENU_KEYS = new Set(['men', 'women', 'sale', 'collections']);
const DEPARTMENT_FEATURE_SEGMENTS = {
  new: 'new-arrivals',
  best: 'bestsellers',
  sale: 'sale',
  all: 'all-products'
};
const SHOP_PAGE_TYPES = new Set([
  'landing',
  'all-products',
  'special',
  'collection',
  'product-group-category',
  'category',
  'sale'
]);
const normalizeDepartmentName = department => (department === 'men' ? 'men' : 'women');
const departmentLabel = department => (normalizeDepartmentName(department) === 'men' ? 'Men' : 'Women');
const normalizeCatalogValue = value => normalizeSearchText(String(value || '').replace(/[-_]+/g, ' '));
const SEARCH_HISTORY_STORAGE_KEY = 'hem.searchHistory';
const SEARCH_PREVIEW_DEBOUNCE_MS = 35;

const createSearchHistoryItem = keyword => ({
  id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  keyword,
  createdAt: new Date().toISOString()
});

const readLocalSearchHistory = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY) || '[]');

    return (Array.isArray(parsed) ? parsed : [])
      .filter(entry => entry && String(entry.keyword || '').trim())
      .map(entry => ({
        id: entry.id || `local-${normalizeSearchText(entry.keyword)}`,
        keyword: String(entry.keyword || '').trim(),
        createdAt: entry.createdAt || new Date().toISOString()
      }))
      .slice(0, 12);
  } catch {
    return [];
  }
};

const writeLocalSearchHistory = items => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify((Array.isArray(items) ? items : []).slice(0, 12)));
  } catch {
    // localStorage can be unavailable in private or restricted browser contexts.
  }
};

const productPopularityScore = product => {
  const soldCount = Number(product && (product.soldCount ?? product.sold_count) || 0);
  const reviewCount = Number(product && (product.reviewCount ?? product.review_count ?? product.reviews) || 0);
  const rating = Number(product && product.rating || 0);
  const isBestSeller = Boolean(product && (product.isBestseller || product.is_bestseller)) || soldCount > 0;
  const isSale = Boolean(product && (product.isSale || product.is_sale)) ||
    String(product && (product.pricingMode || product.pricing_mode || product.listingPricingMode || product.listing_pricing_mode) || '').toLowerCase() === 'sale';

  return (
    (isBestSeller ? 5000 : 0) +
    (isSale ? 420 : 0) +
    Math.min(Math.max(soldCount, 0), 2000) +
    Math.min(Math.max(reviewCount, 0), 1200) * 0.45 +
    (Number.isFinite(rating) ? rating * 60 : 0)
  );
};

const productCollectionLabel = product =>
  String(product && (
    product.collectionLabel ||
    product.collection_label ||
    product.collection ||
    product.collectionName ||
    product.collection_name ||
    ''
  ) || '').trim();

const productSaleDiscountPercent = product => {
  const explicitDiscount = Number(
    product && (
      product.saleDiscountPercent ??
      product.sale_discount_percent ??
      product.discountPercent ??
      product.discount_percent
    )
  );

  if (Number.isFinite(explicitDiscount) && explicitDiscount > 0) {
    return explicitDiscount;
  }

  const comparePrice = Number(
    product && (
      product.listingComparePrice ??
      product.listing_compare_price ??
      product.originalPrice ??
      product.original_price ??
      product.comparePrice ??
      product.compare_price
    )
  );
  const salePrice = Number(
    product && (
      product.listingPrice ??
      product.listing_price ??
      product.salePrice ??
      product.sale_price ??
      product.price
    )
  );

  if (!Number.isFinite(comparePrice) || !Number.isFinite(salePrice) || comparePrice <= 0 || salePrice <= 0 || salePrice >= comparePrice) {
    return 0;
  }

  return ((comparePrice - salePrice) / comparePrice) * 100;
};

export const shopLayoutMethods = {
    ...shopLayoutAuthMethods,
    formatCurrency,
    cartItemPrice(item) {
      const price = Number(item && (item.price ?? item.productPrice ?? item.unitPrice ?? 0));
      return Number.isFinite(price) ? price : 0;
    },
    cartItemPriceLabel: priceLabel,
    cartItemComparePrice: itemComparePrice,
    cartItemHasComparePrice: hasComparePrice,
    itemPriceTone,
    cartItemVariantLabel(item) {
      const size = String(item && (item.size || item.sizeLabel || item.size_label || '')).trim();
      const color = String(item && (item.color || item.colorName || item.color_name || '')).trim() || 'Default';

      return shouldDisplaySize(size) ? `${color} · ${size}` : color;
    },
    currentStorePath() {
      return this.activeDepartment === 'men' ? '/men' : '/women';
    },
    shouldHighlightDepartment(department) {
      if (this.isStandaloneCustomerPage) return false;
      const menuKey = String(department || '').toLowerCase();

      if (this.hoveredDepartment) {
        return this.hoveredDepartment === menuKey;
      }

      const pageKey = String((this.$route.meta && this.$route.meta.pageKey) || '');
      if (menuKey === 'sale') return this.$route.path === '/sale' || pageKey === 'sale';
      if (menuKey === 'collections') return this.$route.path === '/collections' || this.$route.path.startsWith('/collections/');
      if (menuKey === 'men' || menuKey === 'women') {
        const isGlobalCollectionRoute = this.$route.path === '/collections' || this.$route.path.startsWith('/collections/');

        return (
          !isGlobalCollectionRoute &&
          this.activeDepartment === menuKey &&
          pageKey !== 'sale'
        );
      }

      return false;
    },
    handleSearchInput(event) {
      this.searchQuery = String(event && event.target ? event.target.value : '');
      if (!this.isSearchComposing) this.scheduleSearchPreview();
    },
    handleSearchCompositionStart() {
      this.isSearchComposing = true;
      if (this.searchPreviewTimer) clearTimeout(this.searchPreviewTimer);
    },
    handleSearchComposition(event) {
      this.searchQuery = String(event && event.target ? event.target.value : '');
    },
    handleSearchCompositionEnd(event) {
      this.isSearchComposing = false;
      this.searchQuery = String(event && event.target ? event.target.value : '');
      this.scheduleSearchPreview();
    },
    scheduleSearchPreview() {
      if (this.searchPreviewTimer) clearTimeout(this.searchPreviewTimer);
      this.searchPreviewTimer = setTimeout(() => {
        this.searchPreviewQuery = this.searchQuery;
        this.searchPreviewTimer = null;
      }, SEARCH_PREVIEW_DEBOUNCE_MS);
    },
    departmentCategories(department) {
      if (department !== 'men' && department !== 'women') return [];
      const normalizedDepartment = normalizeDepartmentName(department);
      const departmentRecord = this.navDepartments.find(item => item.name === normalizedDepartment);
      return departmentRecord && Array.isArray(departmentRecord.categories) ? departmentRecord.categories : [];
    },
    departmentProductGroups(department) {
      if (department !== 'men' && department !== 'women') return [];
      const normalizedDepartment = normalizeDepartmentName(department);
      const departmentRecord = this.navDepartments.find(item => item.name === normalizedDepartment);
      return mergeProductGroups(
        normalizedDepartment,
        departmentRecord && Array.isArray(departmentRecord.groups) ? departmentRecord.groups : [],
        departmentRecord && Array.isArray(departmentRecord.categories) ? departmentRecord.categories : []
      );
    },
    categoryQueryValue(category) {
      if (!category || typeof category !== 'object') {
        return String(category || '');
      }

      return String(category.slug || category.name || '').trim();
    },
    productGroupQueryValue(group) {
      if (!group || typeof group !== 'object') {
        return String(group || '');
      }

      return slugifyRouteSegment(group.slug || group.name || group.label || '');
    },
    formatCategoryLabel(value) {
      return String(value || '')
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(token => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ');
    },
    routeQueryWithoutAuth() {
      const nextQuery = { ...this.$route.query };
      delete nextQuery.auth;
      delete nextQuery.redirect;
      return nextQuery;
    },
    routeViewKey(route) {
      if (String(route && route.path || '').startsWith('/profile')) {
        return 'profile';
      }

      if (String(route && route.meta && route.meta.pageType || '') === 'search') {
        return 'search-page';
      }

      if (SHOP_PAGE_TYPES.has(String(route && route.meta && route.meta.pageType || ''))) {
        return 'shop-page';
      }

      const query = { ...(route && route.query) };
      delete query.auth;
      delete query.redirect;

      const serializedQuery = Object.keys(query)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
        .join('&');

      return serializedQuery ? `${route.path}?${serializedQuery}` : route.path;
    },
    syncSearchFromRoute() {
      this.searchQuery = this.currentRouteSearchQuery;
      this.searchPreviewQuery = this.searchQuery;
    },
    departmentRoute(department) {
      const menuKey = String(department || '').toLowerCase();
      if (menuKey === 'men' || menuKey === 'women') return `/${menuKey}`;
      if (menuKey === 'sale') return { path: '/sale', query: { department: this.activeDepartment } };
      if (menuKey === 'collections') return { path: '/collections', query: { department: this.activeDepartment } };
      return this.currentStorePath();
    },
    departmentFeatureRoute(department, view) {
      const basePath = normalizeDepartmentName(department) === 'men' ? '/men' : '/women';
      const segment = DEPARTMENT_FEATURE_SEGMENTS[view] || 'all-products';
      return {
        path: `${basePath}/${segment}`
      };
    },
    departmentCategoryRoute(department, category) {
      const normalizedDepartment = normalizeDepartmentName(department);
      const categorySlug = categoryRouteSlug(normalizedDepartment, category || this.categoryQueryValue(category));
      const groupSlug = slugifyRouteSegment(
        category && typeof category === 'object'
          ? category.productGroupSlug || category.product_group_slug || category.productGroup || category.product_group || ''
          : ''
      );
      const basePath = normalizedDepartment === 'men' ? '/men' : '/women';

      return {
        path: groupSlug
          ? `${basePath}/${encodeURIComponent(groupSlug)}/${encodeURIComponent(categorySlug)}`
          : `${basePath}/${encodeURIComponent(categorySlug)}`
      };
    },
    departmentProductGroupRoute(department, group) {
      const normalizedDepartment = normalizeDepartmentName(department);
      const groupSlug = this.productGroupQueryValue(group);

      return {
        path: `${normalizedDepartment === 'men' ? '/men' : '/women'}/${encodeURIComponent(groupSlug)}`
      };
    },
    departmentProductGroupFeatureRoute(department, group, view) {
      const route = this.departmentProductGroupRoute(department, group);
      const normalizedView = String(view || '').trim();

      return {
        ...route,
        query: normalizedView ? { view: normalizedView } : {}
      };
    },
    departmentCollectionRoute(department, collection) {
      const collectionSlug = String((collection && (collection.slug || collection.name)) || '').trim();
      const normalizedDepartment = normalizeDepartmentName(department || this.activeDepartment);

      return {
        path: `/collections/${encodeURIComponent(collectionSlug)}`,
        query: { department: normalizedDepartment }
      };
    },
    departmentShortcutLinks(department) {
      const normalizedDepartment = normalizeDepartmentName(department);
      return FEATURED_LINKS.map(link => ({
        ...link,
        route: this.departmentFeatureRoute(normalizedDepartment, link.key)
      }));
    },
    departmentMenuCategoryLinks(department) {
      const normalizedDepartment = normalizeDepartmentName(department);
      return this.departmentCategories(normalizedDepartment).map(category => ({
        key: `${normalizedDepartment}-category-${category.id || category.slug || category.name}`,
        label: category.label || this.formatCategoryLabel(category.name),
        route: this.departmentCategoryRoute(normalizedDepartment, category)
      }));
    },
    departmentMenuCollectionLinks(department) {
      const normalizedDepartment = normalizeDepartmentName(department);
      return this.navCollections.map(collection => ({
        key: `${normalizedDepartment}-collection-${collection.id || collection.slug || collection.name}`,
        label: collection.label || collection.name,
        route: this.departmentCollectionRoute(normalizedDepartment, collection)
      }));
    },
    saleRoute(department = '', group = '') {
      const query = this.$route && this.$route.path === '/sale'
        ? { ...this.$route.query }
        : {};
      const normalizedDepartment = String(department || '').toLowerCase();
      const groupSlug = String(group || '').trim();

      if (normalizedDepartment === 'men' || normalizedDepartment === 'women') {
        query.department = normalizedDepartment;
      } else {
        delete query.department;
      }

      if (groupSlug) {
        query.group = groupSlug;
      } else {
        delete query.group;
      }

      return {
        path: '/sale',
        query
      };
    },
    saleProductGroupLinks(department) {
      const normalizedDepartment = normalizeDepartmentName(department);
      const departmentLabel = normalizedDepartment === 'men' ? 'Men' : 'Women';
      const allSaleLink = {
        key: `sale-${normalizedDepartment}-all`,
        label: `All Sale ${departmentLabel}`,
        route: this.saleRoute(normalizedDepartment)
      };
      const groupLinks = this.departmentProductGroups(normalizedDepartment).map(group => ({
        key: `sale-${normalizedDepartment}-${group.slug || group.name}`,
        label: `All Sale ${group.label || this.formatCategoryLabel(group.name)}`,
        route: this.saleRoute(normalizedDepartment, group.slug || group.name)
      }));

      return [allSaleLink, ...groupLinks];
    },
    withMegaMenuProductTag(product, tagLabel) {
      return {
        ...product,
        megaMenuTag: String(tagLabel || '').trim()
      };
    },
    megaMenuProductShelf(menuKey, activeShelfScope = '') {
      const normalizedMenuKey = String(menuKey || '').toLowerCase();
      const shelfScope = activeShelfScope && typeof activeShelfScope === 'object'
        ? activeShelfScope
        : { type: '', value: activeShelfScope };
      const normalizedShelfScope = normalizeCatalogValue(
        shelfScope.value || shelfScope.groupSlug || shelfScope.collection || shelfScope.department || ''
      );
      const products = Array.isArray(this.searchProducts) ? this.searchProducts : [];

      if (!products.length) {
        return { title: '', products: [] };
      }

      const uniqueProducts = items => {
        const seen = new Set();
        return items.filter(product => {
          const key = String(product && (product.listingKey || product.favoriteKey || product.id || product.slug || product.name) || '').trim();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };
      const rankedProducts = items => uniqueProducts(expandProductsToColorCards(items))
        .sort((left, right) => productPopularityScore(right) - productPopularityScore(left))
        .slice(0, 12);
      const rankedSaleProducts = items => uniqueProducts(expandProductsToColorCards(items).filter(isListingSaleCard))
        .sort((left, right) => {
          const discountDelta = productSaleDiscountPercent(right) - productSaleDiscountPercent(left);
          if (Math.abs(discountDelta) > 0.001) return discountDelta;
          return productPopularityScore(right) - productPopularityScore(left);
        })
        .slice(0, 9);

      if (normalizedMenuKey === 'men' || normalizedMenuKey === 'women') {
        const department = normalizedMenuKey;
        const departmentProducts = products.filter(product => normalizeDepartmentName(product && product.gender) === department);
        const groupProducts = shelfScope.type === 'product-group' && normalizedShelfScope
          ? departmentProducts.filter(product => [
            product && product.productGroupSlug,
            product && product.productGroup,
            product && product.productGroupLabel
          ].some(value => normalizeCatalogValue(value) === normalizedShelfScope))
          : departmentProducts;

        return {
          title: shelfScope.type === 'product-group' && shelfScope.groupLabel
            ? `${departmentLabel(department)} · ${shelfScope.groupLabel}`
            : `Popular ${departmentLabel(department)}`,
          products: rankedProducts(groupProducts)
        };
      }

      if (normalizedMenuKey === 'collections') {
        const collectionLookup = new Map(
          (Array.isArray(this.navCollections) ? this.navCollections : []).flatMap(collection => {
            const label = String(collection && (collection.label || collection.name || collection.slug) || '').trim();
            const values = [
              collection && collection.slug,
              collection && collection.name,
              collection && collection.label
            ]
              .map(normalizeCatalogValue)
              .filter(Boolean);

            return values.map(value => [value, label]);
          })
        );
        const collectionKeyForProduct = product => normalizeCatalogValue(
          product.collectionSlug ||
          product.collection_slug ||
          product.collection ||
          product.collectionName ||
          product.collection_name
        );
        const taggedProducts = products
          .filter(product => productCollectionLabel(product))
          .map(product => {
            const collectionKey = collectionKeyForProduct(product);
            const tagLabel = collectionLookup.get(collectionKey) || productCollectionLabel(product);
            return this.withMegaMenuProductTag(product, tagLabel);
          });
        const availableCollectionLabels = [
          ...(Array.isArray(this.navCollections) ? this.navCollections : []).map(collection =>
            String(collection && (collection.label || collection.name || collection.slug) || '').trim()
          ),
          ...taggedProducts.map(product => String(product && product.megaMenuTag || productCollectionLabel(product)).trim())
        ].filter(Boolean);
        const selectedCollectionLabel = shelfScope.type === 'collection' && normalizedShelfScope
          ? String(shelfScope.collectionLabel || shelfScope.value || '').trim()
          : availableCollectionLabels.find(label => taggedProducts.some(product =>
            normalizeCatalogValue(product && product.megaMenuTag || productCollectionLabel(product)) === normalizeCatalogValue(label)
          )) || '';
        const selectedCollectionProducts = taggedProducts.filter(product =>
          normalizeCatalogValue(product && product.megaMenuTag || productCollectionLabel(product)) === normalizeCatalogValue(selectedCollectionLabel)
        );
        const collectionGroups = ['men', 'women']
          .map(department => ({
            key: `collection-${normalizeCatalogValue(selectedCollectionLabel)}-${department}`,
            title: `${selectedCollectionLabel} · ${departmentLabel(department)}`,
            products: rankedProducts(
              selectedCollectionProducts.filter(product => normalizeDepartmentName(product && product.gender) === department)
            ).slice(0, 5)
          }))
          .filter(group => group.products.length);

        return {
          title: 'Hot Collections',
          products: rankedProducts(selectedCollectionProducts),
          groups: collectionGroups
        };
      }

      if (normalizedMenuKey === 'sale') {
        const saleProducts = products;
        const saleProductsForDepartment = department =>
          rankedSaleProducts(saleProducts.filter(product => normalizeDepartmentName(product && product.gender) === department));
        const selectedSaleDepartment = shelfScope.type === 'department' && ['men', 'women'].includes(
          String(shelfScope.department || '').toLowerCase()
        )
          ? String(shelfScope.department).toLowerCase()
          : '';
        const saleDepartments = selectedSaleDepartment
          ? [selectedSaleDepartment]
          : ['men', 'women'];

        return {
          title: 'Hot Sale',
          products: rankedSaleProducts(saleProducts),
          groups: saleDepartments
            .map(department => ({
              key: `sale-${department}`,
              title: departmentLabel(department),
              products: saleProductsForDepartment(department).slice(0, 5)
            }))
            .filter(group => group.products.length)
        };
      }

      return { title: '', products: [] };
    },
    megaMenuSections(menuKey) {
      const normalizedMenuKey = String(menuKey || '').toLowerCase();

      if (normalizedMenuKey === 'collections') {
        return [
          {
            key: 'collections-main',
            title: 'Collections',
            route: { path: '/collections' },
            links: this.navCollections.map(collection => ({
              key: `collection-${collection.id || collection.slug || collection.name}`,
              label: collection.label || collection.name,
              route: this.departmentCollectionRoute(this.activeDepartment, collection),
              shelfScope: {
                type: 'collection',
                value: collection.slug || collection.name || collection.label,
                collectionLabel: collection.label || collection.name || collection.slug
              }
            })),
            emptyText: 'No collections available yet.'
          }
        ];
      }

      if (normalizedMenuKey === 'sale') {
        return [
          {
            key: 'women-sale',
            title: 'Women',
            shelfScope: { type: 'department', department: 'women' },
            links: this.saleProductGroupLinks('women')
          },
          {
            key: 'men-sale',
            title: 'Men',
            shelfScope: { type: 'department', department: 'men' },
            links: this.saleProductGroupLinks('men')
          }
        ];
      }

      if (normalizedMenuKey === 'men' || normalizedMenuKey === 'women') {
        const department = normalizedMenuKey;
        const productGroups = this.departmentProductGroups(department).filter(
          group => Array.isArray(group.categories) && group.categories.length
        );

        if (productGroups.length) {
          return productGroups.map(group => ({
              key: `${department}-group-${group.id || group.slug || group.name}`,
              title: group.label || this.formatCategoryLabel(group.name),
              route: this.departmentProductGroupRoute(department, group),
              shelfScope: {
                type: 'product-group',
                department,
                groupSlug: group.slug || group.name,
                groupLabel: group.label || this.formatCategoryLabel(group.name)
              },
              links: [
                {
                  key: `${department}-group-${group.slug || group.name}-all`,
                  label: `All ${group.label || this.formatCategoryLabel(group.name)}`,
                  route: this.departmentProductGroupRoute(department, group)
                },
                {
                  key: `${department}-group-${group.slug || group.name}-new`,
                  label: 'New Arrivals',
                  route: this.departmentProductGroupFeatureRoute(department, group, 'new')
                },
                {
                  key: `${department}-group-${group.slug || group.name}-best`,
                  label: 'Bestsellers',
                  route: this.departmentProductGroupFeatureRoute(department, group, 'best')
                },
                ...group.categories.map(category => ({
                  key: `${department}-group-${group.id || group.slug || group.name}-category-${category.id || category.slug || category.name}`,
                  label: category.label || this.formatCategoryLabel(category.name),
                  route: this.departmentCategoryRoute(department, category)
                }))
              ],
              emptyText: 'No categories available yet.'
            }));
        }

        return [
          {
            key: `${department}-categories`,
            title: 'Categories',
            links: this.departmentMenuCategoryLinks(department),
            emptyText: 'No categories available yet.'
          }
        ];
      }

      return [];
    },
    openSearchFromMegaMenu() {
      this.closeDepartmentMenu();
      this.openSearchDrawer();
    },
    openDepartmentMenu(department) {
      if (!department) return;
      if (this.departmentMenuTimer) {
        clearTimeout(this.departmentMenuTimer);
        this.departmentMenuTimer = null;
      }
      const menuKey = String(department || '').toLowerCase();
      if (!NAV_MENU_KEYS.has(menuKey)) return;
      this.hoveredDepartment = menuKey;
    },
    scheduleDepartmentMenuClose() {
      if (this.departmentMenuTimer) clearTimeout(this.departmentMenuTimer);

      this.departmentMenuTimer = setTimeout(() => {
        this.closeDepartmentMenu();
      }, 140);
    },
    closeDepartmentMenu() {
      if (this.departmentMenuTimer) {
        clearTimeout(this.departmentMenuTimer);
        this.departmentMenuTimer = null;
      }
      this.hoveredDepartment = '';
    },
    showCartNotice(item) {
      clearFavoriteNotice();
      this.recentCartItem = item;

      if (this.cartNoticeTimer) clearTimeout(this.cartNoticeTimer);
      this.cartNoticeTimer = setTimeout(() => {
        this.recentCartItem = null;
      }, 3200);
    },
    flattenSearchCategories(categories = [], department, groups = []) {
      const groupedCategories = (Array.isArray(groups) ? groups : []).flatMap(group =>
        (Array.isArray(group.categories) ? group.categories : []).map(category => ({
          ...category,
          department,
          productGroup: group.name || group.slug || '',
          productGroupLabel: group.label || group.name || '',
          productGroupSlug: group.slug || group.name || category.productGroupSlug || ''
        }))
      );

      const sourceCategories = groupedCategories.length ? groupedCategories : categories;

      return (Array.isArray(sourceCategories) ? sourceCategories : []).map(category => ({
        ...category,
        department
      }));
    },
    buildSearchEntries() {
      const entries = [];
      const departments = this.navDepartments.length
        ? this.navDepartments
        : [
            { name: 'women', label: 'Women', categories: [] },
            { name: 'men', label: 'Men', categories: [] }
          ];
      const addEntry = ({ key, type, label, meta, department, route, matchValues = [], isDefault = false, product = null }) => {
        const cleanLabel = String(label || '').trim();

        if (!cleanLabel) return;

        const cleanMatches = [...new Set([cleanLabel, ...matchValues].map(value => String(value || '').trim()).filter(Boolean))];

        entries.push({
          key,
          type,
          label: cleanLabel,
          meta: String(meta || '').trim(),
          department,
          route,
          matchValues: cleanMatches,
          searchText: cleanMatches.join(' '),
          isDefault,
          product
        });
      };

      (Array.isArray(this.searchProducts) ? this.searchProducts : []).forEach(product => {
        const productName = String(product && product.name || '').trim();
        const productId = String(product && (product.slug || product.id) || '').trim();

        if (!productName || !productId) return;

        const productDepartment = normalizeDepartmentName(product.gender);
        const productCategory = String(product.categoryLabel || product.category || product.categorySlug || '').trim();
        const productColors = Array.isArray(product.colors)
          ? product.colors.flatMap(color => [
              color && color.name,
              color && (color.productCode || color.product_code),
              color && (color.articleNumber || color.article_number)
            ]).filter(Boolean)
          : [];
        const productInventoryCodes = Array.isArray(product.inventoryItems)
          ? product.inventoryItems.flatMap(item => [
              item && item.colorName,
              item && (item.productCode || item.product_code),
              item && (item.articleNumber || item.article_number)
            ]).filter(Boolean)
          : [];
        const productSizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [];
        const productMaterials = Array.isArray(product.materialFilterValues) ? product.materialFilterValues.filter(Boolean) : [];

        addEntry({
          key: `product-${product.id || product.slug}`,
          type: 'product',
          label: productName,
          meta: [departmentLabel(productDepartment), productCategory].filter(Boolean).join(' > '),
          department: productDepartment,
          route: {
            path: `/${productDepartment}/product/${encodeURIComponent(productId)}`
          },
          matchValues: [
            productName,
            product.slug,
            productCategory,
            product.categorySlug,
            product.collection,
            product.collectionSlug,
            product.styleName,
            product.styleSlug,
            product.fit,
            product.description,
            ...productMaterials,
            ...productColors,
            ...productInventoryCodes,
            ...productSizes
          ],
          product,
          isDefault: false
        });
      });

      departments.forEach(department => {
        const departmentName = department.name === 'men' ? 'men' : 'women';
        const departmentLabel = department.label || (departmentName === 'men' ? 'Men' : 'Women');

        this.flattenSearchCategories(department.categories, departmentName, department.groups).forEach(category => {
          const label = category.label || this.formatCategoryLabel(category.name);
          const groupLabel = String(category.productGroupLabel || category.productGroup || '').trim();
          const categoryMeta = departmentLabel;
          const categoryRoute = this.departmentCategoryRoute(departmentName, category);

          addEntry({
            key: `category-${departmentName}-${category.id || category.slug || category.name}`,
            type: 'category',
            label,
            meta: categoryMeta,
            department: departmentName,
            route: categoryRoute,
            matchValues: [
              label,
              `${departmentLabel} ${label}`,
              `${label} ${departmentLabel}`,
              category.name,
              category.slug,
              groupLabel,
              category.productGroup,
              category.productGroupSlug,
              departmentLabel,
              departmentName
            ],
            isDefault: true
          });
        });
      });

      this.navCollections.forEach(collection => {
        const collectionLabel = collection.label || collection.name;

        addEntry({
          key: `collection-${collection.id || collection.slug || collection.name}`,
          type: 'collection',
          label: collectionLabel,
          meta: 'Collection',
          department: '',
          route: this.departmentCollectionRoute('', collection),
          matchValues: [
            collectionLabel,
            collection.name,
            collection.slug,
            'collection',
            'collections'
          ],
          isDefault: false
        });
      });

      return entries;
    },
    resolveSearchEntry(keyword) {
      const normalizedKeyword = normalizeSearchText(keyword);

      if (!normalizedKeyword) {
        return null;
      }

      const entries = this.buildSearchEntries();
      return (
        entries.find(entry =>
          entry.matchValues.some(value => normalizeSearchText(value) === normalizedKeyword)
        ) ||
        entries.find(entry => normalizeSearchText(entry.label) === normalizedKeyword) ||
        null
      );
    },
	    async ensureSearchResources() {
	      if (this.isSearchLoading) {
	        return;
      }
	
	      const hasDepartments = Array.isArray(this.navDepartments) && this.navDepartments.length;
	      const hasCollections = Array.isArray(this.navCollections) && this.navCollections.length;
	      const hasProducts = Array.isArray(this.searchProducts) && this.searchProducts.length;
	
	      if (hasDepartments && hasCollections && hasProducts) {
	        return;
	      }

      this.isSearchLoading = true;

	      try {
	        const [departments, collections, products] = await Promise.all([
	          catalogStore.getDepartments(),
	          catalogStore.getCollections(),
	          catalogStore.getProducts()
	        ]);
	
	        this.navDepartments = Array.isArray(departments) ? departments : [];
	        this.navCollections = Array.isArray(collections) ? collections : [];
	        this.searchProducts = Array.isArray(products) ? products : [];
	      } finally {
	        this.isSearchLoading = false;
	      }
    },
    async loadSearchHistory() {
      if (!this.isUser) {
        this.searchHistory = readLocalSearchHistory();
        return;
      }

      const response = await searchApi.getSearchHistory();
      this.searchHistory = Array.isArray(response && response.items) ? response.items : [];
    },
    async saveSearchHistory(keyword) {
      if (!this.isUser) {
        return;
      }

      const trimmedKeyword = String(keyword || '').trim();

      if (!trimmedKeyword) {
        return;
      }

      const response = await searchApi.saveSearchHistory({
        keyword: trimmedKeyword
      });

      this.searchHistory = Array.isArray(response && response.items) ? response.items : this.searchHistory;
    },
    persistSearchHistory(keyword) {
      const trimmedKeyword = String(keyword || '').trim();

      if (!trimmedKeyword) {
        return;
      }

      const existingItems = Array.isArray(this.searchHistory) ? this.searchHistory : [];
      const filteredItems = existingItems.filter(
        entry => normalizeSearchText(entry && entry.keyword) !== normalizeSearchText(trimmedKeyword)
      );

      this.searchHistory = [
        createSearchHistoryItem(trimmedKeyword),
        ...filteredItems
      ].slice(0, 12);

      if (this.isUser) {
        this.saveSearchHistory(trimmedKeyword).catch(() => {});
      } else {
        writeLocalSearchHistory(this.searchHistory);
      }
    },
    async clearSearchHistory() {
      if (!this.isUser) {
        this.searchHistory = [];
        writeLocalSearchHistory([]);
        return;
      }

      const response = await searchApi.clearSearchHistory();
      this.searchHistory = Array.isArray(response && response.items) ? response.items : [];
      this.flash('Search history cleared.', 'success');
    },
    formatSearchDate(value) {
      return formatVietnamDate(value, {
        month: 'short',
        day: 'numeric'
      });
    },
    async openSearchDrawer() {
      if (this.isAdmin) {
        return;
      }

      this.isSearchDrawerOpen = true;
      this.searchPreviewQuery = this.searchQuery;
      this.closeDepartmentMenu();
      this.closeMenu();
      await this.$nextTick();

      if (this.$refs.searchDrawer && typeof this.$refs.searchDrawer.focusInput === 'function') {
        this.$refs.searchDrawer.focusInput();
      }

      Promise.all([
        this.ensureSearchResources(),
        this.loadSearchHistory()
      ]).catch(() => {});
    },
    closeSearchDrawer() {
      this.isSearchDrawerOpen = false;
    },
    async submitSearch() {
      const trimmedSearch = this.searchQuery.trim();

      if (!trimmedSearch) {
        return;
      }

      this.closeSearchDrawer();
      this.persistSearchHistory(trimmedSearch);
      this.$router.push({
        path: '/search',
        query: {
          q: trimmedSearch
        }
      });
    },
    async runSearchHistory(keyword) {
      this.searchQuery = String(keyword || '').trim();
      await this.submitSearch();
    },
	    async selectSearchSuggestion(item) {
	      if (!item) {
	        return;
      }

      this.searchQuery = item.label;
      this.searchPreviewQuery = item.label;
      await this.submitSearch();
    },
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
    },
    closeMenu() {
      this.isMenuOpen = false;
    },
    scrollToTop() {
      if (typeof window === 'undefined') return;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    syncBodyScrollLock(forceState) {
      if (typeof document === 'undefined') return;
      const shouldLock =
        typeof forceState === 'boolean' ? forceState : this.isAuthModalOpen || this.isSearchDrawerOpen || this.isLogoutConfirmOpen;
      document.body.style.overflow = shouldLock ? 'hidden' : '';
    },
    syncRouteShellClass(forceState) {
      if (typeof document === 'undefined') return;

      const isAdminShell = typeof forceState === 'boolean' ? forceState : this.isAdminRoute;
      document.documentElement.classList.toggle('hem-admin-shell', isAdminShell);
      document.documentElement.classList.toggle('hem-shop-shell', !isAdminShell);
      document.body.classList.toggle('hem-admin-shell', isAdminShell);
      document.body.classList.toggle('hem-shop-shell', !isAdminShell);
    },
    async loadNavigationProducts() {
      const [departments, collections, products] = await Promise.all([
        catalogStore.getDepartments(),
        catalogStore.getCollections(),
        catalogStore.getProducts()
      ]);
      this.navDepartments = Array.isArray(departments) ? departments : [];
      this.navCollections = Array.isArray(collections) ? collections : [];
      this.searchProducts = Array.isArray(products) ? products : [];
    },
  };
