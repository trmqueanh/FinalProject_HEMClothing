// Các action của Shop.vue được tách khỏi view để dễ theo dõi và debug.
import { catalogStore, normalizeDepartment } from '../../stores/catalogStore';
import { colorFamilyValue, normalizeColorOption } from '../../helpers/colors';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  ALL_PRODUCTS_SEGMENT,
  BROWSE_VIEW_TO_GROUP,
  BROWSE_VIEW_TO_SPECIAL_SEGMENT,
  GROUP_TO_BROWSE_VIEW,
  SORT_OPTIONS,
  byNewest,
  categoryRouteSlug,
  mergeProductGroups,
  normalizeCategoryIdentity,
  normalizeMatchKey,
  normalizePageNumber,
  slugifyRouteSegment
} from '../../helpers/shop/shopPageConfig';
import {
  routeContextFromPath,
  shouldResetFiltersForRoute as shouldResetShopFiltersForRoute
} from '../../helpers/shop/shopRouteState';
import {
  expandProductsToColorCards,
  isListingSaleCard,
  listingCardSizeValues,
  mixListingColorCardsByCategory,
  sortListingColorCards
} from '../../helpers/shop/listingColorCards';

const productListingPrice = product => {
  const listingPrice = Number(product && (product.listingPrice ?? product.listing_price));
  if (Number.isFinite(listingPrice) && listingPrice >= 0) return listingPrice;

  const price = Number(product && product.price);
  return Number.isFinite(price) && price >= 0 ? price : 0;
};

const productListingComparePrice = product => {
  const listingComparePrice = Number(product && (product.listingComparePrice ?? product.listing_compare_price));
  if (Number.isFinite(listingComparePrice) && listingComparePrice >= 0) return listingComparePrice;

  const originalPrice = Number(product && (product.originalPrice ?? product.original_price));
  if (Number.isFinite(originalPrice) && originalPrice >= 0) return originalPrice;

  return productListingPrice(product);
};

const hasVariantSalePrice = product => {
  const comparePrice = productListingComparePrice(product);

  return Array.isArray(product && product.colors) && product.colors.some(color => {
    const salePrice = Number(color && (color.salePrice ?? color.sale_price));
    return Number.isFinite(salePrice) && salePrice >= 0 && salePrice < comparePrice;
  });
};

const isSaleProduct = product =>
  String(product && (product.pricingMode || product.pricing_mode || '')).toLowerCase() === 'sale' ||
  Boolean(product && (product.isSale || product.is_sale || product.hasSalePricing || product.has_sale_pricing)) ||
  hasVariantSalePrice(product);

const productDiscountPercent = product => {
  const explicitPercent = Number(product && (product.saleDiscountPercent ?? product.sale_discount_percent ?? 0));

  if (Number.isFinite(explicitPercent) && explicitPercent > 0) {
    return explicitPercent;
  }

  const salePrice = productListingPrice(product);
  const originalPrice = productListingComparePrice(product);

  return originalPrice > salePrice && originalPrice > 0
    ? ((originalPrice - salePrice) / originalPrice) * 100
    : 0;
};

const GROUP_MIXED_LISTINGS = ['clothing', 'shoes', 'accessories'];
const CATEGORY_MIXED_PAGE_TYPES = new Set(['all-products', 'collection', 'product-group', 'sale', 'special']);

const singularRouteToken = token => {
  if (token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.endsWith('sses') || token.endsWith('ss')) return token;
  if (token.endsWith('s') && token.length > 3) return token.slice(0, -1);
  return token;
};

const routeMatchKey = value =>
  slugifyRouteSegment(value)
    .split('-')
    .filter(token => token && token !== 'and')
    .map(singularRouteToken)
    .join('-');

const identityCandidates = value => {
  const rawValue = String(value || '').trim();

  return [
    normalizeCategoryIdentity(rawValue),
    slugifyRouteSegment(rawValue),
    routeMatchKey(rawValue)
  ].filter(Boolean);
};

const identityMatches = (left, right) => {
  const leftValues = identityCandidates(left);
  const rightValues = identityCandidates(right);

  return leftValues.some(leftValue =>
    rightValues.some(rightValue =>
      leftValue === rightValue ||
      leftValue.startsWith(`${rightValue}-`) ||
      leftValue.endsWith(`-${rightValue}`) ||
      rightValue.startsWith(`${leftValue}-`) ||
      rightValue.endsWith(`-${leftValue}`)
    )
  );
};

const recordMatchesIdentity = (record, value, extraValues = []) =>
  [record && record.slug, record && record.name, record && record.label, ...extraValues]
    .some(candidate => identityMatches(candidate, value));

