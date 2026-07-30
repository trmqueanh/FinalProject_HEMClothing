<template>
  <div class="page-section search-page">
    <PageBreadcrumbs :items="breadcrumbItems" />

    <section class="search-header">
      <h1>{{ headline }}</h1>
      <p class="search-header__count" aria-live="polite">{{ resultCountText }}</p>
    </section>

    <section class="search-tabs catalog-tabs" aria-label="Search department">
      <div role="tablist" aria-label="Filter search by department" class="catalog-tabs__list">
        <button
          v-for="tab in departmentTabs"
          :key="tab.value"
          type="button"
          role="tab"
          class="catalog-tabs__button"
          :class="{ 'catalog-tabs__button--active': activeDepartmentTab === tab.value }"
          :aria-selected="activeDepartmentTab === tab.value ? 'true' : 'false'"
          :tabindex="activeDepartmentTab === tab.value ? 0 : -1"
          @click="setDepartment(tab.value)"
          @keydown="handleDepartmentTabKeydown($event, tab)"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <div class="catalog-layout search-catalog-layout">
      <main class="catalog-layout__results">
        <ShopToolbar
          :item-count="filteredProducts.length"
          :sort-by="activeSort"
          :sort-options="sortOptions"
          :active-filter-chips="activeFilterChips"
          @open-filters="openFilters"
          @remove-filter-chip="removeFilterChip"
          @set-inline-sort="setInlineSort"
        />

        <section v-if="isCatalogLoading" class="search-empty" aria-live="polite">
          <h2>Searching products...</h2>
          <p>Loading the latest catalogue.</p>
        </section>

        <ShopProductGrid v-else-if="filteredProducts.length" :products="paginatedProducts" />

        <section v-else class="search-empty" aria-live="polite">
          <h2>{{ emptyText }}</h2>
          <p>Try a different keyword or clear the filters.</p>
        </section>

        <ShopPagination
          :current-page="safeCurrentPage"
          :total-pages="paginationTotalPages"
          :summary-label="paginationSummaryLabel"
          @change-page="setPage"
        />
      </main>
    </div>

    <transition name="catalog-filter-drawer">
      <div
        v-if="isFilterDrawerOpen"
        class="catalog-filter-backdrop"
        role="presentation"
        @click.self="closeFiltersDrawer"
        @keydown.esc="closeFiltersDrawer"
      >
        <aside
          ref="filterDrawer"
          class="catalog-filter-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-filter-drawer-title"
          tabindex="-1"
        >
          <header class="catalog-filter-drawer__header">
            <h2 id="search-filter-drawer-title">Filters</h2>
            <button type="button" aria-label="Close filters" @click="closeFiltersDrawer">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 3l10 10M13 3L3 13" />
              </svg>
            </button>
          </header>

          <div class="catalog-filter-drawer__body">
            <ShopCatalogCriteria
              :active-category="activeCategory || 'All'"
              active-collection="All"
              :active-color="activeColor || 'All'"
              :active-fit="activeFit || 'All'"
              :active-garment-length="activeGarmentLength || 'All'"
              :active-heel-height="activeHeelHeight || 'All'"
              :active-material="activeMaterial || 'All'"
              :active-neckline="activeNeckline || 'All'"
              :active-size="activeSize || 'All'"
              :active-sleeve-length="activeSleeveLength || 'All'"
              :active-style="activeStyle || 'All'"
              :active-waist-rise="activeWaistRise || 'All'"
              :active-price-min="activePriceMin"
              :active-price-max="activePriceMax"
              :category-filter-label="categoryFilterLabel"
              :category-options="categoryFilterOptions"
              :collections="[]"
              :color-options="colorOptions"
              :garment-length-options="garmentLengthOptions"
              :heel-height-options="heelHeightOptions"
              :material-options="materialOptions"
              :neckline-options="necklineOptions"
              :size-options="sizeOptions"
              :sleeve-length-options="sleeveLengthOptions"
              :show-category-filter="showCategoryFilter"
              :show-collection-filter="false"
              :show-fit-filter="showFitFilter"
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
              :price-range="priceRange"
              :sort-by="activeSort"
              :format-category-label="formatCategoryLabel"
              :format-currency="formatCurrency"
              @apply-inline-filter="applyInlineFilter"
              @clear-filters="clearFilters"
              @set-price-filter="setPriceFilter"
            />
          </div>

          <footer class="catalog-filter-drawer__footer">
            <button type="button" class="catalog-filter-drawer__clear" @click="clearFilters">
              Clear
            </button>
            <button type="button" class="catalog-filter-drawer__apply" @click="closeFiltersDrawer">
              View [{{ formattedResultCount }}]
            </button>
          </footer>
        </aside>
      </div>
    </transition>
  </div>
</template>

<script>
import PageBreadcrumbs from '../../components/common/PageBreadcrumbs.vue';
import ShopCatalogCriteria from '../../components/shop/ShopCatalogCriteria.vue';
import ShopPagination from '../../components/shop/ShopPagination.vue';
import ShopProductGrid from '../../components/shop/ShopProductGrid.vue';
import ShopToolbar from '../../components/shop/ShopToolbar.vue';
import { COLOR_FAMILY_OPTIONS, colorFamilyValue, normalizeColorOption } from '../../helpers/colors';
import {
  PRODUCTS_PER_PAGE,
  SORT_OPTIONS,
  normalizeCategoryIdentity,
  normalizePageNumber
} from '../../helpers/shop/shopPageConfig';
import {
  expandProductsToColorCards,
  isListingSaleCard,
  listingCardPrice,
  sortListingColorCards
} from '../../helpers/shop/listingColorCards';
import {
  getCachedProductSearchIndex,
  searchProductIndex
} from '../../helpers/shop/productSearchScoring';
import { sortSizeLabels } from '../../helpers/sizes';
import { catalogStore, normalizeDepartment } from '../../stores/catalogStore';
import { formatCurrency } from '../../utils/formatCurrency';

