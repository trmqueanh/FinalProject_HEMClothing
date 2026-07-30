<template>
  <div class="page-section shop-view" :class="{ 'shop-view--landing': isEditorialLanding }">
    <ShopLandingView
      v-if="isEditorialLanding"
      :hero-media-key="heroMediaKey"
      :show-hero-video="showHeroVideo"
      :hero-video-sources="heroVideoSources"
      :active-department-label="activeDepartmentLabel"
      :editorial-content="editorialContent"
      :all-products-link="allProductsLink"
      :department-categories="flatDepartmentCategories"
      :hero-collections="heroCollections"
      :popular-category-items="landingPopularCategoryItems"
      :collection-image-url="collectionImageUrl"
      :is-collection-image-failed="isCollectionImageFailed"
      :format-category-label="formatCategoryLabel"
      :featured-collections="landingFeaturedCollections"
      :group-showcases="landingGroupShowcases"
      :sale-circle-items="saleCircleItems"
      :sale-circle-title="saleCircleTitle"
      :sale-highlights="saleHighlights"
      :coupons="coupons"
      :is-loading-coupons="isLoadingCoupons"
      :format-currency="formatCurrency"
      @video-error="handleVideoError"
      @collection-image-error="handleCollectionImageError"
    />

    <ShopCatalogView
      v-else
      :breadcrumb-items="breadcrumbItems"
      :catalog-heading="catalogHeading"
      :catalog-view-label="catalogViewLabel"
      :active-category="activeCategory"
      :active-product-group="activeProductGroup"
      :active-collection="pageType === 'collection' ? currentCollectionLabel : activeCollection"
      :active-collection-scope="activeCollectionScope"
      :active-gender="activeGender"
      :active-color="activeColor"
      :active-fit="activeFit"
      :active-garment-length="activeGarmentLength"
      :active-heel-height="activeHeelHeight"
      :active-material="activeMaterial"
      :active-neckline="activeNeckline"
      :active-size="activeSize"
      :active-sleeve-length="activeSleeveLength"
      :active-style="activeStyle"
      :active-waist-rise="activeWaistRise"
      :active-price-min="activePriceMin"
      :active-price-max="activePriceMax"
      :sort-by="sortBy"
      :visible-categories="visibleCategories"
      :is-category-active="isCategoryActive"
      :format-category-label="formatCategoryLabel"
      :item-count="filteredProducts.length"
      :price-range="priceRange"
      :sort-options="sortOptions"
      :category-filter-label="categoryFilterLabel"
      :category-options="categoryFilterOptions"
      :product-group-options="collectionProductGroupOptions"
      :collections="collections"
      :collection-scope-tabs="collectionScopeTabs"
      :collection-banner-items="collectionBannerItems"
      :color-options="colorOptions"
      :garment-length-options="garmentLengthOptions"
      :gender-options="genderOptions"
      :heel-height-options="heelHeightOptions"
      :material-options="materialOptions"
      :neckline-options="necklineOptions"
      :size-options="sizeOptions"
      :sleeve-length-options="sleeveLengthOptions"
      :show-category-filter="showCategoryFilter"
      :show-product-group-filter="showProductGroupFilter"
      :show-collection-filter="showCollectionFilter"
      :show-fit-filter="showFitFilter"
      :show-gender-filter="showGenderFilter"
      :show-garment-length-filter="showGarmentLengthFilter"
      :show-heel-height-filter="showHeelHeightFilter"
      :show-material-filter="showMaterialFilter"
      :show-neckline-filter="showNecklineFilter"
      :show-size-filter="showSizeFilter"
      :show-sleeve-length-filter="showSleeveLengthFilter"
      :show-style-filter="showStyleFilter"
      :show-waist-rise-filter="showWaistRiseFilter"
      :fit-options="fitOptions"
      :style-filter-label="styleFilterLabel"
      :style-options="styleOptions"
      :waist-rise-options="waistRiseOptions"
      :filter-option-counts="filterOptionCounts"
      :format-currency="formatCurrency"
      :paginated-products="paginatedProducts"
      :safe-current-page="safeCurrentPage"
      :pagination-total-pages="paginationTotalPages"
      :pagination-summary-label="paginationSummaryLabel"
      @select-category="setCategory"
      @select-collection-scope="setCollectionScope"
      @tab-keydown="handleTabKeydown"
      @apply-inline-filter="applyInlineFilter"
      @clear-filters="clearInlineFilters"
      @set-inline-sort="setInlineSort"
      @set-price-filter="setInlinePrice"
      @change-page="setPage"
    />
  </div>
</template>

<script>
import { shopMethods } from "../../controllers/shop/shopMethods";
import { catalogApi } from '../../api/domains/catalogApi';
import ShopCatalogView from '../../components/shop/ShopCatalogView.vue';
import ShopLandingView from '../../components/shop/ShopLandingView.vue';
import { catalogStore, normalizeDepartment } from '../../stores/catalogStore';
import { COLOR_FAMILY_OPTIONS, colorFamilyValue, normalizeColorOption } from '../../helpers/colors';
import {
  ALL_PRODUCTS_SEGMENT,
  BROWSE_VIEW_TO_GROUP,
  EDITORIAL_CONTENT,
  HERO_VIDEOS,
  SIGNATURE_CATEGORY_CONFIG,
  SORT_OPTIONS,
  SPECIAL_PAGE_CONFIG,
  byNewest,
  normalizeCategoryIdentity
} from '../../helpers/shop/shopPageConfig';
import {
  expandProductsToColorCards,
  isListingSaleCard,
  listingCardPrice,
  listingCardSizeValues
} from '../../helpers/shop/listingColorCards';
import { sortSizeLabels } from '../../helpers/sizes';

const countProductFacetValues = (products, valuesForProduct) =>
  products.reduce((counts, product) => {
    const values = [...new Set(valuesForProduct(product).map(value => String(value || '').trim()).filter(Boolean))];

    values.forEach(value => {
      counts[value] = (counts[value] || 0) + 1;
    });

    return counts;
  }, {});

const HEEL_HEIGHT_OPTIONS = ['High heel', 'Mid heel', 'Low heel', 'No heel'];
const LANDING_GROUP_ORDER = ['clothing', 'shoes', 'accessories'];
const LANDING_GROUP_CATEGORY_LIMIT = 8;
const LANDING_GROUP_PRODUCT_LIMIT = 12;
const CATALOG_ROWS_PER_PAGE = 3;

const landingProductIdentity = product =>
  String(product && (product.id || product.productId || product.product_id || product.slug || product.name) || '').trim();

const landingCardIdentity = product =>
  String(product && (
    product.listingKey ||
    product.favoriteKey ||
    product.favorite_key ||
    `${landingProductIdentity(product)}-${product.selectedColorVariantId || product.colorVariantId || product.colorName || product.color || ''}`
  ) || '').trim();

const mixLandingColorCardsByProduct = products => {
  const bucketsByProduct = new Map();

  products.forEach((product, index) => {
    const key = landingProductIdentity(product) || `product-${index}`;
    const bucket = bucketsByProduct.get(key) || [];

    bucket.push({ product, index });
    bucketsByProduct.set(key, bucket);
  });

  const buckets = [...bucketsByProduct.values()]
    .map(items => [...items].sort((left, right) =>
      byNewest(left.product, right.product) || left.index - right.index
    ))
    .sort((left, right) =>
      byNewest(left[0] && left[0].product, right[0] && right[0].product) ||
      (left[0] && left[0].index || 0) - (right[0] && right[0].index || 0)
    );
  const mixed = [];
  let colorIndex = 0;
  let hasMoreColors = true;

  while (hasMoreColors) {
    hasMoreColors = false;

    buckets.forEach(bucket => {
      const item = bucket[colorIndex];

      if (item) {
        mixed.push(item.product);
        hasMoreColors = true;
      }
    });

    colorIndex += 1;
  }

  return mixed;
};

const mixLandingCollectionCards = products => {
  const bucketsByCategory = new Map();

  products.forEach((product, index) => {
    const categoryKey = normalizeCategoryIdentity(
      product.productGroupSlug ||
      product.productGroup ||
      product.categorySlug ||
      product.category ||
      product.categoryLabel ||
      'other'
    ) || 'other';
    const bucket = bucketsByCategory.get(categoryKey) || {
      firstIndex: index,
      products: []
    };

    bucket.products.push(product);
    bucketsByCategory.set(categoryKey, bucket);
  });

  const categoryBuckets = [...bucketsByCategory.values()]
    .map(bucket => ({
      ...bucket,
      products: mixLandingColorCardsByProduct(bucket.products)
    }))
    .sort((left, right) =>
      byNewest(left.products[0], right.products[0]) ||
      left.firstIndex - right.firstIndex
    );
  const mixed = [];
  let productIndex = 0;
  let hasMoreProducts = true;

  while (hasMoreProducts) {
    hasMoreProducts = false;

    categoryBuckets.forEach(bucket => {
      const product = bucket.products[productIndex];

      if (product) {
        mixed.push(product);
        hasMoreProducts = true;
      }
    });

    productIndex += 1;
  }

  return mixed;
};