const productCreatedTime = product => {
  const timestamp = product && product.createdAt ? new Date(product.createdAt).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const productMixBucketKey = product =>
  normalizeCategoryIdentity(
    product &&
      (
        product.categorySlug ||
        product.category ||
        product.categoryLabel ||
        product.collectionSlug ||
        product.collection ||
        product.styleSlug ||
        product.styleName ||
        product.id ||
        product.name
      )
  ) || 'other';

const shouldMixProductGroupListing = (activeFilters, searchTerm) =>
  !searchTerm &&
  activeFilters.sortBy === 'newest' &&
  activeFilters.category === 'All' &&
  GROUP_MIXED_LISTINGS.includes(normalizeCategoryIdentity(activeFilters.productGroup));

const mixProductGroupListing = products => {
  const bucketsByKey = new Map();

  products.forEach((product, index) => {
    const key = productMixBucketKey(product);
    const bucket = bucketsByKey.get(key) || [];

    bucket.push({ product, index });
    bucketsByKey.set(key, bucket);
  });

  const buckets = [...bucketsByKey.entries()]
    .map(([key, items]) => ({
      key,
      items: [...items].sort((left, right) => byNewest(left.product, right.product) || left.index - right.index)
    }))
    .sort((left, right) =>
      productCreatedTime(right.items[0]?.product) - productCreatedTime(left.items[0]?.product) ||
      left.key.localeCompare(right.key)
    );

  if (buckets.length <= 1) {
    return [...products].sort(byNewest);
  }

  const mixed = [];
  let rowIndex = 0;
  let hasMoreItems = true;

  while (hasMoreItems) {
    hasMoreItems = false;

    buckets.forEach(bucket => {
      const item = bucket.items[rowIndex];

      if (item) {
        mixed.push(item.product);
        hasMoreItems = true;
      }
    });

    rowIndex += 1;
  }

  return mixed;
};

export const shopMethods = {
    formatCurrency,
    getFilteredProducts(filters) {
      const searchTerm = this.searchQuery.trim().toLowerCase();
      const activeFilters = {
        productGroup: this.activeProductGroup,
        category: this.activeCategory,
        collection: 'All',
        fit: 'All',
        garmentLength: 'All',
        heelHeight: 'All',
        material: 'All',
        neckline: 'All',
        color: 'All',
        size: 'All',
        sleeveLength: 'All',
        style: 'All',
        waistRise: 'All',
        priceMin: this.priceRange.min,
        priceMax: this.priceRange.max,
        browseView: this.browseView,
        sortBy: 'newest',
        ...filters
      };
      const activeProductGroup = BROWSE_VIEW_TO_GROUP[activeFilters.browseView] || 'all';
      const activeColorValue = activeFilters.color === 'All' ? 'All' : colorFamilyValue(activeFilters.color);
      const shouldApplyCategorySpecificFilters = activeFilters.category !== 'All';
      const activeNeckline = shouldApplyCategorySpecificFilters ? activeFilters.neckline : 'All';
      const activeWaistRise = shouldApplyCategorySpecificFilters ? activeFilters.waistRise : 'All';
      const activeSleeveLength = shouldApplyCategorySpecificFilters ? activeFilters.sleeveLength : 'All';
      const activeGarmentLength = shouldApplyCategorySpecificFilters ? activeFilters.garmentLength : 'All';
      const activeHeelHeight = shouldApplyCategorySpecificFilters ? activeFilters.heelHeight : 'All';

      let filtered = this.departmentProducts.filter(product => {
        const matchesSearch =
          !searchTerm ||
          [
            product.name,
            product.category,
            product.collection,
            product.description
          ]
            .join(' ')
            .toLowerCase()
            .includes(searchTerm);

        const matchesProductGroup = this.matchesProductGroupValue(product, activeFilters.productGroup);
        const matchesCategory = this.matchesCategoryValue(product, activeFilters.category);
        const matchesCollection =
          activeFilters.collection === 'All' ||
          [product.collectionSlug, product.collection]
            .map(normalizeCategoryIdentity)
            .includes(normalizeCategoryIdentity(activeFilters.collection));
        const matchesFit =
          activeFilters.fit === 'All' ||
          [product.fitSlug, product.fitName, product.fit]
            .map(normalizeCategoryIdentity)
            .includes(normalizeCategoryIdentity(activeFilters.fit));
        const matchesNeckline =
          activeNeckline === 'All' ||
          normalizeCategoryIdentity(product.neckline) === normalizeCategoryIdentity(activeNeckline);
        const matchesWaistRise =
          activeWaistRise === 'All' ||
          normalizeCategoryIdentity(product.waistRise || product.waist_rise) === normalizeCategoryIdentity(activeWaistRise);
        const matchesSleeveLength =
          activeSleeveLength === 'All' ||
          normalizeCategoryIdentity(product.sleeveLength || product.sleeve_length) === normalizeCategoryIdentity(activeSleeveLength);
        const matchesGarmentLength =
          activeGarmentLength === 'All' ||
          normalizeCategoryIdentity(product.garmentLength || product.garment_length || product.length) === normalizeCategoryIdentity(activeGarmentLength);
        const matchesStyle =
          activeFilters.style === 'All' ||
          [product.styleSlug, product.styleName]
            .map(normalizeCategoryIdentity)
            .includes(normalizeCategoryIdentity(activeFilters.style));
        const matchesHeelHeight =
          activeHeelHeight === 'All' ||
          normalizeCategoryIdentity(product.heelHeight || product.heel_height) === normalizeCategoryIdentity(activeHeelHeight);
        const matchesMaterial =
          activeFilters.material === 'All' ||
          (Array.isArray(product.materialFilterValues) &&
            product.materialFilterValues.some(material => normalizeCategoryIdentity(material) === normalizeCategoryIdentity(activeFilters.material)));
        const price = productListingPrice(product);
        const matchesPrice = price >= activeFilters.priceMin && price <= activeFilters.priceMax;
        const matchesColor =
          activeFilters.color === 'All' ||
          (Array.isArray(product.colors) &&
            product.colors.some(color => normalizeColorOption(color).value === activeColorValue));
        const matchesSize =
          activeFilters.size === 'All' ||
          (Array.isArray(product.sizes) && product.sizes.some(size => String(size) === String(activeFilters.size)));

        return (
          matchesSearch &&
          matchesProductGroup &&
          matchesCategory &&
          matchesCollection &&
          matchesFit &&
          matchesNeckline &&
          matchesWaistRise &&
          matchesSleeveLength &&
          matchesGarmentLength &&
          matchesStyle &&
          matchesHeelHeight &&
          matchesMaterial &&
          matchesPrice &&
          matchesColor &&
          matchesSize
        );
      });

      if (activeProductGroup === 'new_arrival') {
        filtered = filtered.filter(product => product.newArrival);
      } else if (activeProductGroup === 'bestseller') {
        filtered = filtered.filter(product => Boolean(product.isBestseller || product.is_bestseller) || Number(product.soldCount || 0) > 0);
      } else if (activeProductGroup === 'sale') {
        filtered = filtered.filter(product => isSaleProduct(product));
      }

      if (activeFilters.sortBy === 'discount-desc') {
        filtered = filtered.filter(product => isSaleProduct(product));
      }

      if (shouldMixProductGroupListing(activeFilters, searchTerm)) {
        return mixProductGroupListing(filtered);
      }

      return [...filtered].sort((left, right) => {
        if (activeFilters.sortBy === 'discount-desc') {
          const discountDifference = productDiscountPercent(right) - productDiscountPercent(left);

          return discountDifference || byNewest(left, right);
        }

        if (activeFilters.sortBy === 'price-asc') {
          return productListingPrice(left) - productListingPrice(right);
        }

        if (activeFilters.sortBy === 'price-desc') {
          return productListingPrice(right) - productListingPrice(left);
        }

        if (activeFilters.sortBy === 'name') {
          return left.name.localeCompare(right.name);
        }

        if (activeProductGroup === 'bestseller') {
          return Number(right.soldCount || 0) - Number(left.soldCount || 0);
        }

        if (activeFilters.sortBy === 'newest') {
          return byNewest(left, right);
        }

        return byNewest(left, right);
      });
    },
    getFilteredListingCards(filters = {}) {
      const requestedColor = filters.color ?? this.activeColor;
      const requestedSize = String(filters.size ?? this.activeSize ?? 'All');
      const requestedPriceMin = Number(filters.priceMin ?? this.activePriceMin);
      const requestedPriceMax = Number(filters.priceMax ?? this.activePriceMax);
      const requestedBrowseView = String(filters.browseView ?? this.browseView ?? 'all');
      const requestedSort = String(filters.sortBy ?? this.sortBy ?? 'newest');
      const shouldShowSaleCardsOnly =
        this.isSalePage ||
        requestedBrowseView === 'sale' ||
        requestedSort === 'discount-desc';
      const products = this.getFilteredProducts({
        ...filters,
        color: 'All',
        size: 'All',
        priceMin: this.priceRange.min,
        priceMax: this.priceRange.max,
        browseView: shouldShowSaleCardsOnly ? 'all' : requestedBrowseView,
        sortBy: requestedSort === 'discount-desc' ? 'newest' : requestedSort
      });
      const productCards = expandProductsToColorCards(products, {
        activeColor: requestedColor,
        priceMin: Number.isFinite(requestedPriceMin) ? requestedPriceMin : this.priceRange.min,
        priceMax: Number.isFinite(requestedPriceMax) ? requestedPriceMax : this.priceRange.max
      });
      const sizeFilteredCards = requestedSize === 'All'
        ? productCards
        : productCards.filter(product => listingCardSizeValues(product).includes(requestedSize));
      const visibleCards = shouldShowSaleCardsOnly
        ? sizeFilteredCards.filter(isListingSaleCard)
        : sizeFilteredCards;

      const requestedCategory = String(filters.category ?? this.activeCategory ?? 'All');
      const shouldMixCategories =
        !this.searchQuery.trim() &&
        requestedSort === 'newest' &&
        normalizeCategoryIdentity(requestedCategory) === 'all' &&
        (
          CATEGORY_MIXED_PAGE_TYPES.has(this.pageType) ||
          ['new', 'best', 'sale'].includes(requestedBrowseView)
        );

      return requestedSort !== 'newest'
        ? sortListingColorCards(visibleCards, requestedSort)
        : shouldMixCategories
          ? mixListingColorCardsByCategory(visibleCards)
          : visibleCards;
    },
    shouldResetFiltersForRoute(previousPath) {
      return shouldResetShopFiltersForRoute(previousPath, this.$route.fullPath);
    },
    syncRouteState(previousPath = '') {
      const shouldResetFilters = this.shouldResetFiltersForRoute(previousPath);
      const routeContext = routeContextFromPath(this.$route.fullPath);
      const nextSearchQuery = String(this.$route.query.q || '');
      const nextActiveProductGroup = String(routeContext.productGroup || 'All');
      const nextActiveCategory = String(routeContext.category || 'All');
      const nextActiveCollection = String(routeContext.collection || 'All');
      const nextActiveFit = String(this.$route.query.fit || 'All');
      const nextActiveGarmentLength = String(this.$route.query.length || this.$route.query.garment_length || 'All');
      const nextActiveHeelHeight = String(this.$route.query.heel_height || 'All');
      const nextActiveMaterial = String(this.$route.query.material || 'All');
      const nextActiveNeckline = String(this.$route.query.neckline || 'All');
      const nextActiveSleeveLength = String(this.$route.query.sleeve_length || 'All');
      const nextActiveStyle = String(this.$route.query.style || 'All');
      const nextActiveWaistRise = String(this.$route.query.waist_rise || 'All');
      const nextBrowseView = String(routeContext.browseView || 'landing');
      const nextCurrentPage = normalizePageNumber(this.$route.query.page);

      if (shouldResetFilters) {
        this.currentPage = 1;
      }

      this.pageType = routeContext.pageType;
      this.pageKey = routeContext.pageKey;
      this.searchQuery = nextSearchQuery;
      this.activeProductGroup = nextActiveProductGroup;
      this.activeCategory = nextActiveCategory;
      this.activeCollection = nextActiveCollection;
      this.activeFit = nextActiveFit;
      this.activeGarmentLength = nextActiveGarmentLength;
      this.activeHeelHeight = nextActiveHeelHeight;
      this.activeMaterial = nextActiveMaterial;
      this.activeNeckline = nextActiveNeckline;
      this.activeSleeveLength = nextActiveSleeveLength;
      this.activeStyle = nextActiveStyle;
      this.activeWaistRise = nextActiveWaistRise;
      this.browseView = nextBrowseView;
      const requestedSort = String(this.$route.query.sort || 'newest');
      this.sortBy = routeContext.pageType === 'sale' && requestedSort === 'discount-desc'
        ? 'newest'
        : SORT_OPTIONS.some(option => option.value === requestedSort)
          ? requestedSort
          : 'newest';
      this.activeColor = this.$route.query.color ? colorFamilyValue(String(this.$route.query.color)) : 'All';
      this.activeSize = String(this.$route.query.size || 'All');
      this.priceMin = this.$route.query.minPrice !== undefined ? String(this.$route.query.minPrice) : '';
      this.priceMax = this.$route.query.maxPrice !== undefined ? String(this.$route.query.maxPrice) : '';
      this.currentPage = nextCurrentPage;
    },
    applyGroupScopedQueryFilters() {
      const shouldKeepCategorySpecificFilters = this.activeCategory !== 'All';

      this.activeFit = String(this.$route.query.fit || this.activeFit || 'All');
      this.activeGarmentLength = shouldKeepCategorySpecificFilters
        ? String(this.$route.query.length || this.$route.query.garment_length || this.activeGarmentLength || 'All')
        : 'All';
      this.activeHeelHeight = shouldKeepCategorySpecificFilters
        ? String(this.$route.query.heel_height || this.activeHeelHeight || 'All')
        : 'All';
      this.activeStyle = String(this.$route.query.style || this.activeStyle || 'All');
      this.activeNeckline = shouldKeepCategorySpecificFilters
        ? String(this.$route.query.neckline || this.activeNeckline || 'All')
        : 'All';
      this.activeSleeveLength = shouldKeepCategorySpecificFilters
        ? String(this.$route.query.sleeve_length || this.activeSleeveLength || 'All')
        : 'All';
      this.activeWaistRise = shouldKeepCategorySpecificFilters
        ? String(this.$route.query.waist_rise || this.activeWaistRise || 'All')
        : 'All';
      this.activeSize = String(this.$route.query.size || this.activeSize || 'All');
    },
    productLink(product) {
      const productDepartment = normalizeDepartment(product && product.gender);
      return {
        path: `${productDepartment === 'men' ? '/men' : '/women'}/product/${product.slug || product.id}`
      };
    },
    resetFiltersForCatalogTabChange() {
      this.activeFit = 'All';
      this.activeGarmentLength = 'All';
      this.activeHeelHeight = 'All';
      this.activeMaterial = 'All';
      this.activeNeckline = 'All';
      this.activeSleeveLength = 'All';
      this.activeStyle = 'All';
      this.activeWaistRise = 'All';
      this.sortBy = 'newest';
      this.activeColor = 'All';
      this.activeSize = 'All';
      this.priceMin = '';
      this.priceMax = '';
      this.currentPage = 1;
    },
    setCategory(category) {
      if (this.pageType === 'collection' && category && category.collectionGroup) {
        const isSameCollectionGroup =
          normalizeCategoryIdentity(this.activeProductGroup) === normalizeCategoryIdentity(category.collectionGroup);
        if (isSameCollectionGroup) {
          return;
        }

        this.resetFiltersForCatalogTabChange();
        this.activeProductGroup = String(category.collectionGroup || 'All');
        this.activeCategory = 'All';
        this.updateRouteFilters();
        return;
      }

      if (this.isSalePage && category && category.saleGroup) {
        const isSameSaleGroup =
          normalizeCategoryIdentity(this.activeProductGroup) === normalizeCategoryIdentity(category.saleGroup);
        if (isSameSaleGroup) {
          return;
        }

        this.resetFiltersForCatalogTabChange();
        this.activeProductGroup = String(category.saleGroup || 'All');
        this.activeCategory = 'All';
        this.pageType = 'sale';
        this.pageKey = 'sale';
        this.updateRouteFilters();
        return;
      }

      const nextCategory = this.categoryQueryValue(category) || 'All';
      const categoryGroupRecord = nextCategory === 'All'
        ? null
        : this.findCategoryProductGroupRecord(nextCategory);
      const explicitProductGroup = category && typeof category === 'object'
        ? String(category.productGroupSlug || category.product_group_slug || category.productGroup || category.product_group || '').trim()
        : '';
      const explicitProductGroupRecord = explicitProductGroup ? this.findProductGroupRecord(explicitProductGroup) : null;
      const nextProductGroup = this.productGroupQueryValue(categoryGroupRecord || explicitProductGroupRecord) || explicitProductGroup;
      const isSameCategory =
        normalizeCategoryIdentity(this.activeCategory) === normalizeCategoryIdentity(nextCategory);
      const isSameProductGroup =
        normalizeCategoryIdentity(this.activeProductGroup) === normalizeCategoryIdentity(nextProductGroup || this.activeProductGroup);
      const shouldKeepGroupScopedBrowseView =
        this.activeProductGroup !== 'All' &&
        (this.browseView === 'new' || this.browseView === 'best') &&
        this.pageType !== 'collection' &&
        this.pageType !== 'special';

      if (isSameCategory && isSameProductGroup) {
        return;
      }

      this.resetFiltersForCatalogTabChange();

      this.activeCategory = nextCategory;

      if (nextCategory === 'All') {
        this.activeGarmentLength = 'All';
        this.activeHeelHeight = 'All';
        this.activeNeckline = 'All';
        this.activeSleeveLength = 'All';
        this.activeWaistRise = 'All';
      }

      if (this.pageType === 'collection') {
        this.browseView = 'all';
        this.activeCollection = this.activeCollection === 'All' && this.pageKey ? this.pageKey : this.activeCollection;
      } else if (this.pageType !== 'special') {
        this.activeCollection = 'All';
        this.browseView = shouldKeepGroupScopedBrowseView ? this.browseView : 'all';
        if (this.activeProductGroup !== 'All') {
          this.pageType = nextCategory === 'All' ? 'product-group' : 'product-group-category';
          this.pageKey = nextCategory === 'All' ? this.activeProductGroup : nextCategory;
        } else if (nextCategory !== 'All' && (nextProductGroup || categoryGroupRecord)) {
          this.activeProductGroup = nextProductGroup || this.productGroupQueryValue(categoryGroupRecord);
          this.pageType = 'product-group-category';
          this.pageKey = nextCategory;
        } else {
          this.pageType = nextCategory === 'All' ? 'all-products' : 'category';
          this.pageKey = nextCategory === 'All' ? ALL_PRODUCTS_SEGMENT : nextCategory;
        }
      }

      this.updateRouteFilters();
    },
    applyInlineFilter({ filter, value }) {
      if (filter === 'department' && this.isSalePage) {
        const department = String(value || '').toLowerCase();
        const nextQuery = { ...this.$route.query };

        if (department === 'men' || department === 'women') {
          nextQuery.department = department;
        } else {
          delete nextQuery.department;
        }

        delete nextQuery.page;
        this.currentPage = 1;
        this.$router.replace({
          path: '/sale',
          query: nextQuery
        });
        return;
      }

      if (filter === 'department' && this.pageType === 'collection') {
        this.setCollectionScope(value);
        return;
      }

      if (filter === 'productGroup' && (this.pageType === 'collection' || this.isSalePage)) {
        this.activeProductGroup = value;
        this.activeCategory = 'All';
        this.activeFit = 'All';
        this.activeGarmentLength = 'All';
        this.activeHeelHeight = 'All';
        this.activeMaterial = 'All';
        this.activeNeckline = 'All';
        this.activeSleeveLength = 'All';
        this.activeStyle = 'All';
        this.activeWaistRise = 'All';
        this.activeSize = 'All';
        this.currentPage = 1;
        this.updateRouteFilters();
        return;
      }

      if (filter === 'category') {
        this.activeCategory = value;
        this.activeGarmentLength = 'All';
        this.activeHeelHeight = 'All';
        this.activeNeckline = 'All';
        this.activeSleeveLength = 'All';
        this.activeWaistRise = 'All';
      }
      if (filter === 'collection') this.activeCollection = value;
      if (filter === 'color') this.activeColor = value === 'All' ? 'All' : colorFamilyValue(value);
      if (filter === 'size') this.activeSize = value;
      if (filter === 'fit') this.activeFit = value;
      if (filter === 'garmentLength') this.activeGarmentLength = value;
      if (filter === 'style') this.activeStyle = value;
      if (filter === 'heelHeight') this.activeHeelHeight = value;
      if (filter === 'neckline') this.activeNeckline = value;
      if (filter === 'sleeveLength') this.activeSleeveLength = value;
      if (filter === 'waistRise') this.activeWaistRise = value;
      if (filter === 'material') this.activeMaterial = value;
      this.currentPage = 1;
      this.updateRouteFilters();
    },
    setInlineSort(value) {
      const nextSort = this.isSalePage && value === 'discount-desc'
        ? 'newest'
        : SORT_OPTIONS.some(option => option.value === value)
          ? value
          : 'newest';
      this.sortBy = nextSort;
      this.currentPage = 1;
      this.updateRouteFilters();
    },
    setInlinePrice({ min, max }) {
      const nextMin = Math.max(this.priceRange.min, Math.min(Number(min), this.priceRange.max));
      const nextMax = Math.max(nextMin, Math.min(Number(max), this.priceRange.max));
      this.priceMin = nextMin <= this.priceRange.min ? '' : String(nextMin);
      this.priceMax = nextMax >= this.priceRange.max ? '' : String(nextMax);
      this.currentPage = 1;
      this.updateRouteFilters();
    },
    clearInlineFilters() {
      const shouldClearCollectionRoute = this.pageType === 'collection' && this.activeCollection !== 'All';

      if (this.pageType !== 'collection') {
        this.activeCollection = 'All';
      } else {
        this.activeProductGroup = 'All';
        this.activeCategory = 'All';
      }

      this.activeFit = 'All';
      this.activeGarmentLength = 'All';
      this.activeHeelHeight = 'All';
      this.activeMaterial = 'All';
      this.activeNeckline = 'All';
      this.activeSleeveLength = 'All';
      this.activeStyle = 'All';
      this.activeWaistRise = 'All';
      this.sortBy = 'newest';
      this.activeColor = 'All';
      this.activeSize = 'All';
      this.priceMin = '';
      this.priceMax = '';
      this.currentPage = 1;

      if (this.isSalePage) {
        this.activeProductGroup = 'All';
        this.activeCategory = 'All';
        this.$router.replace({
          path: '/sale',
          query: { department: this.saleDepartmentFilter }
        });
        return;
      }

      if (shouldClearCollectionRoute) {
        this.$router.replace({
          path: this.departmentCollectionPath(this.activeCollection),
          query: { department: this.collectionDepartmentFilter }
        });
        return;
      }

      this.updateRouteFilters();
    },
    isCategoryActive(category) {
      if (this.pageType === 'collection' && category && category.collectionGroup) {
        return normalizeCategoryIdentity(this.activeProductGroup) === normalizeCategoryIdentity(category.collectionGroup);
      }

      if (this.isSalePage && category && category.saleGroup) {
        return normalizeCategoryIdentity(this.activeProductGroup) === normalizeCategoryIdentity(category.saleGroup);
      }

      if (!category) {
        return this.activeCategory === 'All';
      }

      if (this.categoryQueryValue(category) === 'All') {
        return this.activeCategory === 'All';
      }

      if (this.activeCategory === 'All') {
        return false;
      }

      const activeIdentity = normalizeCategoryIdentity(this.activeCategory);

      return [
        this.categoryQueryValue(category),
        categoryRouteSlug(this.activeDepartment, category)
      ]
        .map(normalizeCategoryIdentity)
        .includes(activeIdentity);
    },
    openBrowseView(view) {
      const nextBrowseView = GROUP_TO_BROWSE_VIEW[BROWSE_VIEW_TO_GROUP[view] || 'all'];
      const specialSegment = BROWSE_VIEW_TO_SPECIAL_SEGMENT[nextBrowseView];

      this.browseView = nextBrowseView;
      this.pageType = specialSegment ? 'special' : 'all-products';
      this.pageKey = specialSegment || ALL_PRODUCTS_SEGMENT;
      this.activeProductGroup = 'All';
      this.activeCategory = 'All';
      this.activeCollection = 'All';
      this.activeFit = 'All';
      this.activeGarmentLength = 'All';
      this.activeHeelHeight = 'All';
      this.activeMaterial = 'All';
      this.activeNeckline = 'All';
      this.activeSleeveLength = 'All';
      this.activeStyle = 'All';
      this.activeWaistRise = 'All';
      this.sortBy = 'newest';
      this.activeColor = 'All';
      this.activeSize = 'All';
      this.priceMin = '';
      this.priceMax = '';
      this.currentPage = 1;
      this.updateRouteFilters();
    },
    setPage(page) {
      const nextPage = Math.min(Math.max(1, normalizePageNumber(page)), this.paginationTotalPages);

      if (nextPage === this.currentPage) {
        return;
      }

      this.currentPage = nextPage;
      this.updateRouteFilters();
    },
    formatCategoryLabel(value) {
      return String(value || '')
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(token => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ');
    },
    categoryQueryValue(category) {
      if (!category || typeof category !== 'object') {
        return String(category || '');
      }

      return String(category.slug || category.name || '').trim();
    },
    departmentCatalogPath(segment = '') {
      const basePath = this.activeDepartment === 'men' ? '/men' : '/women';
      const cleanSegment = String(segment || '').trim();

      return cleanSegment ? `${basePath}/${encodeURIComponent(cleanSegment)}` : basePath;
    },
    departmentProductGroupPath(group) {
      const groupSlug = this.productGroupQueryValue(group);
      return this.departmentCatalogPath(groupSlug);
    },
    departmentProductGroupCategoryPath(group, category) {
      const groupSlug = this.productGroupQueryValue(group);
      const categorySlug = categoryRouteSlug(this.activeDepartment, category);
      const segments = [groupSlug, categorySlug]
        .map(segment => String(segment || '').trim())
        .filter(Boolean)
        .map(segment => encodeURIComponent(segment));
      const basePath = this.activeDepartment === 'men' ? '/men' : '/women';

      return segments.length ? `${basePath}/${segments.join('/')}` : basePath;
    },
    departmentCollectionPath(collection) {
      const collectionSlug = this.collectionSlugForValue(collection);
      return `/collections/${encodeURIComponent(collectionSlug)}`;
    },
    collectionSlugForValue(value) {
      const identity = normalizeCategoryIdentity(value);
      const matchedProduct = this.departmentProducts.find(product =>
        [product.collectionSlug, product.collection]
          .map(normalizeCategoryIdentity)
          .includes(identity)
      );
      const matchedCollection = this.landingCollections.find(collection =>
        [collection.slug, collection.name, collection.label]
          .map(normalizeCategoryIdentity)
          .includes(identity)
      );

      return String(
        (matchedProduct && (matchedProduct.collectionSlug || matchedProduct.collection)) ||
        (matchedCollection && (matchedCollection.slug || matchedCollection.name)) ||
        value ||
        ''
      ).trim();
    },
    collectionLabelForValue(value) {
      const identity = normalizeCategoryIdentity(value);
      const matchedProduct = this.departmentProducts.find(product =>
        [product.collectionSlug, product.collection]
          .map(normalizeCategoryIdentity)
          .includes(identity)
      );
      const matchedCollection = this.landingCollections.find(collection =>
        [collection.slug, collection.name, collection.label]
          .map(normalizeCategoryIdentity)
          .includes(identity)
      );

      return String(
        (matchedProduct && matchedProduct.collection) ||
        (matchedCollection && (matchedCollection.label || matchedCollection.name)) ||
        this.formatCategoryLabel(value)
      ).trim();
    },
    findCategoryRecord(categoryValue) {
      const identity = normalizeCategoryIdentity(categoryValue);

      if (!identity) {
        return null;
      }

      return (
        this.flatDepartmentCategories.find(category => recordMatchesIdentity(category, identity)) || null
      );
    },
    findProductGroupRecord(groupValue) {
      const identity = normalizeCategoryIdentity(groupValue);

      if (!identity) {
        return null;
      }

      return (
        this.departmentProductGroupItems.find(group => recordMatchesIdentity(group, identity)) || null
      );
    },
    findCategoryProductGroupRecord(categoryValue) {
      const identity = normalizeCategoryIdentity(categoryValue);

      if (!identity) {
        return null;
      }

      return (
        this.departmentProductGroupItems.find(group =>
          (Array.isArray(group.categories) ? group.categories : []).some(category =>
            recordMatchesIdentity(category, identity)
          )
        ) || null
      );
    },
    productGroupQueryValue(group) {
      if (!group || typeof group !== 'object') {
        return String(group || '');
      }

      return slugifyRouteSegment(group.slug || group.name || group.label || '');
    },
    matchesProductGroupValue(product, productGroupValue = 'All') {
      if (productGroupValue === 'All') {
        return true;
      }

      const selectedGroup = this.findProductGroupRecord(productGroupValue);

      if (selectedGroup && product.productGroupId) {
        return String(product.productGroupId || '') === String(selectedGroup.id || '');
      }

      return [product.productGroupSlug, product.productGroup, product.productGroupLabel]
        .some(value => identityMatches(value, productGroupValue));
    },
    matchDepartmentCategory(candidates = []) {
      const categoryRecords = this.flatDepartmentCategories.map(category => ({
        ...category,
        matchKey: normalizeMatchKey(category.name || category.label || category.slug)
      }));

      return categoryRecords.find(category =>
        candidates.some(candidate => category.matchKey.includes(normalizeMatchKey(candidate)))
      );
    },
    matchesCategoryValue(product, categoryValue = 'All') {
      if (categoryValue === 'All') {
        return true;
      }

      const selectedCategory = this.findCategoryRecord(categoryValue);

      if (!selectedCategory) {
        return [product.categorySlug, product.category, product.categoryLabel]
          .some(value => identityMatches(value, categoryValue));
      }

      return String(product.categoryId || '') === String(selectedCategory.id || '');
    },
    signatureRoute(signature) {
      if (signature.category) {
        const categoryRecord = this.findCategoryRecord(signature.category);

        if (categoryRecord && categoryRecord.productGroupSlug) {
          return {
            path: this.departmentProductGroupCategoryPath(categoryRecord.productGroupSlug, categoryRecord)
          };
        }

        return {
          path: this.departmentCatalogPath(categoryRouteSlug(this.activeDepartment, signature.category))
        };
      }

      return {
        path: this.departmentCatalogPath(ALL_PRODUCTS_SEGMENT)
      };
    },
    updateRouteFilters() {
      const nextQuery = {};
      let nextPath = this.departmentCatalogPath();

      if (this.pageType === 'sale') {
        nextPath = '/sale';
        nextQuery.department = this.saleDepartmentFilter;

        if (this.activeProductGroup !== 'All') {
          nextQuery.group = this.activeProductGroup;
        }

        if (this.activeCategory !== 'All') {
          nextQuery.category = this.activeCategory;
        }
      } else if (this.pageType === 'special') {
        const specialSegment = BROWSE_VIEW_TO_SPECIAL_SEGMENT[this.browseView] || this.pageKey;
        nextPath = this.departmentCatalogPath(specialSegment);
      } else if (this.pageType === 'collection' && this.activeCollection !== 'All') {
        nextPath = this.departmentCollectionPath(this.activeCollection);
      } else if (this.activeProductGroup !== 'All') {
        nextPath = this.activeCategory !== 'All'
          ? this.departmentProductGroupCategoryPath(this.activeProductGroup, this.activeCategory)
          : this.departmentProductGroupPath(this.activeProductGroup);
      } else if (this.pageType === 'category' && this.activeCategory !== 'All') {
        nextPath = this.departmentCatalogPath(categoryRouteSlug(this.activeDepartment, this.activeCategory));
      } else if (this.pageType !== 'landing' || this.searchQuery.trim() || this.hasAppliedCatalogFilters) {
        nextPath = this.departmentCatalogPath(ALL_PRODUCTS_SEGMENT);
      }

      if (this.searchQuery.trim()) {
        nextQuery.q = this.searchQuery.trim();
      }

      if (this.pageType === 'collection') {
        nextQuery.department = this.collectionDepartmentFilter;

        if (this.activeProductGroup !== 'All') {
          nextQuery.group = this.activeProductGroup;
        }
      }

      if (
        this.activeProductGroup !== 'All' &&
        (this.browseView === 'new' || this.browseView === 'best')
      ) {
        nextQuery.view = this.browseView;
      }

      if (
        (this.pageType === 'special' || this.pageType === 'collection') &&
        this.activeCategory !== 'All'
      ) {
        nextQuery.category = this.activeCategory;
      }

      if (this.activeFit !== 'All') {
        nextQuery.fit = this.activeFit;
      }

      const shouldKeepCategorySpecificFilters = this.activeCategory !== 'All';

      if (shouldKeepCategorySpecificFilters && this.activeNeckline !== 'All') {
        nextQuery.neckline = this.activeNeckline;
      }

      if (shouldKeepCategorySpecificFilters && this.activeWaistRise !== 'All') {
        nextQuery.waist_rise = this.activeWaistRise;
      }

      if (shouldKeepCategorySpecificFilters && this.activeSleeveLength !== 'All') {
        nextQuery.sleeve_length = this.activeSleeveLength;
      }

      if (shouldKeepCategorySpecificFilters && this.activeGarmentLength !== 'All') {
        nextQuery.length = this.activeGarmentLength;
      }

      if (this.activeStyle !== 'All') {
        nextQuery.style = this.activeStyle;
      }

      if (shouldKeepCategorySpecificFilters && this.activeHeelHeight !== 'All') {
        nextQuery.heel_height = this.activeHeelHeight;
      }

      if (this.activeMaterial !== 'All') {
        nextQuery.material = this.activeMaterial;
      }

      if (this.sortBy !== 'newest' && !(this.isSalePage && this.sortBy === 'discount-desc')) {
        nextQuery.sort = this.sortBy;
      }

      if (this.activeColor !== 'All') {
        nextQuery.color = this.activeColor;
      }

      if (this.activeSize !== 'All') {
        nextQuery.size = this.activeSize;
      }

      if (this.priceMin !== '') {
        nextQuery.minPrice = String(this.priceMin);
      }

      if (this.priceMax !== '') {
        nextQuery.maxPrice = String(this.priceMax);
      }

      if (this.currentPage > 1) {
        nextQuery.page = String(this.currentPage);
      }

      const currentQuery = JSON.stringify(this.$route.query || {});
      const targetQuery = JSON.stringify(nextQuery);

      if (this.$route.path === nextPath && currentQuery === targetQuery) {
        return;
      }

      this.$router.replace({
        path: nextPath,
        query: nextQuery
      });
    },
    handleTabKeydown(event, category) {
      const tabs = this.visibleCategories;
      const currentIndex = tabs.findIndex(c =>
        (c.id || c.slug || c.name) === (category.id || category.slug || category.name)
      );
      let nextIndex;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        event.preventDefault();
        nextIndex = 0;
      } else if (event.key === 'End') {
        event.preventDefault();
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      const tabListEl = this.$el.querySelector('[role="tablist"]');
      if (tabListEl) {
        const tabButtons = tabListEl.querySelectorAll('[role="tab"]');
        if (tabButtons[nextIndex]) {
          tabButtons[nextIndex].focus();
          this.setCategory(tabs[nextIndex]);
        }
      }
    },
    handleVideoError() {
      this.videoFailures = {
        ...this.videoFailures,
        [this.activeDepartment]: true
      };
    },
    collectionImageUrl(collection) {
      const departmentBanner = (Array.isArray(collection.departments) ? collection.departments : [])
        .find(department =>
          normalizeDepartment(department.departmentName) === this.activeDepartment &&
          String(department.status || 'active').toLowerCase() === 'active'
        );
      const departmentImageUrl = String(departmentBanner && departmentBanner.bannerImage || '').trim();
      if (departmentImageUrl) return this.resolveCollectionImageUrl(departmentImageUrl);

      const databaseImageUrl = String(collection.imageUrl || collection.bannerImage || '').trim();

      if (databaseImageUrl) {
        return this.resolveCollectionImageUrl(databaseImageUrl);
      }

      const imageName = String(collection.imageName || '').trim();
      return imageName ? `${import.meta.env.BASE_URL}media/${imageName}` : '';
    },
    resolveCollectionImageUrl(rawUrl) {
      try {
        const parsedUrl = new URL(rawUrl);
        const isUnsplashPage =
          parsedUrl.hostname.includes('unsplash.com') &&
          !parsedUrl.hostname.startsWith('images.') &&
          parsedUrl.pathname.includes('/photos/');

        if (isUnsplashPage) {
          const photoSegment = parsedUrl.pathname.split('/').filter(Boolean).pop() || '';
          const photoId = photoSegment.split('-').pop();

          if (photoId) {
            return `https://source.unsplash.com/${photoId}/1200x900`;
          }
        }
      } catch {
        return rawUrl;
      }

      return rawUrl;
    },
    collectionImageKey(collection) {
      return `${this.activeDepartment}-${collection.key}-${this.collectionImageUrl(collection)}`;
    },
    isCollectionImageFailed(collection) {
      return Boolean(this.collectionImageFailures[this.collectionImageKey(collection)]);
    },
    handleCollectionImageError(collection) {
      this.collectionImageFailures = {
        ...this.collectionImageFailures,
        [this.collectionImageKey(collection)]: true
      };
    },
    async loadDepartmentCategories() {
      const department = this.activeDepartment;

      if (this.categoryDataDepartment !== department) {
        const [categories, groups] = await Promise.all([
          catalogStore.getDepartmentCategories(department),
          catalogStore.getDepartmentGroups(department)
        ]);

        if (this.activeDepartment !== department) {
          return;
        }

        this.departmentCategoryItems = categories;
        this.departmentProductGroupItems = mergeProductGroups(department, groups, categories);
        this.categoryDataDepartment = department;
      }

      if (this.pageType === 'category' && this.activeCategory !== 'All' && this.activeProductGroup === 'All') {
        const productGroupRecord = this.findProductGroupRecord(this.activeCategory);
        const categoryGroup = productGroupRecord ? null : this.findCategoryProductGroupRecord(this.activeCategory);

        if (productGroupRecord) {
          this.activeProductGroup = this.productGroupQueryValue(productGroupRecord);
          this.activeCategory = 'All';
          this.pageType = 'product-group';
          this.pageKey = this.activeProductGroup;
        } else if (categoryGroup) {
          this.activeProductGroup = this.productGroupQueryValue(categoryGroup);
        }
      }

      const allowedProductGroups = ['All', ...this.departmentProductGroupItems.flatMap(item => [item.slug, item.name, item.label])];
      const normalizedAllowedProductGroups = allowedProductGroups.map(normalizeCategoryIdentity);

      if (
        this.activeProductGroup !== 'All' &&
        !this.departmentProductGroupItems.some(group => recordMatchesIdentity(group, this.activeProductGroup)) &&
        !normalizedAllowedProductGroups.includes(normalizeCategoryIdentity(this.activeProductGroup))
      ) {
        this.activeProductGroup = 'All';

        if (this.pageType === 'product-group' || this.pageType === 'product-group-category') {
          this.pageType = 'all-products';
          this.pageKey = ALL_PRODUCTS_SEGMENT;
          this.activeCategory = 'All';
          this.updateRouteFilters();
          return;
        }
      }

      const scopedCategories = this.activeProductGroup === 'All'
        ? this.flatDepartmentCategories
        : (this.findProductGroupRecord(this.activeProductGroup)?.categories || []);
      const categoryAllowed = this.activeCategory === 'All' ||
        scopedCategories.some(category => recordMatchesIdentity(category, this.activeCategory));

      if (!categoryAllowed) {
        this.activeCategory = 'All';

        if (!this.isEditorialLanding) {
          if (this.pageType === 'category' || this.pageType === 'product-group-category') {
            this.pageType = this.activeProductGroup === 'All' ? 'all-products' : 'product-group';
            this.pageKey = this.activeProductGroup === 'All' ? ALL_PRODUCTS_SEGMENT : this.activeProductGroup;
          }

          this.updateRouteFilters();
        }
      }

      this.applyGroupScopedQueryFilters();
    }
  };