const HEEL_HEIGHT_OPTIONS = ['High heel', 'Mid heel', 'Low heel', 'No heel'];

const labelize = value =>
  String(value || '')
    .split(/[\s-]+/)
    .filter(Boolean)
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const departmentLabel = department => (department === 'men' ? 'Men' : 'Women');

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

const countFacetValues = (products, valuesForProduct) =>
  products.reduce((counts, product) => {
    const values = [...new Set(valuesForProduct(product).map(value => String(value || '').trim()).filter(Boolean))];

    values.forEach(value => {
      counts[value] = (counts[value] || 0) + 1;
    });

    return counts;
  }, {});

const productFieldOptionList = (products, valuesForProduct) => {
  const optionsByValue = {};

  products.forEach(product => {
    valuesForProduct(product).forEach(value => {
      addOption(optionsByValue, value, value);
    });
  });

  return sortedOptionList(optionsByValue);
};

const colorFamilyValuesForProduct = product =>
  Array.isArray(product.colors)
    ? product.colors.map(color => normalizeColorOption(color).value)
    : [];

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

const parsePriceRange = value => {
  const [minRaw = '', maxRaw = ''] = String(value || '').split('-');
  const min = minRaw === '' ? Number.NaN : Number(minRaw);
  const max = maxRaw === '' ? Number.NaN : Number(maxRaw);

  return {
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null
  };
};

