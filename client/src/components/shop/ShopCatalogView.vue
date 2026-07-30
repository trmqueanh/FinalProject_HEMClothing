<template>
  <!-- ShopCatalogView: render listing/catalog, persistent filters, grid, and pagination. -->
  <PageBreadcrumbs :items="breadcrumbItems" />

  <section class="catalog-header">
    <h1>{{ catalogViewLabel || catalogHeading }}</h1>
  </section>

  <section v-if="collectionScopeTabs.length" class="collection-scope-tabs" aria-label="Catalog gender">
    <div role="tablist" aria-label="Filter products by gender" class="collection-scope-tabs__list">
      <button
        v-for="tab in collectionScopeTabs"
        :key="tab.value"
        type="button"
        role="tab"
        class="collection-scope-tabs__button"
        :class="{ 'collection-scope-tabs__button--active': activeCollectionScope === tab.value }"
        :aria-selected="activeCollectionScope === tab.value ? 'true' : 'false'"
        :tabindex="activeCollectionScope === tab.value ? 0 : -1"
        @click="$emit('select-collection-scope', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>
  </section>

  <section
    v-if="collectionBannerItems.length"
    class="collection-banner-strip"
    :class="{ 'collection-banner-strip--split': collectionBannerItems.length > 1 }"
    aria-label="Collection campaign banners"
  >
    <article v-for="banner in collectionBannerItems" :key="banner.key" class="collection-banner-strip__item">
      <img :src="banner.imageUrl" :alt="`${banner.label} collection banner`" />
      <span v-if="collectionBannerItems.length > 1">{{ banner.label }}</span>
    </article>
  </section>

  <ShopCategoryTabs
    v-if="visibleCategories.length"
    :visible-categories="visibleCategories"
    :is-category-active="isCategoryActive"
    :format-category-label="formatCategoryLabel"
    @select-category="$emit('select-category', $event)"
    @tab-keydown="forwardTabKeydown"
  />

  <div class="catalog-layout">
    <main class="catalog-layout__results">
      <ShopToolbar
        :item-count="itemCount"
        :sort-by="sortBy"
        :sort-options="sortOptions"
        :active-filter-chips="activeFilterChips"
        @open-filters="openFilters"
        @remove-filter-chip="removeFilterChip"
        @set-inline-sort="$emit('set-inline-sort', $event)"
      />
      <ShopProductGrid :products="paginatedProducts" />
      <ShopPagination
        :current-page="safeCurrentPage"
        :total-pages="paginationTotalPages"
        :summary-label="paginationSummaryLabel"
        @change-page="$emit('change-page', $event)"
      />
    </main>
  </div>

  <transition name="catalog-filter-drawer">
    <div
      v-if="isFilterDrawerOpen"
      class="catalog-filter-backdrop"
      role="presentation"
      @click.self="closeFilters"
      @keydown.esc="closeFilters"
    >
      <aside
        ref="filterDrawer"
        class="catalog-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-filter-drawer-title"
        tabindex="-1"
      >
        <header class="catalog-filter-drawer__header">
          <h2 id="catalog-filter-drawer-title">Filters</h2>
          <button type="button" aria-label="Close filters" @click="closeFilters">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </header>

        <div class="catalog-filter-drawer__body">
          <ShopCatalogCriteria
            :active-collection="activeCollection"
            :active-gender="activeGender"
            :active-category="activeCategory"
            :active-product-group="activeProductGroup"
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
            :category-filter-label="categoryFilterLabel"
            :category-options="categoryOptions"
            :product-group-options="productGroupOptions"
            :collections="collections"
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
            :price-range="priceRange"
            :sort-by="sortBy"
            :format-category-label="formatCategoryLabel"
            :format-currency="formatCurrency"
            @apply-inline-filter="$emit('apply-inline-filter', $event)"
            @clear-filters="clearFilters"
            @set-price-filter="$emit('set-price-filter', $event)"
          />
        </div>

        <footer class="catalog-filter-drawer__footer">
          <button type="button" class="catalog-filter-drawer__clear" @click="clearFilters">
            Clear
          </button>
          <button type="button" class="catalog-filter-drawer__apply" @click="closeFilters">
            View [{{ formattedItemCount }}]
          </button>
        </footer>
      </aside>
    </div>
  </transition>
</template>

<script>
import PageBreadcrumbs from '../common/PageBreadcrumbs.vue';
import ShopCatalogCriteria from './ShopCatalogCriteria.vue';
import ShopCategoryTabs from './ShopCategoryTabs.vue';
import ShopPagination from './ShopPagination.vue';
import ShopProductGrid from './ShopProductGrid.vue';
import ShopToolbar from './ShopToolbar.vue';