const catalogColumnCountForViewport = () => {
  if (typeof window === 'undefined') {
    return 4;
  }

  const width = window.innerWidth;

  if (width >= 1920) return 6;
  if (width <= 860) return 2;
  if (width <= 1180) return 3;

  return 4;
};

const optionFromValue = (value, label = value) => ({
  value: String(value || '').trim(),
  label: String(label || value || '').trim()
});

const addOption = (optionsByValue, value, label = value) => {
  const option = optionFromValue(value, label);

  if (option.value && option.label && !optionsByValue[option.value]) {
    optionsByValue[option.value] = option;
  }
};

const sortedOptionList = optionsByValue =>
  Object.values(optionsByValue).sort((left, right) => left.label.localeCompare(right.label));

const productFieldOptionList = (products, valuesForProduct) => {
  const optionsByValue = {};

  products.forEach(product => {
    valuesForProduct(product)
      .map(value => String(value || '').trim())
      .filter(Boolean)
      .forEach(value => addOption(optionsByValue, value, value));
  });

  return sortedOptionList(optionsByValue);
};

const hashValue = value =>
  String(value || '').split('').reduce((total, character) => {
    return (total * 31 + character.charCodeAt(0)) % 1000000007;
  }, 0);

const colorFamilyValuesForProduct = product =>
  Array.isArray(product.colors)
    ? product.colors.map(color => normalizeColorOption(color).value)
    : [];

const colorFamilyValuesForListingCard = product => {
  const listingColor = String(product && (product.listingColorValue || product.listingColorFamily) || '').trim();
  return listingColor ? [colorFamilyValue(listingColor)] : colorFamilyValuesForProduct(product);
};

const distinctStyleValueForProduct = product => {
  const style = String(product && (product.styleSlug || product.styleName) || '').trim();
  const productGroup = normalizeCategoryIdentity(product && (product.productGroupSlug || product.productGroup));
  const styleIdentity = normalizeCategoryIdentity(style);
  const matchesCategory = [product && product.category, product && product.categoryLabel, product && product.categorySlug]
    .map(normalizeCategoryIdentity)
    .filter(Boolean)
    .some(categoryIdentity =>
      categoryIdentity === styleIdentity ||
      categoryIdentity.endsWith(`-${styleIdentity}`) ||
      styleIdentity.endsWith(`-${categoryIdentity}`)
    );

  if (productGroup === 'shoes' && styleIdentity && matchesCategory) {
    return '';
  }

  return style;
};

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
  String(product && (product.pricingMode || product.pricing_mode || product.listingPricingMode || product.listing_pricing_mode || '')).toLowerCase() === 'sale' ||
  Boolean(product && (product.isSale || product.is_sale || product.hasSalePricing || product.has_sale_pricing)) ||
  hasVariantSalePrice(product);

const buildColorFamilyOptions = products => {
  const colorsByValue = {};

  products.forEach(product => {
    (Array.isArray(product.colors) ? product.colors : []).forEach(color => {
      const option = normalizeColorOption(color);
      const value = option.value;

      if (!value || colorsByValue[value]) {
        return;
      }

      colorsByValue[value] = {
        name: option.family,
        label: option.family,
        value,
        hex: option.swatch || option.hex,
        swatch: option.swatch || option.hex
      };
    });
  });

  return COLOR_FAMILY_OPTIONS
    .map(family => colorsByValue[colorFamilyValue(family)])
    .filter(Boolean);
};