export default {
  name: 'SearchPage',
  components: {
    PageBreadcrumbs,
    ShopCatalogCriteria,
    ShopPagination,
    ShopProductGrid,
    ShopToolbar
  },
  data() {
    const cachedProducts = catalogStore.getCachedProducts();

    return {
      products: cachedProducts,
      materialMasterOptions: [],
      isCatalogLoading: !cachedProducts.length,
      isFilterDrawerOpen: false
    };
  },
  computed: {
    keyword() {
      return String(this.$route.query.q || '').trim();
    },
    activeDepartment() {
      const department = String(this.$route.query.department || '').toLowerCase();
      return department === 'men' || department === 'women' ? department : '';
    },
    activeDepartmentTab() {
      if (this.activeDepartment && this.availableDepartmentValues.includes(this.activeDepartment)) {
        return this.activeDepartment;
      }

      return 'all';
    },
    departmentTabs() {
      return [
        { value: 'all', label: 'All' },
        ...this.availableDepartmentValues.map(value => ({
          value,
          label: departmentLabel(value)
        }))
      ];
    },
    availableDepartmentValues() {
      const values = new Set();

      this.baseSearchProducts.forEach(product => {
        const department = normalizeDepartment(product.gender);
        if (department === 'women' || department === 'men') {
          values.add(department);
        }
      });

      return ['women', 'men'].filter(value => values.has(value));
    },
    effectiveDepartment() {
      const activeTab = this.activeDepartmentTab;
      return activeTab === 'women' || activeTab === 'men' ? activeTab : '';
    },
    activeProductGroup() {
      return String(
        this.$route.query.product_group ||
        this.$route.query.productGroup ||
        this.$route.query.group ||
        ''
      ).trim();
    },
    explicitProductGroupSlug() {
      const slug = normalizeCategoryIdentity(this.activeProductGroup);
      return ['clothing', 'shoes', 'accessories'].includes(slug) ? slug : '';
    },
    inferredProductGroupSlug() {
      const groups = new Set(
        this.groupInferenceProducts
          .map(product => this.productGroupSlugForProduct(product))
          .filter(slug => ['clothing', 'shoes', 'accessories'].includes(slug))
      );

      return groups.size === 1 ? [...groups][0] : '';
    },
    filterProductGroupSlug() {
      return this.explicitProductGroupSlug || this.inferredProductGroupSlug;
    },
    hasProductGroupScope() {
      return Boolean(this.filterProductGroupSlug);
    },
    activeCategory() {
      return this.hasProductGroupScope ? String(this.$route.query.category || '').trim() : '';
    },
    activeSize() {
      return ['clothing', 'shoes'].includes(this.filterProductGroupSlug)
        ? String(this.$route.query.size || '').trim()
        : '';
    },
    activeColor() {
      return this.$route.query.color ? colorFamilyValue(String(this.$route.query.color)) : '';
    },
    activeFit() {
      return this.filterProductGroupSlug === 'clothing'
        ? String(this.$route.query.fit || '').trim()
        : '';
    },
    activeNeckline() {
      return this.hasCategorySpecificFilterContext
        ? String(this.$route.query.neckline || '').trim()
        : '';
    },
    activeWaistRise() {
      return this.hasCategorySpecificFilterContext
        ? String(this.$route.query.waist_rise || '').trim()
        : '';
    },
    activeSleeveLength() {
      return this.hasCategorySpecificFilterContext
        ? String(this.$route.query.sleeve_length || '').trim()
        : '';
    },
    activeGarmentLength() {
      return this.hasCategorySpecificFilterContext
        ? String(this.$route.query.length || this.$route.query.garment_length || '').trim()
        : '';
    },
    activeHeelHeight() {
      return this.hasCategorySpecificFilterContext && this.filterProductGroupSlug === 'shoes'
        ? String(this.$route.query.heel_height || '').trim()
        : '';
    },
    activeMaterial() {
      return String(this.$route.query.material || '').trim();
    },
    activeStyle() {
      return this.hasProductGroupScope ? String(this.$route.query.style || '').trim() : '';
    },
    activeSort() {
      const sort = String(this.$route.query.sort || 'newest').trim();
      return SORT_OPTIONS.some(option => option.value === sort) ? sort : 'newest';
    },
    currentPage() {
      return normalizePageNumber(this.$route.query.page);
    },
    sortOptions() {
      return SORT_OPTIONS;
    },
    breadcrumbItems() {
      const items = [
        {
          label: 'HEM.COM',
          route: { path: '/women' }
        },
        {
          label: 'Search',
          route: this.effectiveDepartment ? { path: '/search', query: this.keyword ? { q: this.keyword } : {} } : undefined,
          current: !this.effectiveDepartment
        }
      ];

      if (this.effectiveDepartment) {
        items.push({
          label: departmentLabel(this.effectiveDepartment),
          current: true
        });
      }

      return items;
    },
    headline() {
      return this.keyword ? `Search: ${this.keyword}` : 'Search all products';
    },
    productSearchIndex() {
      return getCachedProductSearchIndex(this.products);
    },
    baseSearchProducts() {
      const keyword = String(this.keyword || '').trim();

      if (!keyword) {
        return [...this.products];
      }

      return searchProductIndex(this.productSearchIndex, keyword).map(result => result.product);
    },
    departmentProducts() {
      return this.baseSearchProducts.filter(product => this.matchesDepartment(product));
    },
    groupInferenceProducts() {
      return this.departmentProducts;
    },
    groupProducts() {
      return this.departmentProducts.filter(product => this.matchesProductGroup(product));
    },
    categorySpecificFacetProducts() {
      if (!this.activeCategory) {
        return [];
      }

      return this.groupProducts.filter(product => this.matchesCategory(product, this.activeCategory));
    },
    hasCategorySpecificFilterContext() {
      return Boolean(this.activeCategory && this.categorySpecificFacetProducts.length);
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
    styleFilterLabel() {
      if (this.filterProductGroupSlug === 'shoes') {
        return 'Footwear style';
      }

      if (this.filterProductGroupSlug === 'accessories') {
        return 'Accessory style';
      }

      return 'Style';
    },
    categoryFilterOptions() {
      if (!this.hasProductGroupScope) {
        return [];
      }

      const categoriesByValue = {};

      this.groupProducts.forEach(product => {
        addOption(
          categoriesByValue,
          product.categorySlug || product.category,
          product.categoryLabel || product.category || product.categorySlug
        );
      });

      return sortedOptionList(categoriesByValue);
    },
    sizeOptions() {
      if (!['clothing', 'shoes'].includes(this.filterProductGroupSlug)) {
        return [];
      }

      return sortSizeLabels([
        ...new Set(
          this.groupProducts.flatMap(product =>
            Array.isArray(product.sizes) ? product.sizes.map(size => String(size || '').trim()).filter(Boolean) : []
          )
        )
      ]);
    },
    colorOptions() {
      return buildColorFamilyOptions(this.groupProducts);
    },
    fitOptions() {
      if (this.filterProductGroupSlug !== 'clothing') {
        return [];
      }

      const fitsByValue = {};

      this.groupProducts.forEach(product => {
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
      if (!this.hasProductGroupScope) {
        return [];
      }

      const stylesByValue = {};

      this.groupProducts.forEach(product => {
        addOption(stylesByValue, product.styleSlug || product.styleName, product.styleName);
      });

      return sortedOptionList(stylesByValue);
    },
    heelHeightOptions() {
      if (!this.hasCategorySpecificFilterContext || this.filterProductGroupSlug !== 'shoes') {
        return [];
      }

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
      const department = this.effectiveDepartment;
      return this.materialMasterOptions
        .filter(material => {
          const optionGroup = normalizeCategoryIdentity(material.productGroupSlug || material.productGroup);
          const optionDepartment = normalizeCategoryIdentity(material.departmentName || material.department);
          return (!group || !optionGroup || optionGroup === group) && (!optionDepartment || optionDepartment === department);
        })
        .sort((left, right) => (left.sortOrder - right.sortOrder) || left.label.localeCompare(right.label));
    },
    showCategoryFilter() {
      return this.hasProductGroupScope && this.categoryFilterOptions.length > 0;
    },
    showSizeFilter() {
      return ['clothing', 'shoes'].includes(this.filterProductGroupSlug) && this.sizeOptions.length > 0;
    },
    showFitFilter() {
      return this.filterProductGroupSlug === 'clothing' && this.fitOptions.length > 0;
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
      return this.hasProductGroupScope && this.styleOptions.length > 0;
    },
    showHeelHeightFilter() {
      return this.hasCategorySpecificFilterContext && this.filterProductGroupSlug === 'shoes' && this.heelHeightOptions.length > 0;
    },
    showMaterialFilter() {
      return this.materialOptions.length > 0;
    },
    legacyPriceBounds() {
      return parsePriceRange(this.$route.query.price);
    },
    priceRange() {
      const prices = expandProductsToColorCards(this.groupProducts, {
        activeColor: this.activeColor || 'All'
      })
        .map(product => listingCardPrice(product))
        .filter(price => Number.isFinite(price) && price >= 0);

      if (!prices.length) {
        return { min: 0, max: 1 };
      }

      const min = Math.floor(Math.min(...prices));
      const max = Math.ceil(Math.max(...prices));
      return {
        min,
        max: max > min ? max : min + 1
      };
    },
    activePriceMin() {
      const rawValue = this.$route.query.minPrice !== undefined ? this.$route.query.minPrice : this.legacyPriceBounds.min;
      const value = rawValue === null || rawValue === undefined || rawValue === '' ? Number.NaN : Number(rawValue);
      return Number.isFinite(value) ? value : this.priceRange.min;
    },
    activePriceMax() {
      const rawValue = this.$route.query.maxPrice !== undefined ? this.$route.query.maxPrice : this.legacyPriceBounds.max;
      const value = rawValue === null || rawValue === undefined || rawValue === '' ? Number.NaN : Number(rawValue);
      return Number.isFinite(value) ? value : this.priceRange.max;
    },
    filteredProducts() {
      const productCards = expandProductsToColorCards(this.productsForFilters(), {
        activeColor: this.activeColor || 'All',
        priceMin: this.activePriceMin,
        priceMax: this.activePriceMax,
        singleCardPerProduct: Boolean(this.keyword)
      });

      const visibleCards = this.activeSort === 'discount-desc'
        ? productCards.filter(isListingSaleCard)
        : productCards;

      if (this.keyword && this.activeSort === 'newest') {
        return visibleCards;
      }

      return sortListingColorCards(visibleCards, this.activeSort);
    },
    filterOptionCounts() {
      return {
        category: countFacetValues(this.productsForFilters({ category: 'All' }), product => [product.categorySlug || product.category]),
        color: countFacetValues(this.productsForFilters({ color: 'All' }), colorFamilyValuesForProduct),
        size: countFacetValues(this.productsForFilters({ size: 'All' }), product =>
          Array.isArray(product.sizes) ? product.sizes : []
        ),
        fit: countFacetValues(this.productsForFilters({ fit: 'All' }), product => [product.fitSlug || product.fitName || product.fit]),
        neckline: countFacetValues(this.productsForFilters({ neckline: 'All' }), product => [product.neckline]),
        waistRise: countFacetValues(this.productsForFilters({ waistRise: 'All' }), product => [product.waistRise || product.waist_rise]),
        sleeveLength: countFacetValues(this.productsForFilters({ sleeveLength: 'All' }), product => [product.sleeveLength || product.sleeve_length]),
        garmentLength: countFacetValues(this.productsForFilters({ garmentLength: 'All' }), product => [product.garmentLength || product.garment_length || product.length]),
        style: countFacetValues(this.productsForFilters({ style: 'All' }), product => [product.styleSlug || product.styleName]),
        heelHeight: countFacetValues(this.productsForFilters({ heelHeight: 'All' }), product => [product.heelHeight || product.heel_height]),
        material: countFacetValues(this.productsForFilters({ material: 'All' }), product =>
          Array.isArray(product.materialFilterValues) ? product.materialFilterValues : []
        )
      };
    },
    paginationTotalPages() {
      return Math.max(1, Math.ceil(this.filteredProducts.length / PRODUCTS_PER_PAGE));
    },
    safeCurrentPage() {
      return Math.min(Math.max(1, this.currentPage), this.paginationTotalPages);
    },
    paginatedProducts() {
      const start = (this.safeCurrentPage - 1) * PRODUCTS_PER_PAGE;
      return this.filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
    },
    filterScopeLabel() {
      const genderLabel = this.effectiveDepartment ? departmentLabel(this.effectiveDepartment) : '';
      const genderSuffix = genderLabel ? ` (${genderLabel})` : '';

      if (this.activeCategory) {
        return `${this.activeCategoryLabel}${genderSuffix}`;
      }

      if (this.activeProductGroup) {
        return `${labelize(this.activeProductGroup)}${genderSuffix}`;
      }

      return genderLabel;
    },
    activeCategoryLabel() {
      if (!this.activeCategory) return '';

      const category = this.categoryFilterOptions.find(item =>
        normalizeCategoryIdentity(item.value) === normalizeCategoryIdentity(this.activeCategory)
      );

      return category ? category.label : labelize(this.activeCategory);
    },
    resultCountText() {
      const count = this.filteredProducts.length;
      const itemLabel = count === 1 ? 'item' : 'items';
      const scope = this.filterScopeLabel ? ` in ${this.filterScopeLabel}` : '';

      if (!count && this.keyword) {
        return `No results found for "${this.keyword}"`;
      }

      if (this.keyword) {
        return `Results for "${this.keyword}"${scope}: ${count} ${itemLabel}`;
      }

      return `Results${scope}: ${count} ${itemLabel}`;
    },
    formattedResultCount() {
      return new Intl.NumberFormat('en-US').format(this.filteredProducts.length);
    },
    activeFilterChips() {
      const chips = [];
      const addValueChip = (filter, value, label, isVisible = true) => {
        if (!isVisible || !value || value === 'All') return;
        chips.push({
          key: `${filter}-${value}`,
          filter,
          label: label || this.labelForFilterValue(filter, value)
        });
      };

      addValueChip('department', this.activeDepartment, this.activeDepartment ? departmentLabel(this.activeDepartment) : '');
      addValueChip('product_group', this.activeProductGroup, this.activeProductGroup ? labelize(this.activeProductGroup) : '');
      addValueChip('category', this.activeCategory);
      addValueChip('color', this.activeColor);
      addValueChip('size', this.activeSize);
      addValueChip('fit', this.activeFit);
      addValueChip('neckline', this.activeNeckline, '', this.showNecklineFilter);
      addValueChip('waistRise', this.activeWaistRise, '', this.showWaistRiseFilter);
      addValueChip('sleeveLength', this.activeSleeveLength, '', this.showSleeveLengthFilter);
      addValueChip('garmentLength', this.activeGarmentLength, '', this.showGarmentLengthFilter);
      addValueChip('style', this.activeStyle);
      addValueChip('heelHeight', this.activeHeelHeight, '', this.showHeelHeightFilter);
      addValueChip('material', this.activeMaterial);

      if (this.activePriceMin !== this.priceRange.min || this.activePriceMax !== this.priceRange.max) {
        chips.push({
          key: 'price-range',
          filter: 'price',
          label: `${this.formatCurrency(this.activePriceMin)} - ${this.formatCurrency(this.activePriceMax)}`
        });
      }

      if (this.activeSort !== 'newest') {
        const option = this.sortOptions.find(item => item.value === this.activeSort);
        chips.push({
          key: `sort-${this.activeSort}`,
          filter: 'sort',
          label: option ? option.label : 'Sort'
        });
      }

      return chips;
    },
    emptyText() {
      return this.keyword ? `No results found for "${this.keyword}"` : 'No results found';
    },
    paginationSummaryLabel() {
      if (!this.filteredProducts.length) {
        return '0 items';
      }

      const start = (this.safeCurrentPage - 1) * PRODUCTS_PER_PAGE + 1;
      const end = Math.min(start + PRODUCTS_PER_PAGE - 1, this.filteredProducts.length);
      return `Showing ${start}-${end} of ${this.filteredProducts.length} items`;
    },
    hasActiveFilters() {
      return Boolean(
        this.activeDepartment ||
        this.activeProductGroup ||
        this.activeCategory ||
        this.activeSize ||
        this.activeColor ||
        this.activeFit ||
        this.activeNeckline ||
        this.activeWaistRise ||
        this.activeSleeveLength ||
        this.activeGarmentLength ||
        this.activeHeelHeight ||
        this.activeMaterial ||
        this.activeStyle ||
        this.$route.query.price ||
        this.$route.query.minPrice ||
        this.$route.query.maxPrice ||
        this.activeSort !== 'newest'
      );
    }
  },
  watch: {
    paginationTotalPages(nextValue) {
      if (this.currentPage > nextValue) {
        this.updateRoute({ page: nextValue > 1 ? String(nextValue) : '' });
      }
    },
    isFilterDrawerOpen() {
      this.syncFilterDrawerLock();
    }
  },
  async mounted() {
    const productsPromise = catalogStore.getProducts()
      .then(products => {
        this.products = Array.isArray(products) ? products : [];
      })
      .finally(() => {
        this.isCatalogLoading = false;
      });
    const materialsPromise = catalogStore.getMaterials()
      .then(materials => {
        this.materialMasterOptions = Array.isArray(materials) ? materials : [];
      });

    await Promise.allSettled([productsPromise, materialsPromise]);
  },
  beforeUnmount() {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  },
  methods: {
    formatCurrency,
    formatCategoryLabel: labelize,
    matchesDepartment(product) {
      return !this.effectiveDepartment || normalizeDepartment(product.gender) === this.effectiveDepartment;
    },
    productGroupSlugForProduct(product) {
      return [product.productGroupSlug, product.productGroup, product.productGroupLabel]
        .map(normalizeCategoryIdentity)
        .find(slug => ['clothing', 'shoes', 'accessories'].includes(slug)) || '';
    },
    matchesProductGroup(product) {
      if (!this.filterProductGroupSlug) {
        return true;
      }

      return this.productGroupSlugForProduct(product) === this.filterProductGroupSlug;
    },
    matchesCategory(product, category = this.activeCategory) {
      if (!category || category === 'All') return true;

      const activeCategory = normalizeCategoryIdentity(category);
      return [product.categorySlug, product.category, product.categoryLabel]
        .map(normalizeCategoryIdentity)
        .includes(activeCategory);
    },
    productMatchesFilters(product, filters) {
      const category = filters.category || 'All';
      const size = filters.size || 'All';
      const color = filters.color || 'All';
      const fit = filters.fit || 'All';
      const heelHeight = filters.heelHeight || 'All';
      const material = filters.material || 'All';
      const neckline = filters.neckline || 'All';
      const waistRise = filters.waistRise || 'All';
      const sleeveLength = filters.sleeveLength || 'All';
      const garmentLength = filters.garmentLength || 'All';
      const style = filters.style || 'All';
      const productGroup = this.filterProductGroupSlug;
      const shouldApplyCategorySpecificFilters = Boolean(category && category !== 'All');
      const matchesCategory = this.matchesCategory(product, category);
      const activeColorValue = color === 'All' ? 'All' : colorFamilyValue(color);
      const matchesColor =
        color === 'All' ||
        (Array.isArray(product.colors) &&
          product.colors.some(option => normalizeColorOption(option).value === activeColorValue));
      const matchesSize =
        !['clothing', 'shoes'].includes(productGroup) ||
        size === 'All' ||
        (Array.isArray(product.sizes) && product.sizes.some(option => String(option) === String(size)));
      const matchesFit =
        productGroup !== 'clothing' ||
        fit === 'All' ||
        [product.fitSlug, product.fitName, product.fit]
          .map(normalizeCategoryIdentity)
          .includes(normalizeCategoryIdentity(fit));
      const matchesHeelHeight =
        productGroup !== 'shoes' ||
        !shouldApplyCategorySpecificFilters ||
        heelHeight === 'All' ||
        normalizeCategoryIdentity(product.heelHeight || product.heel_height) === normalizeCategoryIdentity(heelHeight);
      const matchesNeckline =
        !shouldApplyCategorySpecificFilters ||
        neckline === 'All' ||
        normalizeCategoryIdentity(product.neckline) === normalizeCategoryIdentity(neckline);
      const matchesWaistRise =
        !shouldApplyCategorySpecificFilters ||
        waistRise === 'All' ||
        normalizeCategoryIdentity(product.waistRise || product.waist_rise) === normalizeCategoryIdentity(waistRise);
      const matchesSleeveLength =
        !shouldApplyCategorySpecificFilters ||
        sleeveLength === 'All' ||
        normalizeCategoryIdentity(product.sleeveLength || product.sleeve_length) === normalizeCategoryIdentity(sleeveLength);
      const matchesGarmentLength =
        !shouldApplyCategorySpecificFilters ||
        garmentLength === 'All' ||
        normalizeCategoryIdentity(product.garmentLength || product.garment_length || product.length) === normalizeCategoryIdentity(garmentLength);
      const matchesMaterial =
        material === 'All' ||
        (Array.isArray(product.materialFilterValues) &&
          product.materialFilterValues.some(option => normalizeCategoryIdentity(option) === normalizeCategoryIdentity(material)));
      const matchesStyle =
        !productGroup ||
        style === 'All' ||
        [product.styleSlug, product.styleName]
          .map(normalizeCategoryIdentity)
          .includes(normalizeCategoryIdentity(style));

      return (
        matchesCategory &&
        matchesColor &&
        matchesSize &&
        matchesFit &&
        matchesHeelHeight &&
        matchesNeckline &&
        matchesWaistRise &&
        matchesSleeveLength &&
        matchesGarmentLength &&
        matchesMaterial &&
        matchesStyle
      );
    },
    productsForFilters(overrides = {}) {
      const filters = {
        category: this.activeCategory || 'All',
        size: this.activeSize || 'All',
        color: this.activeColor || 'All',
        fit: this.activeFit || 'All',
        heelHeight: this.activeHeelHeight || 'All',
        material: this.activeMaterial || 'All',
        neckline: this.activeNeckline || 'All',
        waistRise: this.activeWaistRise || 'All',
        sleeveLength: this.activeSleeveLength || 'All',
        garmentLength: this.activeGarmentLength || 'All',
        style: this.activeStyle || 'All',
        ...overrides
      };

      return this.groupProducts.filter(product => this.productMatchesFilters(product, filters));
    },
    optionValue(option) {
      if (option && typeof option === 'object') {
        return String(option.value || option.slug || option.name || option.label || '').trim();
      }

      return String(option || '').trim();
    },
    optionLabel(option) {
      if (option && typeof option === 'object') {
        return String(option.label || option.name || option.value || '').trim();
      }

      return this.formatCategoryLabel(option);
    },
    labelForFilterValue(filter, value) {
      const optionMap = {
        category: this.categoryFilterOptions,
        color: this.colorOptions,
        fit: this.fitOptions,
        neckline: this.necklineOptions,
        waistRise: this.waistRiseOptions,
        sleeveLength: this.sleeveLengthOptions,
        garmentLength: this.garmentLengthOptions,
        style: this.styleOptions,
        heelHeight: this.heelHeightOptions,
        material: this.materialOptions
      };

      if (filter === 'department') return departmentLabel(value);
      if (filter === 'product_group' || filter === 'size') return this.formatCategoryLabel(value);

      const option = (optionMap[filter] || []).find(item => this.optionValue(item) === value);
      return option ? this.optionLabel(option) : this.formatCategoryLabel(value);
    },
    openFilters() {
      this.isFilterDrawerOpen = true;
      this.$nextTick(() => {
        const drawer = this.$refs.filterDrawer;
        if (drawer && typeof drawer.focus === 'function') drawer.focus();
      });
    },
    closeFiltersDrawer() {
      this.isFilterDrawerOpen = false;
    },
    syncFilterDrawerLock() {
      if (typeof document === 'undefined') return;
      document.body.style.overflow = this.isFilterDrawerOpen ? 'hidden' : '';
    },
    updateRoute(changes = {}) {
      const nextQuery = { ...this.$route.query };

      Object.entries(changes).forEach(([key, value]) => {
        const cleanValue = String(value || '').trim();
        if (cleanValue) {
          nextQuery[key] = cleanValue;
        } else {
          delete nextQuery[key];
        }
      });

      if (!Object.prototype.hasOwnProperty.call(changes, 'page')) {
        delete nextQuery.page;
      }

      if (nextQuery.color) {
        nextQuery.color = colorFamilyValue(nextQuery.color);
      }

      this.$router.replace({
        path: '/search',
        query: nextQuery
      });
      this.closeFiltersDrawer();
    },
    setDepartment(value) {
      const nextQuery = {};

      if (this.keyword) {
        nextQuery.q = this.keyword;
      }

      if (value !== 'all') {
        nextQuery.department = value;
      }

      this.$router.replace({
        path: '/search',
        query: nextQuery
      });
      this.closeFiltersDrawer();

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      return;
    },
    handleDepartmentTabKeydown(event, currentTab) {
      const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];

      if (!keys.includes(event.key)) {
        return;
      }

      event.preventDefault();

      const tabs = this.departmentTabs;
      const currentIndex = tabs.findIndex(tab => tab.value === currentTab.value);
      const lastIndex = tabs.length - 1;
      let nextIndex = currentIndex;

      if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = lastIndex;
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = currentIndex >= lastIndex ? 0 : currentIndex + 1;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = currentIndex <= 0 ? lastIndex : currentIndex - 1;
      }

      const nextTab = tabs[nextIndex];
      if (nextTab) {
        this.setDepartment(nextTab.value);
      }
    },
    applyInlineFilter({ filter, value }) {
      const keyMap = {
        garmentLength: 'length',
        heelHeight: 'heel_height',
        sleeveLength: 'sleeve_length',
        waistRise: 'waist_rise'
      };
      const queryKey = keyMap[filter] || filter;
      const queryValue = value === 'All' ? '' : filter === 'color' ? colorFamilyValue(value) : value;
      const changes = {
        [queryKey]: queryValue
      };

      if (filter === 'garmentLength') {
        changes.garment_length = '';
      }

      if (filter === 'category') {
        Object.assign(changes, {
          garment_length: '',
          heel_height: '',
          length: '',
          neckline: '',
          sleeve_length: '',
          waist_rise: ''
        });
      }

      this.updateRoute(changes);
    },
    setInlineSort(value) {
      this.updateRoute({
        sort: value === 'newest' ? '' : value
      });
    },
    setPriceFilter({ min, max }) {
      const nextMin = Math.max(this.priceRange.min, Math.min(Number(min), this.priceRange.max));
      const nextMax = Math.max(nextMin, Math.min(Number(max), this.priceRange.max));

      this.updateRoute({
        minPrice: nextMin <= this.priceRange.min ? '' : String(nextMin),
        maxPrice: nextMax >= this.priceRange.max ? '' : String(nextMax),
        price: ''
      });
    },
    setPage(page) {
      const nextPage = Math.min(Math.max(1, normalizePageNumber(page)), this.paginationTotalPages);
      this.updateRoute({
        page: nextPage > 1 ? String(nextPage) : ''
      });
    },
    clearFilters() {
      const nextQuery = {};

      if (this.keyword) {
        nextQuery.q = this.keyword;
      }

      this.$router.replace({
        path: '/search',
        query: nextQuery
      });
      this.closeFiltersDrawer();
    },
    removeFilterChip(chip) {
      if (!chip || !chip.filter) return;

      if (chip.filter === 'price') {
        this.setPriceFilter({
          min: this.priceRange.min,
          max: this.priceRange.max
        });
        return;
      }

      if (chip.filter === 'sort') {
        this.setInlineSort('newest');
        return;
      }

      if (chip.filter === 'department') {
        this.updateRoute({
          department: '',
          page: ''
        });
        return;
      }

      if (chip.filter === 'product_group') {
        this.updateRoute({
          category: '',
          fit: '',
          garment_length: '',
          heel_height: '',
          length: '',
          material: '',
          neckline: '',
          product_group: '',
          productGroup: '',
          group: '',
          sleeve_length: '',
          style: '',
          waist_rise: ''
        });
        return;
      }

      this.applyInlineFilter({
        filter: chip.filter,
        value: 'All'
      });
    }
  }
};
</script>

<style scoped>
.search-page {
  --color-ink: #0a0a0a;
  --color-ink-60: rgba(10, 10, 10, 0.60);
  --color-ink-30: rgba(10, 10, 10, 0.30);
  --color-ink-12: rgba(10, 10, 10, 0.12);
  --color-ink-06: rgba(10, 10, 10, 0.06);
  --color-paper: #ffffff;
  --color-paper-warm: #ffffff;
  --color-white: #ffffff;
  --size-10: 0.625rem;
  --size-12: 0.75rem;
  --sp-1: 0.25rem;
  --sp-2: 0.5rem;
  --sp-3: 0.75rem;
  --sp-4: 1rem;
  --sp-5: 1.25rem;
  --sp-7: 2rem;
  --sp-8: 3rem;
  --sp-9: 4rem;
  --sp-10: 6rem;
  --font: Abel, sans-serif;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --t-fast: 180ms;
  --t-mid: 320ms;
  display: grid;
  gap: var(--sp-4);
  background: var(--color-paper);
  font-family: var(--font);
}

.search-header {
  display: grid;
  gap: var(--sp-2);
  padding: var(--sp-7) var(--sp-7) var(--sp-2);
  background: var(--color-paper);
}

.search-header__count {
  margin: 0;
  color: var(--color-ink-60);
  font-size: var(--size-12);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.search-header h1 {
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(30px, 4vw, 56px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.search-tabs {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  overflow-x: auto;
  border-bottom: 1px solid var(--color-ink-12);
  background: var(--color-paper);
  scrollbar-width: none;
  position: sticky;
  top: var(--store-header-height, 64px);
  z-index: 10;
}

.search-tabs::-webkit-scrollbar {
  display: none;
}

.catalog-tabs__list {
  display: flex;
  padding: 0 var(--sp-7);
  white-space: nowrap;
  gap: 0;
}

.catalog-tabs__button {
  position: relative;
  min-height: 48px;
  border: 0;
  padding: 0 var(--sp-4);
  background: transparent;
  color: var(--color-ink-30);
  cursor: pointer;
  font-size: var(--size-11, 0.6875rem);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-family: var(--font);
  flex-shrink: 0;
  transition: color var(--t-fast) var(--ease-out);
}

.catalog-tabs__button::after {
  content: '';
  position: absolute;
  left: var(--sp-4);
  right: var(--sp-4);
  bottom: -1px;
  height: 2px;
  background: var(--color-ink);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--t-mid) var(--ease-out);
}

.catalog-tabs__button:hover {
  color: var(--color-ink);
}

.catalog-tabs__button--active {
  color: var(--color-ink);
  font-weight: 700;
}

.catalog-tabs__button--active::after {
  transform: scaleX(1);
}

.catalog-tabs__button:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: -3px;
}

.catalog-layout {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  display: block;
  align-items: start;
  background: var(--color-paper);
}

.catalog-layout__results {
  min-width: 0;
  display: grid;
  align-content: start;
}

.catalog-layout__results :deep(.catalog-meta) {
  width: 100%;
  margin-left: 0;
  padding-inline: clamp(18px, 2.4vw, 44px);
}

.catalog-layout__results :deep(.shop-results) {
  padding-inline: clamp(18px, 2.4vw, 44px);
}

.catalog-layout__results :deep(.shop-pagination) {
  margin: 18px var(--sp-4) var(--sp-10);
}

.search-empty {
  display: grid;
  gap: var(--sp-2);
  padding: var(--sp-6, 1.5rem) var(--sp-7) 0;
  text-align: center;
}

.search-empty h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(24px, 4vw, 40px);
  font-weight: 700;
  text-transform: uppercase;
}

.search-empty p {
  margin: 0;
  color: var(--color-ink-60);
}

.catalog-filter-backdrop {
  position: fixed;
  inset: 0;
  z-index: 520;
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.54);
}