export default {
  name: 'ShopCatalogView',
  components: {
    PageBreadcrumbs,
    ShopCatalogCriteria,
    ShopCategoryTabs,
    ShopPagination,
    ShopProductGrid,
    ShopToolbar
  },
  emits: [
    'apply-inline-filter',
    'change-page',
    'clear-filters',
    'select-category',
    'select-collection-scope',
    'set-inline-sort',
    'set-price-filter',
    'tab-keydown'
  ],
  props: {
    activeCategory: { type: String, required: true },
    activeProductGroup: { type: String, default: 'All' },
    activeCollection: { type: String, required: true },
    activeCollectionScope: { type: String, default: 'all' },
    activeGender: { type: String, default: 'All' },
    activeColor: { type: String, required: true },
    activeFit: { type: String, required: true },
    activeGarmentLength: { type: String, required: true },
    activeHeelHeight: { type: String, required: true },
    activeMaterial: { type: String, required: true },
    activeNeckline: { type: String, required: true },
    activePriceMax: { type: Number, required: true },
    activePriceMin: { type: Number, required: true },
    activeSize: { type: String, required: true },
    activeSleeveLength: { type: String, required: true },
    activeStyle: { type: String, required: true },
    activeWaistRise: { type: String, required: true },
    breadcrumbItems: { type: Array, required: true },
    catalogHeading: { type: String, required: true },
    catalogViewLabel: { type: String, default: '' },
    categoryFilterLabel: { type: String, required: true },
    categoryOptions: { type: Array, required: true },
    productGroupOptions: { type: Array, default: () => [] },
    collections: { type: Array, required: true },
    colorOptions: { type: Array, required: true },
    collectionScopeTabs: { type: Array, default: () => [] },
    collectionBannerItems: { type: Array, default: () => [] },
    filterOptionCounts: { type: Object, required: true },
    fitOptions: { type: Array, required: true },
    garmentLengthOptions: { type: Array, required: true },
    genderOptions: { type: Array, default: () => [] },
    formatCategoryLabel: { type: Function, required: true },
    formatCurrency: { type: Function, required: true },
    isCategoryActive: { type: Function, required: true },
    itemCount: { type: Number, required: true },
    paginatedProducts: { type: Array, required: true },
    paginationSummaryLabel: { type: String, required: true },
    paginationTotalPages: { type: Number, required: true },
    priceRange: { type: Object, required: true },
    safeCurrentPage: { type: Number, required: true },
    heelHeightOptions: { type: Array, required: true },
    materialOptions: { type: Array, required: true },
    necklineOptions: { type: Array, required: true },
    sizeOptions: { type: Array, required: true },
    sleeveLengthOptions: { type: Array, required: true },
    showCategoryFilter: { type: Boolean, default: false },
    showProductGroupFilter: { type: Boolean, default: false },
    showCollectionFilter: { type: Boolean, default: false },
    showFitFilter: { type: Boolean, default: true },
    showGenderFilter: { type: Boolean, default: false },
    showGarmentLengthFilter: { type: Boolean, default: false },
    showHeelHeightFilter: { type: Boolean, default: false },
    showMaterialFilter: { type: Boolean, default: true },
    showNecklineFilter: { type: Boolean, default: false },
    showSizeFilter: { type: Boolean, default: true },
    showSleeveLengthFilter: { type: Boolean, default: false },
    showStyleFilter: { type: Boolean, default: false },
    showWaistRiseFilter: { type: Boolean, default: false },
    sortBy: { type: String, required: true },
    sortOptions: { type: Array, required: true },
    styleFilterLabel: { type: String, required: true },
    styleOptions: { type: Array, required: true },
    waistRiseOptions: { type: Array, required: true },
    visibleCategories: { type: Array, required: true }
  },
  data() {
    return {
      isFilterDrawerOpen: false
    };
  },
  computed: {
    formattedItemCount() {
      return new Intl.NumberFormat('en-US').format(this.itemCount);
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

      addValueChip('category', this.activeCategory);
      addValueChip('productGroup', this.activeProductGroup, '', this.showProductGroupFilter);
      addValueChip('collection', this.activeCollection, '', this.showCollectionFilter);
      addValueChip('department', this.activeGender, '', this.showGenderFilter);
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

      if (this.sortBy !== 'newest') {
        const option = this.sortOptions.find(item => item.value === this.sortBy);
        chips.push({
          key: `sort-${this.sortBy}`,
          filter: 'sort',
          label: option ? option.label : 'Sort'
        });
      }

      return chips;
    }
  },
  watch: {
    isFilterDrawerOpen() {
      this.syncFilterDrawerLock();
    }
  },
  beforeUnmount() {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  },
  methods: {
    forwardTabKeydown(event, category) {
      this.$emit('tab-keydown', event, category);
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
        category: this.categoryOptions,
        productGroup: this.productGroupOptions,
        color: this.colorOptions,
        department: this.genderOptions,
        fit: this.fitOptions,
        neckline: this.necklineOptions,
        waistRise: this.waistRiseOptions,
        sleeveLength: this.sleeveLengthOptions,
        garmentLength: this.garmentLengthOptions,
        style: this.styleOptions,
        heelHeight: this.heelHeightOptions,
        material: this.materialOptions
      };

      if (filter === 'collection' || filter === 'size') {
        return this.formatCategoryLabel(value);
      }

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
    closeFilters() {
      this.isFilterDrawerOpen = false;
    },
    clearFilters() {
      this.$emit('clear-filters');
      this.closeFilters();
    },
    removeFilterChip(chip) {
      if (!chip || !chip.filter) return;

      if (chip.filter === 'price') {
        this.$emit('set-price-filter', {
          min: this.priceRange.min,
          max: this.priceRange.max
        });
        return;
      }

      if (chip.filter === 'sort') {
        this.$emit('set-inline-sort', 'newest');
        return;
      }

      this.$emit('apply-inline-filter', {
        filter: chip.filter,
        value: 'All'
      });
    },
    syncFilterDrawerLock() {
      if (typeof document === 'undefined') return;
      document.body.style.overflow = this.isFilterDrawerOpen ? 'hidden' : '';
    }
  }
};
</script>