export default {
  name: 'ShopPage',
  components: {
    ShopCatalogView,
    ShopLandingView
  },
  data() {
    return {
      products: catalogStore.getCachedProducts(),
      materialMasterOptions: catalogStore.getCachedMaterials(),
      landingCollections: catalogStore.getCachedLandingCollections(),
      allCollections: catalogStore.getCachedCollections(),
      departmentCategoryItems: [],
      departmentProductGroupItems: [],
      coupons: [],
      isLoadingCoupons: true,
      landingCategorySeed: Date.now(),
      searchQuery: '',
      activeProductGroup: 'All',
      activeCategory: 'All',
      activeCollection: 'All',
      activeFit: 'All',
      activeGarmentLength: 'All',
      activeHeelHeight: 'All',
      activeMaterial: 'All',
      activeNeckline: 'All',
      activeStyle: 'All',
      activeSleeveLength: 'All',
      activeWaistRise: 'All',
      sortBy: 'newest',
      browseView: 'landing',
      pageType: 'landing',
      pageKey: '',
      activeColor: 'All',
      activeSize: 'All',
      priceMin: '',
      priceMax: '',
      currentPage: 1,
      categoryDataDepartment: '',
      videoFailures: {
        women: false,
        men: false
      },
      collectionImageFailures: {},
      catalogColumnCount: catalogColumnCountForViewport()
    };
  },
  computed: {
    activeDepartment() {
      if (this.$route.path === '/sale') {
        const saleDepartment = String(this.$route.query.department || '').toLowerCase();
        if (saleDepartment === 'men') return 'men';
        if (saleDepartment === 'women') return 'women';
      }

      return this.$route.meta.department === 'men' || this.$route.path.startsWith('/men') ? 'men' : 'women';
    },
    activeDepartmentLabel() {
      return this.activeDepartment.charAt(0).toUpperCase() + this.activeDepartment.slice(1);
    },
    isSalePage() {
      return this.pageType === 'sale' || this.$route.path === '/sale';
    },
    isGlobalCollectionPage() {
      return this.$route.path === '/collections' || this.$route.path.startsWith('/collections/');
    },
    saleDepartmentFilter() {
      const department = String(this.$route.query.department || '').toLowerCase();
      return department === 'men' || department === 'women' ? department : 'women';
    },
    saleDepartmentLabel() {
      return this.saleDepartmentFilter === 'men' ? 'Men' : this.saleDepartmentFilter === 'women' ? 'Women' : '';
    },
    collectionDepartmentFilter() {
      if (!this.isGlobalCollectionPage) {
        return '';
      }

      const department = String(this.$route.query.department || '').toLowerCase();
      if (
        (department === 'men' || department === 'women') &&
        (!this.collectionAvailableDepartments.length || this.collectionAvailableDepartments.includes(department))
      ) {
        return department;
      }

      if (this.collectionAvailableDepartments.includes('women')) return 'women';
      return this.collectionAvailableDepartments[0] || 'women';
    },
    activeCollectionScope() {
      if (this.isSalePage) return this.saleDepartmentFilter;
      return this.collectionDepartmentFilter;
    },
    activeGender() {
      if (this.isSalePage) {
        return this.saleDepartmentFilter;
      }

      return this.collectionDepartmentFilter;
    },
    departmentLandingLink() {
      return {
        path: this.activeDepartment === 'men' ? '/men' : '/women'
      };
    },
    allProductsLink() {
      return {
        path: this.departmentCatalogPath(ALL_PRODUCTS_SEGMENT)
      };
    },
    hasAppliedCatalogFilters() {
      const hasCategorySpecificContext = this.activeCategory !== 'All';

      return (
        (this.pageType === 'collection' && this.activeProductGroup !== 'All') ||
        ((this.pageType === 'special' || this.pageType === 'collection') && this.activeCategory !== 'All') ||
        this.activeFit !== 'All' ||
        (hasCategorySpecificContext && this.activeGarmentLength !== 'All') ||
        (hasCategorySpecificContext && this.activeHeelHeight !== 'All') ||
        this.activeMaterial !== 'All' ||
        (hasCategorySpecificContext && this.activeNeckline !== 'All') ||
        (hasCategorySpecificContext && this.activeSleeveLength !== 'All') ||
        this.activeStyle !== 'All' ||
        (hasCategorySpecificContext && this.activeWaistRise !== 'All') ||
        this.sortBy !== 'newest' ||
        this.activeColor !== 'All' ||
        this.activeSize !== 'All' ||
        this.priceMin !== '' ||
        this.priceMax !== ''
      );
    },
    editorialContent() {
      return EDITORIAL_CONTENT[this.activeDepartment];
    },
    heroVideoSources() {
      return HERO_VIDEOS[this.activeDepartment];
    },
    heroMediaKey() {
      return `${this.activeDepartment}-${this.heroVideoSources[0] || 'fallback'}`;
    },
    showHeroVideo() {
      return !this.videoFailures[this.activeDepartment];
    },
    departmentProducts() {
      if (this.isSalePage) {
        return this.products.filter(product => normalizeDepartment(product.gender) === this.saleDepartmentFilter);
      }

      if (this.isGlobalCollectionPage) {
        return this.products.filter(product => normalizeDepartment(product.gender) === this.collectionDepartmentFilter);
      }

      return this.products.filter(product => normalizeDepartment(product.gender) === this.activeDepartment);
    },
    saleScopeProducts() {
      return this.products.filter(product => isSaleProduct(product));
    },
    sortOptions() {
      return this.isSalePage
        ? SORT_OPTIONS.filter(option => option.value !== 'discount-desc')
        : SORT_OPTIONS;
    },
    selectedProductGroup() {
      return BROWSE_VIEW_TO_GROUP[this.browseView] || 'all';
    },
    currentSpecialPage() {
      return this.pageType === 'special' ? SPECIAL_PAGE_CONFIG[this.pageKey] || null : null;
    },
    currentCollectionLabel() {
      return this.pageType === 'collection'
        ? this.collectionLabelForValue(this.activeCollection)
        : '';
    },
    currentCollectionRecord() {
      if (this.pageType !== 'collection' || this.activeCollection === 'All') return null;
      const identity = normalizeCategoryIdentity(this.activeCollection);

      return this.allCollections.find(collection =>
        [collection.slug, collection.name, collection.label]
          .map(normalizeCategoryIdentity)
          .includes(identity)
      ) || null;
    },
    collectionAvailableDepartments() {
      const configured = Array.isArray(this.currentCollectionRecord?.departments)
        ? this.currentCollectionRecord.departments
            .filter(department => String(department.status || 'active').toLowerCase() === 'active')
            .map(department => normalizeDepartment(department.departmentName))
            .filter(department => department === 'women' || department === 'men')
        : [];

      if (configured.length) return [...new Set(configured)];

      return [...new Set(
        this.products
          .filter(product => [product.collectionSlug, product.collection]
            .map(normalizeCategoryIdentity)
            .includes(normalizeCategoryIdentity(this.activeCollection)))
          .map(product => normalizeDepartment(product.gender))
      )].filter(department => department === 'women' || department === 'men');
    },
    collectionScopeProducts() {
      if (this.pageType !== 'collection' || this.activeCollection === 'All') {
        return [];
      }

      const collectionIdentity = normalizeCategoryIdentity(this.activeCollection);
      return this.products.filter(product =>
        [product.collectionSlug, product.collection]
          .map(normalizeCategoryIdentity)
          .includes(collectionIdentity) &&
        this.collectionAvailableDepartments.includes(normalizeDepartment(product.gender))
      );
    },
    collectionProductsInScope() {
      if (!this.collectionScopeProducts.length) {
        return [];
      }

      return this.collectionScopeProducts.filter(product => normalizeDepartment(product.gender) === this.collectionDepartmentFilter);
    },
    collectionScopeTabs() {
      if (this.isSalePage) {
        const availableDepartments = new Set(
          this.saleScopeProducts.map(product => normalizeDepartment(product.gender))
        );

        return [
          availableDepartments.has('women') ? { value: 'women', label: 'Women' } : null,
          availableDepartments.has('men') ? { value: 'men', label: 'Men' } : null
        ].filter(Boolean);
      }

      if (this.pageType !== 'collection' || !this.collectionAvailableDepartments.length) return [];

      return [
        this.collectionAvailableDepartments.includes('women') ? { value: 'women', label: 'Women' } : null,
        this.collectionAvailableDepartments.includes('men') ? { value: 'men', label: 'Men' } : null
      ].filter(Boolean);
    },
    collectionBannerItems() {
      const departments = Array.isArray(this.currentCollectionRecord?.departments)
        ? this.currentCollectionRecord.departments
        : [];
      const scope = this.collectionDepartmentFilter;

      return departments
        .filter(department =>
          String(department.status || 'active').toLowerCase() === 'active' &&
          (!scope || normalizeDepartment(department.departmentName) === scope) &&
          String(department.bannerImage || '').trim()
        )
        .map(department => ({
          key: normalizeDepartment(department.departmentName),
          label: department.departmentLabel || this.formatCategoryLabel(department.departmentName),
          imageUrl: department.bannerImage
        }));
    },
    genderOptions() {
      if (this.isSalePage) {
        const availableDepartments = new Set(
          this.saleScopeProducts
            .map(product => normalizeDepartment(product.gender))
            .filter(department => department === 'men' || department === 'women')
        );

        return [
          availableDepartments.has('women') ? { value: 'women', label: 'Women' } : null,
          availableDepartments.has('men') ? { value: 'men', label: 'Men' } : null
        ].filter(Boolean);
      }

      if (this.pageType !== 'collection' || !this.collectionScopeProducts.length) {
        return [];
      }

      const availableDepartments = new Set(
        this.collectionScopeProducts
          .map(product => normalizeDepartment(product.gender))
          .filter(department => department === 'men' || department === 'women')
      );

      return [
        availableDepartments.has('women') ? { value: 'women', label: 'Women' } : null,
        availableDepartments.has('men') ? { value: 'men', label: 'Men' } : null
      ].filter(Boolean);
    },
    flatDepartmentCategories() {
      if (this.departmentCategoryItems.length) {
        return this.departmentCategoryItems;
      }

      const categoriesByKey = this.departmentProducts.reduce((accumulator, product) => {
        const label = String(product.categoryLabel || product.category || product.categorySlug || '').trim();
        const slug = String(product.categorySlug || product.category || label).trim();
        const key = normalizeCategoryIdentity(slug || label);

        if (!key || accumulator[key]) {
          return accumulator;
        }

        accumulator[key] = {
          id: key,
          name: slug || label,
          label: label || this.formatCategoryLabel(slug),
          slug: slug || label
        };

        return accumulator;
      }, {});

      const productCategories = Object.values(categoriesByKey).sort((left, right) => left.label.localeCompare(right.label));

      if (productCategories.length) {
        return productCategories;
      }

      return (SIGNATURE_CATEGORY_CONFIG[this.activeDepartment] || []).map(signature => {
        const label = String(signature.label || '').trim();
        const slug = String(signature.category || label.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, '');

        return {
          id: slug,
          name: slug,
          label,
          slug
        };
      }).filter(category => category.label);
    },
    selectedCategoryRecord() {
      if (this.activeCategory === 'All') {
        return null;
      }

      return this.findCategoryRecord(this.activeCategory);
    },
    selectedRouteProductGroupRecord() {
      if (this.activeProductGroup === 'All') {
        return null;
      }

      return this.findProductGroupRecord(this.activeProductGroup);
    },
    selectedRouteProductGroupLabel() {
      const group = this.selectedRouteProductGroupRecord;
      return group ? group.label || this.formatCategoryLabel(group.name) : this.formatCategoryLabel(this.activeProductGroup);
    },
    catalogViewLabel() {
      if (this.selectedProductGroup === 'new_arrival') {
        return 'New Arrivals';
      }

      if (this.selectedProductGroup === 'bestseller') {
        return 'Best Sellers';
      }

      return '';
    },
    catalogHeading() {
      if (this.searchQuery.trim()) {
        return `Search: ${this.searchQuery.trim()}`;
      }

      if (this.currentSpecialPage) {
        return this.currentSpecialPage.label;
      }

      if (this.isSalePage) {
        const groupLabel = this.activeProductGroup !== 'All' ? ` ${this.selectedRouteProductGroupLabel}` : '';
        const categoryLabel = this.activeCategory !== 'All'
          ? ` ${
              this.selectedCategoryRecord
                ? this.selectedCategoryRecord.label || this.formatCategoryLabel(this.selectedCategoryRecord.name)
                : this.formatCategoryLabel(this.activeCategory)
            }`
          : '';
        const departmentLabel = this.saleDepartmentLabel ? `${this.saleDepartmentLabel} ` : '';
        return `${departmentLabel}${groupLabel}${categoryLabel} Sale`.replace(/\s+/g, ' ').trim();
      }

      if (this.pageType === 'collection' && this.currentCollectionLabel) {
        return this.currentCollectionLabel;
      }

      if ((this.pageType === 'category' || this.pageType === 'product-group-category') && this.activeCategory !== 'All') {
        return this.selectedCategoryRecord
          ? this.selectedCategoryRecord.label || this.formatCategoryLabel(this.selectedCategoryRecord.name)
          : this.formatCategoryLabel(this.activeCategory);
      }

      if (this.pageType === 'product-group' && this.activeProductGroup !== 'All') {
        return this.selectedRouteProductGroupLabel;
      }

      if (this.activeFit !== 'All') {
        return `${this.formatCategoryLabel(this.activeFit)} fit`;
      }

      return 'All products';
    },
    breadcrumbItems() {
      if (this.isEditorialLanding) {
        return [];
      }

      if (this.isSalePage) {
        const saleItems = [
          {
            label: 'HEM.COM',
            route: { path: '/women' }
          },
          {
            label: 'Sale',
            route: this.saleDepartmentFilter || this.activeProductGroup !== 'All' ? { path: '/sale' } : undefined,
            current: !this.saleDepartmentFilter && this.activeProductGroup === 'All'
          }
        ];

        if (this.saleDepartmentFilter) {
          saleItems.push({
            label: this.saleDepartmentLabel,
            route: this.activeProductGroup !== 'All' ? { path: '/sale', query: { department: this.saleDepartmentFilter } } : undefined,
            current: this.activeProductGroup === 'All'
          });
        }

        if (this.activeProductGroup !== 'All') {
          saleItems.push({
            label: this.selectedRouteProductGroupLabel,
            current: true
          });
        }

        return saleItems;
      }

      if (this.isGlobalCollectionPage) {
        const collectionItems = [
          {
            label: 'HEM.COM',
            route: { path: '/women' }
          },
          {
            label: 'Collections',
            route: this.activeCollection !== 'All' ? { path: '/collections' } : undefined,
            current: this.activeCollection === 'All'
          }
        ];

        if (this.activeCollection !== 'All') {
          collectionItems.push({
            label: this.currentCollectionLabel || this.formatCategoryLabel(this.activeCollection),
            current: true
          });
        }

        return collectionItems;
      }

      const items = [
        {
          label: 'HEM.COM',
          route: this.departmentLandingLink
        },
        {
          label: this.activeDepartmentLabel,
          route: this.departmentLandingLink
        }
      ];

      if (this.searchQuery.trim()) {
        items.push({
          label: 'Search',
          current: true
        });
        return items;
      }

      if (this.activeProductGroup !== 'All') {
        const groupRoute = {
          path: this.departmentProductGroupPath(this.activeProductGroup)
        };

        items.push({
          label: this.selectedRouteProductGroupLabel,
          route: this.activeCategory === 'All' ? undefined : groupRoute,
          current: this.activeCategory === 'All'
        });

        if (this.activeCategory !== 'All') {
          items.push({
            label: this.selectedCategoryRecord
              ? this.selectedCategoryRecord.label || this.formatCategoryLabel(this.selectedCategoryRecord.name)
              : this.formatCategoryLabel(this.activeCategory),
            current: true
          });
        }

        return items;
      }

      const categoryLabel = this.selectedCategoryRecord
        ? this.selectedCategoryRecord.label || this.formatCategoryLabel(this.selectedCategoryRecord.name)
        : this.formatCategoryLabel(this.activeCategory);
      const pageLabel =
        this.pageType === 'category'
          ? categoryLabel
          : this.pageType === 'special' && this.currentSpecialPage
            ? this.currentSpecialPage.label
            : this.pageType === 'collection'
              ? this.currentCollectionLabel
              : 'All Products';

      items.push({
        label: pageLabel,
        current: true
      });

      return items;
    },
    visibleCategories() {
      if (this.isSalePage) {
        return [];
      }

      if (this.pageType === 'collection') {
        return [];
      }

      const scopedProducts = this.getFilteredProducts({
        category: 'All',
        collection: this.activeCollection,
        fit: this.activeFit,
        garmentLength: this.activeGarmentLength,
        heelHeight: this.activeHeelHeight,
        material: this.activeMaterial,
        neckline: this.activeNeckline,
        color: this.activeColor,
        size: this.activeSize,
        sleeveLength: this.activeSleeveLength,
        style: this.activeStyle,
        waistRise: this.activeWaistRise,
        priceMin: this.activePriceMin,
        priceMax: this.activePriceMax,
        browseView: this.browseView,
        sortBy: this.sortBy
      });
      const availableCategories = this.departmentCategoryItems.filter(category =>
        (this.activeProductGroup === 'All' ||
          normalizeCategoryIdentity(category.productGroupSlug || category.productGroup) === normalizeCategoryIdentity(this.activeProductGroup)) &&
        scopedProducts.some(product => this.matchesCategoryValue(product, this.categoryQueryValue(category)))
      );
      const scopedGroupCategories = this.activeProductGroup === 'All'
        ? availableCategories
        : (this.selectedRouteProductGroupRecord?.categories || []);

      return [
        {
          name: 'All',
          label: this.activeProductGroup !== 'All' ? `All ${this.selectedRouteProductGroupLabel}` : 'All products'
        },
        ...(this.activeProductGroup === 'All' ? availableCategories : scopedGroupCategories)
      ];
    },
    collections() {
      return [...new Set(this.departmentProducts.map(product => product.collection).filter(Boolean))];
    },
    collectionProductGroupOptions() {
      if (this.pageType !== 'collection' && !this.isSalePage) return [];
      const sourceProducts = this.isSalePage
        ? this.departmentProducts.filter(product => isSaleProduct(product))
        : this.collectionProductsInScope;
      const order = ['clothing', 'accessories', 'shoes'];

      return order
        .filter(group => sourceProducts.some(product => this.matchesProductGroupValue(product, group)))
        .map(group => ({ value: group, label: this.formatCategoryLabel(group) }));
    },
    filterFacetProducts() {
      const groupSlug = this.filterProductGroupSlug;
      let sourceProducts = this.departmentProducts;

      if (this.pageType === 'collection') {
        sourceProducts = this.collectionProductsInScope;
      } else if (this.isSalePage) {
        sourceProducts = sourceProducts.filter(product => isSaleProduct(product));
      }

      if (!groupSlug) {
        return sourceProducts;
      }

      return sourceProducts.filter(product =>
        normalizeCategoryIdentity(product.productGroupSlug || product.productGroup) === groupSlug
      );
    },
    categorySpecificFacetProducts() {
      if (this.activeCategory === 'All') {
        return [];
      }

      return this.filterFacetProducts.filter(product => this.matchesCategoryValue(product, this.activeCategory));
    },
    hasCategorySpecificFilterContext() {
      return this.activeCategory !== 'All' && this.categorySpecificFacetProducts.length > 0;
    },
    categoryFilterOptions() {
      const categoriesByValue = {};

      this.filterFacetProducts.forEach(product => {
        addOption(
          categoriesByValue,
          product.categorySlug || product.category,
          product.categoryLabel || product.category || product.categorySlug
        );
      });

      return sortedOptionList(categoriesByValue);
    },
    categoryFilterLabel() {
      if (this.filterProductGroupSlug === 'shoes') {
        return 'Footwear type';
      }

      if (this.filterProductGroupSlug === 'accessories') {
        return 'Accessory type';
      }

      return 'Category';
    },
    fitOptions() {
      const fitsByValue = {};

      this.filterFacetProducts.forEach(product => {
        addOption(fitsByValue, product.fitSlug || product.fitName || product.fit, product.fitName || product.fit);
      });

      return sortedOptionList(fitsByValue);
    },
    necklineOptions() {
      return productFieldOptionList(this.categorySpecificFacetProducts, product => [product.neckline]);
    },
    waistRiseOptions() {
      return productFieldOptionList(this.categorySpecificFacetProducts, product => [product.waistRise || product.waist_rise]);
    },
    sleeveLengthOptions() {
      return productFieldOptionList(this.categorySpecificFacetProducts, product => [product.sleeveLength || product.sleeve_length]);
    },
    garmentLengthOptions() {
      return productFieldOptionList(this.categorySpecificFacetProducts, product => [product.garmentLength || product.garment_length || product.length]);
    },
    styleOptions() {
      const stylesByValue = {};

      this.filterFacetProducts.forEach(product => {
        const styleValue = distinctStyleValueForProduct(product);
        addOption(stylesByValue, styleValue, styleValue ? product.styleName : '');
      });

      return sortedOptionList(stylesByValue);
    },
    styleFilterLabel() {
      if (this.filterProductGroupSlug === 'shoes') {
        return 'Footwear style';
      }

      if (this.filterProductGroupSlug === 'accessories') {
        return 'Accessory style';
      }

      return 'Style';
    },
    heelHeightOptions() {
      const availableValues = new Set(
        this.categorySpecificFacetProducts
          .map(product => String(product.heelHeight || product.heel_height || '').trim())
          .filter(Boolean)
      );

      return HEEL_HEIGHT_OPTIONS
        .filter(value => availableValues.has(value))
        .map(value => optionFromValue(value));
    },
    materialOptions() {
      const group = this.filterProductGroupSlug;
      const department = this.pageType === 'collection' ? this.collectionDepartmentFilter : this.activeDepartment;
      const materialOptionsByValue = {};

      this.materialMasterOptions
        .filter(material => {
          const optionGroup = normalizeCategoryIdentity(material.productGroupSlug || material.productGroup);
          const optionDepartment = normalizeCategoryIdentity(material.departmentName || material.department);
          return (!group || !optionGroup || optionGroup === group) && (!optionDepartment || optionDepartment === department);
        })
        .forEach(material => {
          addOption(materialOptionsByValue, material.value || material.name || material.label, material.label || material.name || material.value);
        });

      this.filterFacetProducts.forEach(product => {
        (Array.isArray(product.materialFilterValues) ? product.materialFilterValues : []).forEach(material => {
          addOption(materialOptionsByValue, material, material);
        });
      });

      return sortedOptionList(materialOptionsByValue);
    },
    colorOptions() {
      return buildColorFamilyOptions(this.filterFacetProducts);
    },
    sizeOptions() {
      const sourceProducts = this.filterFacetProducts;

      return sortSizeLabels([
        ...new Set(
          sourceProducts.flatMap(product =>
            Array.isArray(product.sizes) ? product.sizes.map(size => String(size || '').trim()).filter(Boolean) : []
          )
        )
      ]);
    },
    filterProductGroupSlug() {
      if (this.activeProductGroup !== 'All') {
        const group = this.selectedRouteProductGroupRecord;
        return normalizeCategoryIdentity(group && (group.slug || group.name) || this.activeProductGroup);
      }

      return normalizeCategoryIdentity(
        this.selectedCategoryRecord && (this.selectedCategoryRecord.productGroupSlug || this.selectedCategoryRecord.productGroup)
      );
    },
    showCategoryFilter() {
      return (this.isSalePage || this.pageType === 'collection') &&
        this.activeProductGroup !== 'All' &&
        this.categoryFilterOptions.length > 0;
    },
    showProductGroupFilter() {
      return (this.pageType === 'collection' || this.isSalePage) && this.collectionProductGroupOptions.length > 0;
    },
    showCollectionFilter() {
      return this.pageType !== 'collection' && this.collections.length > 0;
    },
    showGenderFilter() {
      return false;
    },
    showFitFilter() {
      return this.fitOptions.length > 0;
    },
    showNecklineFilter() {
      return this.hasCategorySpecificFilterContext && this.necklineOptions.length > 0;
    },
    showWaistRiseFilter() {
      return this.hasCategorySpecificFilterContext && this.waistRiseOptions.length > 0;
    },
    showSleeveLengthFilter() {
      return this.hasCategorySpecificFilterContext && this.sleeveLengthOptions.length > 0;
    },
    showGarmentLengthFilter() {
      return this.hasCategorySpecificFilterContext && this.garmentLengthOptions.length > 0;
    },
    showStyleFilter() {
      return (
        (this.pageType !== 'collection' && !this.isSalePage) ||
        this.activeProductGroup !== 'All'
      ) && this.styleOptions.length > 0;
    },
    showHeelHeightFilter() {
      return this.hasCategorySpecificFilterContext && this.heelHeightOptions.length > 0;
    },
    showMaterialFilter() {
      return this.materialOptions.length > 0;
    },
    showSizeFilter() {
      return this.sizeOptions.length > 0;
    },
    filterOptionCounts() {
      const baseFilters = {
        category: this.activeCategory,
        collection: this.activeCollection,
        fit: this.activeFit,
        garmentLength: this.activeGarmentLength,
        heelHeight: this.activeHeelHeight,
        material: this.activeMaterial,
        neckline: this.activeNeckline,
        color: this.activeColor,
        size: this.activeSize,
        sleeveLength: this.activeSleeveLength,
        style: this.activeStyle,
        waistRise: this.activeWaistRise,
        priceMin: this.activePriceMin,
        priceMax: this.activePriceMax,
        productGroup: this.activeProductGroup,
        browseView: this.browseView,
        sortBy: this.sortBy
      };
      const productsWithoutCategory = this.getFilteredListingCards({
        ...baseFilters,
        category: 'All'
      });
      const productsWithoutProductGroup = this.getFilteredListingCards({
        ...baseFilters,
        productGroup: 'All',
        category: 'All',
        style: 'All'
      });
      const productsWithoutCollection = this.getFilteredListingCards({
        ...baseFilters,
        collection: 'All',
      });
      const productsWithoutColor = this.getFilteredListingCards({
        ...baseFilters,
        color: 'All',
      });
      const productsWithoutSize = this.getFilteredListingCards({
        ...baseFilters,
        size: 'All',
      });
      const productsWithoutFit = this.getFilteredListingCards({
        ...baseFilters,
        fit: 'All',
      });
      const productsWithoutNeckline = this.getFilteredListingCards({
        ...baseFilters,
        neckline: 'All'
      });
      const productsWithoutWaistRise = this.getFilteredListingCards({
        ...baseFilters,
        waistRise: 'All'
      });
      const productsWithoutSleeveLength = this.getFilteredListingCards({
        ...baseFilters,
        sleeveLength: 'All'
      });
      const productsWithoutGarmentLength = this.getFilteredListingCards({
        ...baseFilters,
        garmentLength: 'All'
      });
      const productsWithoutStyle = this.getFilteredListingCards({
        ...baseFilters,
        style: 'All'
      });
      const productsWithoutHeelHeight = this.getFilteredListingCards({
        ...baseFilters,
        heelHeight: 'All'
      });
      const productsWithoutMaterial = this.getFilteredListingCards({
        ...baseFilters,
        material: 'All'
      });

      return {
        productGroup: countProductFacetValues(productsWithoutProductGroup, product => [
          normalizeCategoryIdentity(product.productGroupSlug || product.productGroup)
        ]),
        category: countProductFacetValues(productsWithoutCategory, product => [product.categorySlug || product.category]),
        collection: countProductFacetValues(productsWithoutCollection, product => [product.collection]),
        color: countProductFacetValues(productsWithoutColor, colorFamilyValuesForListingCard),
        size: countProductFacetValues(productsWithoutSize, listingCardSizeValues),
        fit: countProductFacetValues(productsWithoutFit, product => [product.fitSlug || product.fitName || product.fit]),
        neckline: countProductFacetValues(productsWithoutNeckline, product => [product.neckline]),
        waistRise: countProductFacetValues(productsWithoutWaistRise, product => [product.waistRise || product.waist_rise]),
        sleeveLength: countProductFacetValues(productsWithoutSleeveLength, product => [product.sleeveLength || product.sleeve_length]),
        garmentLength: countProductFacetValues(productsWithoutGarmentLength, product => [product.garmentLength || product.garment_length || product.length]),
        style: countProductFacetValues(productsWithoutStyle, product => [distinctStyleValueForProduct(product)]),
        heelHeight: countProductFacetValues(productsWithoutHeelHeight, product => [product.heelHeight || product.heel_height]),
        material: countProductFacetValues(productsWithoutMaterial, product =>
          Array.isArray(product.materialFilterValues) ? product.materialFilterValues : []
        )
      };
    },
    priceRange() {
      const prices = expandProductsToColorCards(this.departmentProducts, {
        activeColor: this.activeColor
      })
        .map(product => listingCardPrice(product))
        .filter(price => Number.isFinite(price) && price >= 0);

      if (!prices.length) {
        return { min: 0, max: 0 };
      }

      const min = Math.floor(Math.min(...prices));
      const max = Math.ceil(Math.max(...prices));
      return {
        min,
        max: max > min ? max : min + 1
      };
    },
    activePriceMin() {
      const value = Number(this.priceMin);
      return Number.isFinite(value) && this.priceMin !== '' ? value : this.priceRange.min;
    },
    activePriceMax() {
      const value = Number(this.priceMax);
      return Number.isFinite(value) && this.priceMax !== '' ? value : this.priceRange.max;
    },
    isEditorialLanding() {
      return (
        this.pageType === 'landing' &&
        this.browseView === 'landing' &&
        !this.searchQuery.trim() &&
        this.activeProductGroup === 'All' &&
        this.activeCategory === 'All' &&
        this.activeCollection === 'All' &&
        this.activeFit === 'All' &&
        this.activeGarmentLength === 'All' &&
        this.activeHeelHeight === 'All' &&
        this.activeMaterial === 'All' &&
        this.activeNeckline === 'All' &&
        this.activeSleeveLength === 'All' &&
        this.activeStyle === 'All' &&
        this.activeWaistRise === 'All' &&
        this.sortBy === 'newest' &&
        this.activeColor === 'All' &&
        this.activeSize === 'All' &&
        this.priceMin === '' &&
        this.priceMax === ''
      );
    },
    newProductHighlights() {
      const mixProducts = products =>
        [...products].sort((left, right) =>
          hashValue(`${this.landingCategorySeed}-new-products-${left.listingKey || left.id || left.slug || left.name}`) -
          hashValue(`${this.landingCategorySeed}-new-products-${right.listingKey || right.id || right.slug || right.name}`)
        );
      const newArrivalCards = expandProductsToColorCards(this.departmentProducts.filter(product => product.newArrival || product.new_arrival));
      const departmentCards = expandProductsToColorCards(this.departmentProducts);
      const candidates = mixProducts(newArrivalCards);

      if (candidates.length) {
        return candidates.slice(0, 12);
      }

      return mixProducts(departmentCards).slice(0, 12);
    },
    bestsellerHighlights() {
      return expandProductsToColorCards(this.departmentProducts)
        .filter(product => Number(product.soldCount || 0) > 0)
        .sort((left, right) => Number(right.soldCount || 0) - Number(left.soldCount || 0))
        .slice(0, 12);
    },
    saleHighlights() {
      return expandProductsToColorCards(this.departmentProducts)
        .filter(product => isSaleProduct(product) || isListingSaleCard(product))
        .sort((left, right) => {
          const leftDiscount = productListingComparePrice(left) - productListingPrice(left);
          const rightDiscount = productListingComparePrice(right) - productListingPrice(right);
          return rightDiscount - leftDiscount;
        })
        .slice(0, 12);
    },
    saleCircleItems() {
      if (!this.isEditorialLanding) {
        return [];
      }

      const imageForProduct = product => {
        const images = Array.isArray(product.productImages) ? product.productImages : [];
        const primaryImage = images.find(image => image && (image.isPrimary || image.is_primary)) || images[0];

        return String(
          (primaryImage && (primaryImage.imageUrl || primaryImage.image_url || primaryImage.url)) ||
          product.imageUrl ||
          product.image_url ||
          (Array.isArray(product.images) ? product.images[0] : '') ||
          ''
        ).trim();
      };
      const sourceProducts = this.departmentProducts.filter(isSaleProduct);
      const saleDiscountValue = product =>
        productListingComparePrice(product) - productListingPrice(product);
      const productsByDiscount = products =>
        [...products].sort((left, right) =>
          saleDiscountValue(right) - saleDiscountValue(left) ||
          hashValue(`${this.landingCategorySeed}-sale-${left.id || left.slug || left.name}`) -
          hashValue(`${this.landingCategorySeed}-sale-${right.id || right.slug || right.name}`)
        );
      const usedSaleImages = new Set();
      const uniqueSaleImage = products => {
        const candidates = productsByDiscount(products)
          .map(product => imageForProduct(product))
          .filter(Boolean);
        const image = candidates.find(candidate => !usedSaleImages.has(candidate)) || candidates[0] || '';

        if (image) {
          usedSaleImages.add(image);
        }

        return image;
      };

      if (!sourceProducts.length) {
        return [];
      }

      const saleRoute = extraQuery => ({
        path: '/sale',
        query: {
          department: this.activeDepartment,
          ...extraQuery
        }
      });
      const items = [
        {
          key: 'sale-all',
          label: 'All Sale',
          badgeText: 'SALE',
          tone: 'sale',
          route: saleRoute({})
        }
      ];

      this.departmentProductGroupItems.forEach(group => {
        const groupValue = this.productGroupQueryValue(group);
        const products = sourceProducts.filter(product => this.matchesProductGroupValue(product, groupValue));

        if (!groupValue || !products.length) {
          return;
        }

        items.push({
          key: `sale-group-${groupValue}`,
          label: group.label || group.name || this.formatCategoryLabel(groupValue),
          imageUrl: uniqueSaleImage(products),
          badgeText: 'SALE',
          tone: 'sale',
          route: saleRoute({ group: groupValue })
        });
      });

      const seenCategories = new Set();
      sourceProducts.forEach(product => {
        const categoryValue = String(product.categorySlug || product.category || product.categoryLabel || '').trim();
        const categoryKey = normalizeCategoryIdentity(categoryValue);

        if (!categoryKey || seenCategories.has(categoryKey)) {
          return;
        }

        seenCategories.add(categoryKey);
        items.push({
          key: `sale-category-${categoryKey}`,
          label: product.categoryLabel || product.category || this.formatCategoryLabel(categoryValue),
          imageUrl: uniqueSaleImage(
            sourceProducts.filter(item => this.matchesCategoryValue(item, categoryValue))
          ),
          badgeText: 'SALE',
          tone: 'sale',
          route: saleRoute({ category: categoryValue })
        });
      });

      return items.slice(0, 12);
    },
    saleCircleTitle() {
      const discounts = this.departmentProducts
        .filter(product => isSaleProduct(product))
        .map(product => {
          const explicitPercent = Number(product.saleDiscountPercent ?? product.sale_discount_percent ?? 0);

          if (Number.isFinite(explicitPercent) && explicitPercent > 0) {
            return Math.ceil(explicitPercent);
          }

          const price = productListingPrice(product);
          const originalPrice = productListingComparePrice(product);

          return originalPrice > price && originalPrice > 0
            ? Math.ceil(((originalPrice - price) / originalPrice) * 100)
            : 0;
        })
        .filter(percent => percent > 0);

      return discounts.length ? `Sale Up To ${Math.max(...discounts)}%` : 'Sale Picks';
    },
    landingGroupShowcases() {
      const imageForProduct = product => {
        const images = Array.isArray(product && product.productImages) ? product.productImages : [];
        const primaryImage = images.find(image => image && (image.isPrimary || image.is_primary)) || images[0];

        return String(
          (primaryImage && (primaryImage.imageUrl || primaryImage.image_url || primaryImage.url)) ||
          (product && (product.imageUrl || product.image_url)) ||
          (product && Array.isArray(product.images) ? product.images[0] : '') ||
          ''
        ).trim();
      };
      const groupBySlug = this.departmentProductGroupItems.reduce((groups, group) => {
        const key = normalizeCategoryIdentity(this.productGroupQueryValue(group) || group.slug || group.name || group.label);

        if (key) {
          groups[key] = group;
        }

        return groups;
      }, {});
      const categoryFallback = (groupSlug, groupLabel) => ({
        id: groupSlug,
        name: groupSlug,
        slug: groupSlug,
        label: groupLabel
      });

      return LANDING_GROUP_ORDER.map((groupSlug, groupIndex) => {
        const groupRecord = groupBySlug[groupSlug] || {
          id: groupSlug,
          name: groupSlug,
          slug: groupSlug,
          label: this.formatCategoryLabel(groupSlug),
          categories: []
        };
        const groupValue = this.productGroupQueryValue(groupRecord) || groupSlug;
        const groupLabel = groupRecord.label || groupRecord.name || this.formatCategoryLabel(groupSlug);
        const groupProducts = this.departmentProducts.filter(product => this.matchesProductGroupValue(product, groupValue));
        const groupColorCards = expandProductsToColorCards(groupProducts);
        const categoriesByKey = new Map();
        const addCategory = (category, sourceIndex = 0) => {
          const categoryValue = this.categoryQueryValue(category);
          const label = category.label || category.name || this.formatCategoryLabel(categoryValue);
          const key = normalizeCategoryIdentity(categoryValue || label);

          if (!key || categoriesByKey.has(key)) {
            return;
          }

          const products = groupProducts.filter(product => this.matchesCategoryValue(product, categoryValue));

          if (!products.length) {
            return;
          }

          const imageCandidates = [...products].sort((left, right) =>
            hashValue(`${this.landingCategorySeed}-${groupSlug}-${key}-${left.id || left.slug || left.name}`) -
            hashValue(`${this.landingCategorySeed}-${groupSlug}-${key}-${right.id || right.slug || right.name}`)
          )
            .map(product => imageForProduct(product))
            .filter(Boolean);

          categoriesByKey.set(key, {
            key: `${groupSlug}-${key}`,
            label,
            iconText: String(label || groupLabel).slice(0, 2).toUpperCase(),
            imageCandidates,
            sourceIndex,
            productCount: products.length,
            route: {
              path: this.departmentProductGroupCategoryPath(groupRecord, category)
            }
          });
        };

        (Array.isArray(groupRecord.categories) ? groupRecord.categories : [])
          .forEach((category, index) => addCategory(category, index));

        groupProducts.forEach((product, index) => {
          addCategory({
            id: product.categoryId || product.categorySlug || product.category,
            name: product.categorySlug || product.category,
            slug: product.categorySlug || product.category,
            label: product.categoryLabel || product.category || product.categorySlug
          }, index + 1000);
        });

        const groupRoute = {
          path: this.departmentProductGroupPath(groupRecord || categoryFallback(groupSlug, groupLabel))
        };
        const railBucketKey = product =>
          normalizeCategoryIdentity(
            product.categorySlug ||
            product.category ||
            product.categoryLabel ||
            product.collectionSlug ||
            product.collection ||
            product.styleSlug ||
            product.styleName ||
            product.id ||
            product.name
          ) || 'other';
        const mixRailProducts = (products, sectionKey, compareProducts, limit = LANDING_GROUP_PRODUCT_LIMIT) => {
          const bucketsByKey = new Map();

          products.forEach((product, index) => {
            const key = railBucketKey(product);
            const bucket = bucketsByKey.get(key) || [];

            bucket.push({ product, index });
            bucketsByKey.set(key, bucket);
          });

          const buckets = [...bucketsByKey.entries()]
            .map(([key, items]) => ({
              key,
              items: [...items].sort((left, right) =>
                compareProducts(left.product, right.product) ||
                hashValue(`${this.landingCategorySeed}-${groupSlug}-${sectionKey}-${key}-${left.product.listingKey || left.product.id || left.product.slug || left.product.name}`) -
                hashValue(`${this.landingCategorySeed}-${groupSlug}-${sectionKey}-${key}-${right.product.listingKey || right.product.id || right.product.slug || right.product.name}`) ||
                left.index - right.index
              )
            }))
            .sort((left, right) =>
              hashValue(`${this.landingCategorySeed}-${groupSlug}-${sectionKey}-bucket-${left.key}`) -
              hashValue(`${this.landingCategorySeed}-${groupSlug}-${sectionKey}-bucket-${right.key}`)
            );

          if (buckets.length <= 1) {
            return [...products]
              .sort((left, right) =>
                compareProducts(left, right) ||
                hashValue(`${this.landingCategorySeed}-${groupSlug}-${sectionKey}-${left.listingKey || left.id || left.slug || left.name}`) -
                hashValue(`${this.landingCategorySeed}-${groupSlug}-${sectionKey}-${right.listingKey || right.id || right.slug || right.name}`)
              )
              .slice(0, limit);
          }

          const mixed = [];
          let rowIndex = 0;
          let hasMoreItems = true;

          while (hasMoreItems && mixed.length < limit) {
            hasMoreItems = false;

            buckets.forEach(bucket => {
              const item = bucket.items[rowIndex];

              if (item && mixed.length < limit) {
                mixed.push(item.product);
                hasMoreItems = true;
              }
            });

            rowIndex += 1;
          }

          return mixed;
        };
        const fillSectionProducts = (sources, sectionKey, compareProducts) => {
          const selected = [];
          const selectedCardKeys = new Set();

          sources.forEach((source, sourceIndex) => {
            if (selected.length >= LANDING_GROUP_PRODUCT_LIMIT) return;

            mixRailProducts(
              source,
              `${sectionKey}-${sourceIndex}`,
              compareProducts,
              LANDING_GROUP_PRODUCT_LIMIT
            ).forEach(product => {
              const cardKey = landingCardIdentity(product);

              if (selected.length < LANDING_GROUP_PRODUCT_LIMIT && (!cardKey || !selectedCardKeys.has(cardKey))) {
                selected.push(product);
                if (cardKey) selectedCardKeys.add(cardKey);
              }
            });
          });

          return selected;
        };
        const newProductCandidates = groupColorCards.filter(product => product.newArrival || product.new_arrival);
        const newProducts = fillSectionProducts(
          [newProductCandidates, groupColorCards],
          'new',
          byNewest
        );
        const newProductKeys = new Set(newProducts.map(landingProductIdentity).filter(Boolean));
        const newCardKeys = new Set(newProducts.map(landingCardIdentity).filter(Boolean));
        const bestsellerCandidates = groupColorCards.filter(product =>
          Boolean(product.isBestseller || product.is_bestseller) || Number(product.soldCount || 0) > 0
        );
        const bestCompare = (left, right) =>
          Number(right.soldCount || 0) - Number(left.soldCount || 0) || byNewest(left, right);
        const prioritizeAgainstNew = products => [
          products.filter(product => !newProductKeys.has(landingProductIdentity(product))),
          products.filter(product =>
            newProductKeys.has(landingProductIdentity(product)) &&
            !newCardKeys.has(landingCardIdentity(product))
          ),
          products.filter(product => newCardKeys.has(landingCardIdentity(product)))
        ];
        const [distinctBestsellers, alternateColorBestsellers, repeatedBestsellers] =
          prioritizeAgainstNew(bestsellerCandidates);
        const [distinctFallbacks, alternateColorFallbacks, repeatedFallbacks] =
          prioritizeAgainstNew(groupColorCards);
        const bestsellerProducts = fillSectionProducts(
          [
            distinctBestsellers,
            alternateColorBestsellers,
            distinctFallbacks,
            alternateColorFallbacks,
            repeatedBestsellers,
            repeatedFallbacks
          ],
          'best',
          bestCompare
        );
        const productSections = [
          {
            key: 'new',
            label: `New in ${groupLabel}`,
            products: newProducts,
            route: {
              ...groupRoute,
              query: { view: 'new' }
            }
          },
          bestsellerProducts.length
            ? {
                key: 'best',
                label: `Best Sellers in ${groupLabel}`,
                products: bestsellerProducts,
                route: {
                  ...groupRoute,
                  query: { view: 'best' }
                }
              }
            : null
        ].filter(section => section && section.products.length);
        const productRailImages = new Set(
          productSections
            .flatMap(section => section.products)
            .map(product => imageForProduct(product))
            .filter(Boolean)
        );
        const usedCategoryImages = new Set();
        const categoryItems = [...categoriesByKey.values()]
          .sort((left, right) =>
            (left.sourceIndex - right.sourceIndex) ||
            (right.productCount - left.productCount) ||
            left.label.localeCompare(right.label)
          )
          .slice(0, LANDING_GROUP_CATEGORY_LIMIT)
          .map(item => {
            const candidates = Array.isArray(item.imageCandidates) ? item.imageCandidates : [];
            const imageUrl =
              candidates.find(image => !usedCategoryImages.has(image) && !productRailImages.has(image)) ||
              candidates.find(image => !usedCategoryImages.has(image)) ||
              candidates[0] ||
              '';

            if (imageUrl) {
              usedCategoryImages.add(imageUrl);
            }

            const categoryItem = { ...item };
            delete categoryItem.imageCandidates;
            return {
              ...categoryItem,
              imageUrl
            };
          });

        if (!categoryItems.length && !productSections.length) {
          return null;
        }

        return {
          key: `landing-group-${groupSlug}`,
          slug: groupSlug,
          label: groupLabel,
          categoryItems,
          productSections,
          route: groupRoute,
          sortOrder: groupIndex
        };
      }).filter(Boolean);
    },
    landingFeaturedCollections() {
      const collectionRecords = [
        ...this.allCollections,
        ...this.landingCollections
      ];
      const configs = [
        {
          key: 'essentials-collection',
          fallbackLabel: 'Essentials',
          fallbackSlug: 'essentials',
          keywords: ['essential', 'essentials']
        },
        {
          key: 'summer-collection',
          fallbackLabel: 'Summer 2026',
          fallbackSlug: 'summer-2026',
          keywords: ['summer']
        }
      ];
      const valuesForCollection = collection =>
        [collection && collection.slug, collection && collection.name, collection && collection.label]
          .map(normalizeCategoryIdentity)
          .filter(Boolean);
      const valuesForProduct = product =>
        [
          product && product.collectionSlug,
          product && product.collection,
          product && product.collectionLabel,
          product && product.collectionName
        ]
          .map(normalizeCategoryIdentity)
          .filter(Boolean);
      const matchesKeywords = (values, keywords) =>
        values.some(value => keywords.some(keyword => value.includes(normalizeCategoryIdentity(keyword))));

      return configs.map(config => {
        const collection = collectionRecords.find(record =>
          matchesKeywords(valuesForCollection(record), config.keywords)
        );
        const collectionProducts = this.departmentProducts.filter(product =>
          matchesKeywords(valuesForProduct(product), config.keywords)
        );
        const products = mixLandingCollectionCards(
          expandProductsToColorCards(collectionProducts)
        )
          .slice(0, LANDING_GROUP_PRODUCT_LIMIT);

        if (!products.length) {
          return null;
        }

        const slug = String(
          (collection && (collection.slug || collection.name)) ||
          (collectionProducts[0] && (collectionProducts[0].collectionSlug || collectionProducts[0].collection)) ||
          config.fallbackSlug
        ).trim();

        return {
          key: config.key,
          label:
            (collection && (collection.label || collection.name)) ||
            config.fallbackLabel,
          bannerImage: collection ? this.collectionImageUrl(collection) : '',
          products,
          route: {
            path: this.departmentCollectionPath(slug),
            query: {
              department: this.activeDepartment
            }
          }
        };
      }).filter(Boolean);
    },
    signatureCategories() {
      return SIGNATURE_CATEGORY_CONFIG[this.activeDepartment].map(signature => {
        const matchedCategory = this.matchDepartmentCategory(signature.candidates);
        return {
          ...signature,
          category: matchedCategory ? this.categoryQueryValue(matchedCategory) : '',
          meta: matchedCategory
            ? `${matchedCategory.label || this.formatCategoryLabel(matchedCategory.name)} edit`
            : 'Browse the full department'
        };
      });
    },
    heroCollections() {
      return this.landingCollections
        .filter(item =>
          item &&
          (item.name || item.label) &&
          (!Array.isArray(item.availableDepartments) || item.availableDepartments.includes(this.activeDepartment))
        )
        .slice(0, 2)
        .map((item, index) => {
          const label = item.label || item.name;
          const queryValue = item.slug || item.name;

          return {
            key: `collection-${item.id || item.slug || index}`,
            type: 'collection',
            eyebrow: 'Collection',
            label,
            caption: `${this.activeDepartmentLabel} latest collection`,
            imageUrl: this.collectionImageUrl(item),
            imageName: item.imageName || '',
            route: {
              path: this.departmentCollectionPath(queryValue),
              query: {
                department: this.activeDepartment
              }
            }
          };
        });
    },
    landingPopularCategoryItems() {
      const fallbackGroups = this.departmentProductGroupItems.length
        ? this.departmentProductGroupItems
        : [];
      const itemsByKey = new Map();
      const hashValue = value =>
        String(value || '').split('').reduce((total, character) => {
          return (total * 31 + character.charCodeAt(0)) % 1000000007;
        }, 0);
      const imageForProduct = product => {
        const images = Array.isArray(product.productImages) ? product.productImages : [];
        const primaryImage = images.find(image => image && (image.isPrimary || image.is_primary)) || images[0];

        return String(
          (primaryImage && (primaryImage.imageUrl || primaryImage.image_url || primaryImage.url)) ||
          product.imageUrl ||
          product.image_url ||
          (Array.isArray(product.images) ? product.images[0] : '') ||
          ''
        ).trim();
      };
      const iconForGroup = group => {
        const groupKey = normalizeCategoryIdentity(group && (group.slug || group.name || group.label));

        if (groupKey.includes('shoe')) return 'SH';
        if (groupKey.includes('access')) return 'AC';
        return 'CL';
      };
      const colorForIndex = index => [
        '#eaf2ff',
        '#f7efe3',
        '#edf8ee',
        '#f2efff',
        '#fff1ef',
        '#eef7f6'
      ][index % 6];

      fallbackGroups.forEach(group => {
        const groupCategories = Array.isArray(group.categories) ? group.categories : [];
        const shuffledCategories = [...groupCategories]
          .sort((left, right) =>
            hashValue(`${this.landingCategorySeed}-${group.slug}-${left.slug || left.name}`) -
            hashValue(`${this.landingCategorySeed}-${group.slug}-${right.slug || right.name}`)
          );

        shuffledCategories.forEach(category => {
          const categoryValue = this.categoryQueryValue(category);
          const categoryKey = normalizeCategoryIdentity(categoryValue || category.label);

          if (!categoryKey || itemsByKey.has(categoryKey)) {
            return;
          }

          const matchingProducts = this.departmentProducts.filter(product =>
            this.matchesCategoryValue(product, categoryValue) &&
            this.matchesProductGroupValue(product, group.slug || group.name || group.label)
          );
          const imageProduct = [...matchingProducts].sort((left, right) =>
            hashValue(`${categoryKey}-${left.id || left.slug || left.name}`) -
            hashValue(`${categoryKey}-${right.id || right.slug || right.name}`)
          )[0];
          const label = category.label || category.name || this.formatCategoryLabel(categoryValue);

          itemsByKey.set(categoryKey, {
            key: `popular-${categoryKey}`,
            label,
            groupLabel: group.label || group.name || '',
            imageUrl: imageProduct ? imageForProduct(imageProduct) : '',
            iconText: iconForGroup(group),
            fallbackColor: colorForIndex(itemsByKey.size),
            route: {
              path: this.departmentProductGroupCategoryPath(group, category)
            }
          });
        });
      });

      return [...itemsByKey.values()]
        .sort((left, right) =>
          hashValue(`${this.landingCategorySeed}-${left.key}`) -
          hashValue(`${this.landingCategorySeed}-${right.key}`)
        )
        .slice(0, 12);
    },
    catalogTitle() {
      if (this.searchQuery.trim()) {
        return `Results for "${this.searchQuery.trim()}".`;
      }

      if (this.selectedProductGroup === 'new_arrival') {
        const groupLabel = this.activeProductGroup !== 'All' ? ` ${this.selectedRouteProductGroupLabel}` : '';
        return `${this.activeDepartmentLabel}${groupLabel} new arrivals.`;
      }

      if (this.selectedProductGroup === 'bestseller') {
        const groupLabel = this.activeProductGroup !== 'All' ? ` ${this.selectedRouteProductGroupLabel}` : '';
        return `${this.activeDepartmentLabel}${groupLabel} best sellers.`;
      }

      if (this.isSalePage) {
        const groupLabel = this.activeProductGroup !== 'All' ? ` ${this.selectedRouteProductGroupLabel}` : '';
        const departmentLabel = this.saleDepartmentLabel ? `${this.saleDepartmentLabel} ` : '';
        return `${departmentLabel}${groupLabel} sale products.`.replace(/\s+/g, ' ').trim();
      }

      if (this.selectedProductGroup === 'sale') {
        return `${this.activeDepartmentLabel} sale picks.`;
      }

      if (this.pageType === 'collection' && this.currentCollectionLabel) {
        const scopeLabel = this.collectionDepartmentFilter ? ` for ${this.collectionDepartmentFilter}` : '';
        return `${this.currentCollectionLabel} collection${scopeLabel}.`;
      }

      if (this.activeFit !== 'All') {
        return `${this.formatCategoryLabel(this.activeFit)} fit for ${this.activeDepartmentLabel.toLowerCase()}.`;
      }

      if (this.activeProductGroup !== 'All' && this.activeCategory === 'All') {
        return `${this.selectedRouteProductGroupLabel} for ${this.activeDepartmentLabel.toLowerCase()}.`;
      }

      if (this.activeCategory !== 'All') {
        const activeCategoryLabel = this.selectedCategoryRecord
          ? this.selectedCategoryRecord.label || this.formatCategoryLabel(this.selectedCategoryRecord.name)
          : this.formatCategoryLabel(this.activeCategory);

        return `${activeCategoryLabel} for ${this.activeDepartmentLabel.toLowerCase()}.`;
      }

      return this.editorialContent.catalogTitle;
    },
    catalogSubtitle() {
      return this.editorialContent.catalogSubtitle;
    },
    filteredProducts() {
      return this.getFilteredListingCards({
        collection: this.activeCollection,
        productGroup: this.activeProductGroup,
        fit: this.activeFit,
        garmentLength: this.activeGarmentLength,
        heelHeight: this.activeHeelHeight,
        material: this.activeMaterial,
        neckline: this.activeNeckline,
        color: this.activeColor,
        size: this.activeSize,
        sleeveLength: this.activeSleeveLength,
        style: this.activeStyle,
        waistRise: this.activeWaistRise,
        priceMin: this.activePriceMin,
        priceMax: this.activePriceMax,
        browseView: this.browseView,
        sortBy: this.sortBy
      });
    },
    paginationTotalPages() {
      return Math.max(1, Math.ceil(this.filteredProducts.length / this.productsPerPage));
    },
    safeCurrentPage() {
      return Math.min(Math.max(1, this.currentPage), this.paginationTotalPages);
    },
    productsPerPage() {
      return Math.max(1, this.catalogColumnCount * CATALOG_ROWS_PER_PAGE);
    },
    paginatedProducts() {
      const start = (this.safeCurrentPage - 1) * this.productsPerPage;
      return this.filteredProducts.slice(start, start + this.productsPerPage);
    },
    paginationSummaryLabel() {
      if (!this.filteredProducts.length) {
        return '0 items';
      }

      const start = (this.safeCurrentPage - 1) * this.productsPerPage + 1;
      const end = Math.min(start + this.productsPerPage - 1, this.filteredProducts.length);
      return `Showing ${start}-${end} of ${this.filteredProducts.length} items`;
    }
  },
  watch: {
    '$route.fullPath'(nextPath, previousPath) {
      if (![
        'landing',
        'all-products',
        'special',
        'collection',
        'product-group-category',
        'category',
        'sale'
      ].includes(String(this.$route.meta && this.$route.meta.pageType || ''))) {
        return;
      }

      this.syncRouteState(previousPath);
      this.loadDepartmentCategories();
    },
    paginationTotalPages(nextValue) {
      if (this.currentPage > nextValue) {
        this.currentPage = nextValue;
        this.updateRouteFilters();
      }
    }
  },
  methods: {
    ...shopMethods,
    updateCatalogColumnCount() {
      this.catalogColumnCount = catalogColumnCountForViewport();
    },
    setCollectionScope(scope) {
      if (!this.isSalePage && (this.pageType !== 'collection' || this.activeCollection === 'All')) {
        return;
      }

      const normalizedScope = String(scope || '').toLowerCase();
      if (normalizedScope !== 'men' && normalizedScope !== 'women') return;
      const nextQuery = { ...this.$route.query };

      nextQuery.department = normalizedScope;

      [
        'group',
        'category',
        'style',
        'fit',
        'heel_height',
        'neckline',
        'sleeve_length',
        'waist_rise',
        'length',
        'garment_length'
      ].forEach(key => delete nextQuery[key]);
      delete nextQuery.page;
      this.currentPage = 1;

      this.$router.replace({
        path: this.isSalePage ? '/sale' : this.departmentCollectionPath(this.activeCollection),
        query: nextQuery
      });
    }
  },
  async mounted() {
    this.updateCatalogColumnCount();
    window.addEventListener('resize', this.updateCatalogColumnCount, { passive: true });
    this.syncRouteState();
    await Promise.allSettled([
      catalogStore.getProducts().then(products => {
        this.products = products;
      }),
      catalogStore.getMaterials().then(materials => {
        this.materialMasterOptions = Array.isArray(materials) ? materials : [];
      }),
      catalogStore.getLandingCollections().then(landingCollections => {
        this.landingCollections = landingCollections;
      }),
      catalogStore.getCollections().then(allCollections => {
        this.allCollections = allCollections;
      }),
      catalogApi.getPublicVouchers()
        .then(voucherPayload => {
          this.coupons = Array.isArray(voucherPayload && voucherPayload.items) ? voucherPayload.items : [];
        })
        .finally(() => {
          this.isLoadingCoupons = false;
        }),
      this.loadDepartmentCategories()
    ]);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateCatalogColumnCount);
  }
};
</script>

<style scoped src="@/assets/styles/shop/Shop.css"></style>