.catalog-filter-drawer {
  width: min(470px, 100vw);
  height: 100vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: #ffffff;
  color: #111111;
  box-shadow: -18px 0 42px rgba(0, 0, 0, 0.28);
  outline: none;
}

.catalog-filter-drawer__header {
  min-height: 74px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 48px;
  align-items: center;
  padding: 0 20px;
}

.catalog-filter-drawer__header h2 {
  grid-column: 2;
  margin: 0;
  text-align: center;
  color: #111111;
  font-size: 16px;
  font-weight: 450;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.catalog-filter-drawer__header button {
  grid-column: 3;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(17, 17, 17, 0.22);
  background: transparent;
  color: #111111;
  cursor: pointer;
}

.catalog-filter-drawer__header button:hover {
  border-color: #111111;
}

.catalog-filter-drawer__header svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
}

.catalog-filter-drawer__body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.catalog-filter-drawer__body::-webkit-scrollbar {
  display: none;
}

.catalog-filter-drawer__footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 20px;
  border-top: 1px solid rgba(17, 17, 17, 0.12);
  background: #ffffff;
}

.catalog-filter-drawer__footer button {
  min-height: 56px;
  border: 1px solid transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 550;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    transform 120ms ease;
}

.catalog-filter-drawer__clear {
  background: #f2f2f2;
  color: rgba(17, 17, 17, 0.52);
}