<style scoped>
/* ShopCatalogView styles: phần heading của catalog/listing. */
.catalog-header {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  padding: var(--sp-7) var(--sp-7) var(--sp-3);
  background: var(--color-paper);
}

.catalog-header h1 {
  margin: 0;
  max-width: 1280px;
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--color-ink);
}

.collection-scope-tabs {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  background: var(--color-paper);
  border-top: 1px solid var(--color-ink-8, rgba(17, 17, 17, 0.08));
  border-bottom: 1px solid var(--color-ink-12);
}

.collection-scope-tabs__list {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1.2vw, 16px);
  padding: 0 var(--sp-7);
  overflow-x: auto;
  scrollbar-width: none;
}

.collection-scope-tabs__list::-webkit-scrollbar {
  display: none;
}

.collection-scope-tabs__button {
  position: relative;
  min-height: 54px;
  flex: 0 0 auto;
  border: 0;
  padding: 0 var(--sp-4);
  background: transparent;
  color: var(--color-ink-45, rgba(17, 17, 17, 0.45));
  cursor: pointer;
  font-family: var(--font);
  font-size: clamp(14px, 1vw, 17px);
  font-weight: 520;
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.collection-scope-tabs__button::after {
  content: '';
  position: absolute;
  right: var(--sp-4);
  bottom: -1px;
  left: var(--sp-4);
  height: 2px;
  background: var(--color-ink);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--t-mid) var(--ease-out);
}

.collection-scope-tabs__button:hover,
.collection-scope-tabs__button--active {
  color: var(--color-ink);
}

.collection-scope-tabs__button--active {
  font-weight: 750;
}

.collection-scope-tabs__button--active::after {
  transform: scaleX(1);
}

.collection-banner-strip {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  display: grid;
  grid-template-columns: 1fr;
  background: var(--color-paper);
}

.collection-banner-strip--split {
  grid-template-columns: 1fr;
}

.collection-banner-strip__item {
  position: relative;
  min-width: 0;
  width: 100%;
  aspect-ratio: 64 / 15;
  margin: 0;
  overflow: hidden;
  background: #eeeae4;
}

.collection-banner-strip__item img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.collection-banner-strip__item span {
  position: absolute;
  right: 20px;
  bottom: 18px;
  padding: 7px 11px;
  background: rgba(255, 255, 255, 0.88);
  color: #111111;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

@media (max-width: 720px) {
  .collection-banner-strip--split {
    grid-template-columns: 1fr;
  }
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

.catalog-layout__results :deep(.shop-results) {
  padding-inline: clamp(18px, 2.4vw, 44px);
}

.catalog-layout__results :deep(.catalog-meta) {
  width: 100%;
  margin-left: 0;
  padding-inline: clamp(18px, 2.4vw, 44px);
}

.catalog-layout__results :deep(.shop-pagination) {
  margin: 18px var(--sp-4) var(--sp-10);
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
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
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
  border-color: #ffca2f;
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
  .catalog-header {
    padding: var(--sp-6) var(--sp-5) var(--sp-3);
  }

  .catalog-header h1 {
    font-size: 32px;
  }

  .catalog-layout {
    display: block;
  }
}
</style>