.catalog-filter-drawer__clear:hover,
.catalog-filter-drawer__clear:focus-visible {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.catalog-filter-drawer__apply {
  background: #111111;
  color: #ffffff;
}

.catalog-filter-drawer__apply:hover,
.catalog-filter-drawer__apply:focus-visible {
  border-color: #111111;
  background: #ffca2f;
  color: #111111;
}

.catalog-filter-drawer__footer button:focus-visible {
  outline: 2px solid #111111;
  outline-offset: 3px;
}

.catalog-filter-drawer__footer button:active {
  transform: translateY(1px);
}

.catalog-filter-drawer-enter-active,
.catalog-filter-drawer-leave-active {
  transition: opacity 180ms ease;
}

.catalog-filter-drawer-enter-active .catalog-filter-drawer,
.catalog-filter-drawer-leave-active .catalog-filter-drawer {
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.catalog-filter-drawer-enter-from,
.catalog-filter-drawer-leave-to {
  opacity: 0;
}

.catalog-filter-drawer-enter-from .catalog-filter-drawer,
.catalog-filter-drawer-leave-to .catalog-filter-drawer {
  transform: translateX(100%);
}

.catalog-filter-drawer :deep(.catalog-filters) {
  position: static;
  top: auto;
  max-height: none;
  padding: 0 22px 24px;
  border-right: 0;
  background: transparent;
  color: #111111;
}

.catalog-filter-drawer :deep(.catalog-filters__heading),
.catalog-filter-drawer :deep(.catalog-filters__clear) {
  display: none;
}

.catalog-filter-drawer :deep(.filter-section) {
  padding: 20px 0;
  border-top-color: rgba(17, 17, 17, 0.12);
}

.catalog-filter-drawer :deep(.filter-section:first-of-type) {
  border-top: 0;
}

.catalog-filter-drawer :deep(.catalog-filters h3) {
  color: rgba(17, 17, 17, 0.82);
  font-size: 14px;
  font-weight: 450;
}

.catalog-filter-drawer :deep(.filter-check),
.catalog-filter-drawer :deep(.filter-colors button),
.catalog-filter-drawer :deep(.filter-sizes button),
.catalog-filter-drawer :deep(.filter-price__quick button) {
  color: #111111;
}

.catalog-filter-drawer :deep(.filter-check__count),
.catalog-filter-drawer :deep(.filter-colors small) {
  color: rgba(17, 17, 17, 0.56);
}

.catalog-filter-drawer :deep(.filter-check__box),
.catalog-filter-drawer :deep(.filter-check__radio),
.catalog-filter-drawer :deep(.filter-sizes button),
.catalog-filter-drawer :deep(.filter-price__quick button) {
  border-color: rgba(17, 17, 17, 0.22);
  background: #ffffff;
}

.catalog-filter-drawer :deep(.filter-check.is-selected .filter-check__box),
.catalog-filter-drawer :deep(.filter-check.is-selected .filter-check__radio),
.catalog-filter-drawer :deep(.filter-sizes button.is-selected),
.catalog-filter-drawer :deep(.filter-price__quick button.is-selected) {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

@media (max-width: 860px) {
  .search-header {
    padding-left: var(--sp-5);
    padding-right: var(--sp-5);
  }

  .catalog-tabs__list {
    padding: 0 var(--sp-5);
  }

  .catalog-layout { display: block; }
}

@media (max-width: 560px) {
  .catalog-tabs__list {
    padding-inline: var(--sp-4);
    gap: 4px;
  }

  .catalog-tabs__button {
    min-height: 52px;
    font-size: var(--size-10);
    padding: 0 var(--sp-3);
  }
}
</style>
