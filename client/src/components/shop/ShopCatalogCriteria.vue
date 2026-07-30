<template>
  <aside class="catalog-filters" aria-labelledby="catalog-filters-title">
    <div class="catalog-filters__heading">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16M7 12h10M10 18h4" />
      </svg>
      <h2 id="catalog-filters-title">Filters</h2>
    </div>

    <template v-if="!activePanel">
      <button
        v-for="panel in filterPanels"
        :key="panel.key"
        type="button"
        class="filter-section filter-section--menu"
        @click="openPanel(panel.key)"
      >
        <span class="filter-section__copy">
          <span class="filter-section__title">{{ panel.label }}</span>
          <small v-if="panel.activeLabel">{{ panel.activeLabel }}</small>
        </span>
        <span class="filter-section__arrow" aria-hidden="true"></span>
      </button>
    </template>

    <template v-else>
      <button type="button" class="filter-panel__back" @click="closePanel">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M10 3L5 8l5 5" />
        </svg>
        <span>{{ activePanelTitle }}</span>
      </button>

      <div v-if="activePanelConfig && activePanelConfig.type === 'price'" class="filter-price__quick filter-panel__options" role="group" :aria-label="activePanelTitle">
        <button
          v-if="activePanelConfig.showAllOption"
          type="button"
          :class="{ 'is-selected': isFullPriceRangeSelected }"
          :aria-pressed="isFullPriceRangeSelected ? 'true' : 'false'"
          @click="clearPricePanel"
        >
          All prices
        </button>
        <button
          v-for="bucket in priceBuckets"
          :key="bucket.key"
          type="button"
          :class="{ 'is-selected': isPriceBucketSelected(bucket) }"
          :aria-pressed="isPriceBucketSelected(bucket) ? 'true' : 'false'"
          @click="applyPriceBucket(bucket)"
        >
          {{ bucket.label }}
        </button>
      </div>

      <div v-else-if="activePanelConfig" class="filter-section__list filter-panel__options" role="group" :aria-label="activePanelTitle">
        <button
          v-if="activePanelConfig.showAllOption !== false"
          type="button"
          class="filter-check"
          :class="{ 'is-selected': activePanelConfig.activeValue === 'All' }"
          :aria-pressed="activePanelConfig.activeValue === 'All' ? 'true' : 'false'"
          @click="selectFilterOption(activePanelConfig.filter, 'All', activePanelConfig.activeValue)"
        >
          <span class="filter-check__box" aria-hidden="true"></span>
          <span class="filter-check__label">All</span>
        </button>

        <button
          v-for="option in activePanelConfig.options"
          :key="option.key"
          type="button"
          class="filter-check"
          :class="{ 'is-selected': option.selected, 'filter-check--color': activePanelConfig.type === 'color' }"
          :aria-pressed="option.selected ? 'true' : 'false'"
          @click="selectFilterOption(activePanelConfig.filter, option.value, activePanelConfig.activeValue)"
        >
          <span
            v-if="activePanelConfig.type === 'color'"
            class="filter-check__swatch"
            :style="{ background: option.swatch }"
            aria-hidden="true"
          ></span>
          <span v-else class="filter-check__box" aria-hidden="true"></span>
          <span class="filter-check__label">{{ option.label }}</span>
          <span v-if="option.count !== null" class="filter-check__count">({{ option.count }})</span>
        </button>
      </div>
    </template>

  </aside>
</template>

<script>
export default {
  name: 'ShopCatalogCriteria',
  props: {
    activeCategory: { type: String, default: 'All' },
    activeProductGroup: { type: String, default: 'All' },
    activeCollection: { type: String, default: 'All' },
    activeGender: { type: String, default: 'All' },
    activeColor: { type: String, default: 'All' },
    activeFit: { type: String, default: 'All' },
    activeGarmentLength: { type: String, default: 'All' },
    activeHeelHeight: { type: String, default: 'All' },
    activeMaterial: { type: String, default: 'All' },
    activeNeckline: { type: String, default: 'All' },
    activeSize: { type: String, default: 'All' },
    activeSleeveLength: { type: String, default: 'All' },
    activeStyle: { type: String, default: 'All' },
    activeWaistRise: { type: String, default: 'All' },
    activePriceMin: { type: Number, default: 0 },
    activePriceMax: { type: Number, default: 0 },
    categoryFilterLabel: { type: String, default: 'Category' },
    categoryOptions: { type: Array, default: () => [] },
    productGroupOptions: { type: Array, default: () => [] },
    collections: { type: Array, default: () => [] },
    colorOptions: { type: Array, default: () => [] },
    filterOptionCounts: { type: Object, default: () => ({}) },
    garmentLengthOptions: { type: Array, default: () => [] },
    genderOptions: { type: Array, default: () => [] },
    heelHeightOptions: { type: Array, default: () => [] },
    materialOptions: { type: Array, default: () => [] },
    necklineOptions: { type: Array, default: () => [] },
    sizeOptions: { type: Array, default: () => [] },
    sleeveLengthOptions: { type: Array, default: () => [] },
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
    fitOptions: { type: Array, default: () => [] },
    priceRange: { type: Object, required: true },
    sortBy: { type: String, default: 'newest' },
    styleFilterLabel: { type: String, default: 'Style' },
    styleOptions: { type: Array, default: () => [] },
    waistRiseOptions: { type: Array, default: () => [] },
    formatCategoryLabel: { type: Function, required: true },
    formatCurrency: { type: Function, required: true }
  },
  emits: ['apply-inline-filter', 'clear-filters', 'set-price-filter'],
  data() {
    return {
      activePanel: ''
    };
  },
  computed: {
    visibleCategoryOptions() {
      return this.categoryOptions.filter(value => this.optionValue(value));
    },
    visibleProductGroupOptions() {
      return this.productGroupOptions.filter(value => this.optionValue(value));
    },
    visibleCollections() {
      return this.collections.filter(value => String(value || '').trim());
    },
    visibleGenderOptions() {
      return this.genderOptions.filter(value => this.optionValue(value));
    },
    visibleColorOptions() {
      return this.colorOptions.filter(value => this.optionValue(value));
    },
    visibleSizeOptions() {
      return this.sizeOptions.filter(value => String(value || '').trim());
    },
    visibleFitOptions() {
      return this.fitOptions.filter(value => this.optionValue(value));
    },
    visibleNecklineOptions() {
      return this.necklineOptions.filter(value => this.optionValue(value));
    },
    visibleWaistRiseOptions() {
      return this.waistRiseOptions.filter(value => this.optionValue(value));
    },
    visibleSleeveLengthOptions() {
      return this.sleeveLengthOptions.filter(value => this.optionValue(value));
    },
    visibleGarmentLengthOptions() {
      return this.garmentLengthOptions.filter(value => this.optionValue(value));
    },
    visibleStyleOptions() {
      return this.styleOptions.filter(value => this.optionValue(value));
    },
    visibleHeelHeightOptions() {
      return this.heelHeightOptions.filter(value => this.optionValue(value));
    },
    visibleMaterialOptions() {
      return this.materialOptions.filter(value => this.optionValue(value));
    },
    hasActiveFilters() {
      return (
        (this.showCategoryFilter && this.activeCategory !== 'All') ||
        (this.showProductGroupFilter && this.activeProductGroup !== 'All') ||
        (this.showCollectionFilter && this.activeCollection !== 'All') ||
        (this.showGenderFilter && this.activeGender !== 'All') ||
        this.activeColor !== 'All' ||
        (this.showSizeFilter && this.activeSize !== 'All') ||
        (this.showFitFilter && this.activeFit !== 'All') ||
        (this.showNecklineFilter && this.activeNeckline !== 'All') ||
        (this.showWaistRiseFilter && this.activeWaistRise !== 'All') ||
        (this.showSleeveLengthFilter && this.activeSleeveLength !== 'All') ||
        (this.showGarmentLengthFilter && this.activeGarmentLength !== 'All') ||
        (this.showStyleFilter && this.activeStyle !== 'All') ||
        (this.showHeelHeightFilter && this.activeHeelHeight !== 'All') ||
        (this.showMaterialFilter && this.activeMaterial !== 'All') ||
        this.activePriceMin !== this.priceRange.min ||
        this.activePriceMax !== this.priceRange.max
      );
    },
    priceBuckets() {
      const rawBuckets = [
        { min: 0, max: 500000 },
        { min: 500000, max: 1000000 },
        { min: 1000000, max: 1500000 },
        { min: 1500000, max: 2000000 },
        { min: 2000000, max: null }
      ];

      return rawBuckets
        .filter(bucket => {
          const bucketMax = bucket.max === null ? Number.POSITIVE_INFINITY : bucket.max;
          return bucketMax >= this.priceRange.min && bucket.min <= this.priceRange.max;
        })
        .map(bucket => ({
          ...bucket,
          key: `${bucket.min}-${bucket.max || 'up'}`,
          label: bucket.max === null
            ? `${this.formatCurrency(bucket.min)}+`
            : `${this.formatCurrency(bucket.min)} - ${this.formatCurrency(bucket.max)}`
        }));
    },
    isFullPriceRangeSelected() {
      return this.activePriceMin === this.priceRange.min && this.activePriceMax === this.priceRange.max;
    },
    priceActiveLabel() {
      return this.isFullPriceRangeSelected
        ? ''
        : `${this.formatCurrency(this.activePriceMin)} - ${this.formatCurrency(this.activePriceMax)}`;
    },
    filterPanels() {
      const panels = [];
      const addPanel = config => {
        if (!config.visible || (config.type !== 'price' && !config.options.length)) return;

        panels.push({
          ...config,
          activeLabel: config.type === 'price' ? this.priceActiveLabel : this.panelActiveLabel(config)
        });
      };

      addPanel({
        key: 'price',
        label: 'Price',
        type: 'price',
        visible: this.priceRange.max > this.priceRange.min
      });
      addPanel(this.optionPanel(
        'productGroup',
        'Product Group',
        this.visibleProductGroupOptions,
        this.activeProductGroup,
        this.showProductGroupFilter,
        'list',
        false
      ));
      addPanel(this.optionPanel('category', this.categoryFilterLabel, this.visibleCategoryOptions, this.activeCategory, this.showCategoryFilter));
      addPanel(this.optionPanel('collection', 'Collection', this.visibleCollections, this.activeCollection, this.showCollectionFilter));
      addPanel(this.optionPanel('department', 'Gender', this.visibleGenderOptions, this.activeGender, this.showGenderFilter));
      addPanel(this.optionPanel('color', 'Color', this.visibleColorOptions, this.activeColor, Boolean(this.visibleColorOptions.length), 'color'));
      addPanel(this.optionPanel('size', 'Size', this.visibleSizeOptions, this.activeSize, this.showSizeFilter));
      addPanel(this.optionPanel('fit', 'Fit', this.visibleFitOptions, this.activeFit, this.showFitFilter));
      addPanel(this.optionPanel('neckline', 'Neckline', this.visibleNecklineOptions, this.activeNeckline, this.showNecklineFilter));
      addPanel(this.optionPanel('waistRise', 'Waist rise', this.visibleWaistRiseOptions, this.activeWaistRise, this.showWaistRiseFilter));
      addPanel(this.optionPanel('sleeveLength', 'Sleeve length', this.visibleSleeveLengthOptions, this.activeSleeveLength, this.showSleeveLengthFilter));
      addPanel(this.optionPanel('garmentLength', 'Length', this.visibleGarmentLengthOptions, this.activeGarmentLength, this.showGarmentLengthFilter));
      addPanel(this.optionPanel('style', this.styleFilterLabel, this.visibleStyleOptions, this.activeStyle, this.showStyleFilter));
      addPanel(this.optionPanel('heelHeight', 'Heel height', this.visibleHeelHeightOptions, this.activeHeelHeight, this.showHeelHeightFilter));
      addPanel(this.optionPanel('material', 'Material', this.visibleMaterialOptions, this.activeMaterial, this.showMaterialFilter));

      return panels;
    },
    activePanelConfig() {
      return this.filterPanels.find(panel => panel.key === this.activePanel) || null;
    },
    activePanelTitle() {
      return this.activePanelConfig ? this.activePanelConfig.label : 'Filters';
    }
  },
  methods: {
    optionPanel(filter, label, options, activeValue, visible, type = 'list', showAllOption = true) {
      const panelOptions = options
        .map(option => {
          const value = this.optionValue(option);
          const optionLabel = filter === 'collection' ? String(option || '').trim() : this.optionLabel(option);
          const count = this.optionCount(filter, value);

          return {
            key: this.optionKey(option),
            value,
            label: optionLabel,
            selected: activeValue === value,
            count,
            swatch: option && typeof option === 'object' ? option.swatch || option.hex || '#dddddd' : ''
          };
        })
        .filter(option => option.value && (option.count === null || option.count > 0));

      return {
        key: filter,
        filter,
        label,
        type,
        visible: Boolean(visible),
        activeValue,
        showAllOption,
        options: panelOptions
      };
    },
    panelActiveLabel(config) {
      if (!config || config.activeValue === 'All') return '';

      const selectedOption = config.options.find(option => option.value === config.activeValue);
      return selectedOption ? selectedOption.label : this.formatCategoryLabel(config.activeValue);
    },
    openPanel(panel) {
      this.activePanel = panel;
    },
    closePanel() {
      this.activePanel = '';
    },
    optionCount(filter, value) {
      const counts = this.filterOptionCounts[filter];
      if (!counts || typeof counts !== 'object') return null;
      return Number(counts[value] || 0);
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
    optionKey(option) {
      return `${this.optionValue(option)}-${this.optionLabel(option)}`;
    },
    toggleFilter(filter, value, activeValue) {
      this.$emit('apply-inline-filter', {
        filter,
        value: activeValue === value ? 'All' : value
      });
    },
    selectFilterOption(filter, value, activeValue) {
      this.toggleFilter(filter, value, activeValue);
      this.closePanel();
    },
    normalizedPriceBucket(bucket) {
      const min = Math.max(this.priceRange.min, Number(bucket.min || 0));
      const max = bucket.max === null
        ? this.priceRange.max
        : Math.min(this.priceRange.max, Number(bucket.max));

      return { min, max };
    },
    isPriceBucketSelected(bucket) {
      const { min, max } = this.normalizedPriceBucket(bucket);
      return this.activePriceMin === min && this.activePriceMax === max;
    },
    applyPriceBucket(bucket) {
      if (this.isPriceBucketSelected(bucket)) {
        this.$emit('set-price-filter', {
          min: this.priceRange.min,
          max: this.priceRange.max
        });
        this.closePanel();
        return;
      }

      this.$emit('set-price-filter', this.normalizedPriceBucket(bucket));
      this.closePanel();
    },
    clearPricePanel() {
      this.$emit('set-price-filter', {
        min: this.priceRange.min,
        max: this.priceRange.max
      });
      this.closePanel();
    }
  }
};
</script>

<style scoped>
.catalog-filters {
  position: sticky;
  top: calc(var(--store-header-height, 64px) + 54px);
  align-self: start;
  min-width: 0;
  max-width: 100%;
  max-height: calc(100vh - var(--store-header-height, 64px) - 54px);
  display: grid;
  gap: 0;
  padding: 20px 22px 36px;
  border-right: 1px solid var(--color-ink-12);
  background: var(--color-paper);
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.catalog-filters::-webkit-scrollbar,
.filter-section__options::-webkit-scrollbar {
  display: none;
}

.catalog-filters__heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 18px;
}

.catalog-filters__heading svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.catalog-filters h2,
.catalog-filters h3 {
  margin: 0;
  color: var(--color-ink);
  letter-spacing: 0;
  text-transform: uppercase;
}

.catalog-filters h2 {
  font-size: 18px;
  font-weight: 700;
}

.catalog-filters h3 {
  font-size: 13px;
  font-weight: 700;
}

.catalog-filters__clear {
  justify-self: start;
  margin: -6px 0 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-ink-60);
  font: inherit;
  font-size: 12px;
  letter-spacing: 0;
  text-decoration: underline;
  cursor: pointer;
}

.filter-section {
  min-width: 0;
  display: grid;
  gap: 14px;
  padding: 22px 0;
  border-top: 1px solid var(--color-ink-12);
}

.filter-section--menu {
  width: 100%;
  grid-template-columns: minmax(0, 1fr) 12px;
  align-items: center;
  gap: 16px;
  border-right: 0;
  border-bottom: 0;
  border-left: 0;
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.filter-section--menu:hover .filter-section__title {
  color: #000000;
}

.filter-section__copy {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.filter-section__title {
  color: var(--color-ink);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.25;
  text-transform: uppercase;
}

.filter-section__copy small {
  color: var(--color-ink-60);
  font-size: 12px;
  font-weight: 450;
  line-height: 1.25;
}

.filter-section__arrow {
  width: 10px;
  height: 10px;
  border-top: 1.6px solid currentColor;
  border-right: 1.6px solid currentColor;
  transform: rotate(45deg);
}

.filter-section__summary {
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  list-style: none;
  cursor: pointer;
}

.filter-section__summary::-webkit-details-marker {
  display: none;
}

.filter-section__summary::after {
  content: '';
  width: 10px;
  height: 10px;
  flex: 0 0 10px;
  border-top: 1.6px solid currentColor;
  border-right: 1.6px solid currentColor;
  transform: rotate(45deg);
  transition: transform 160ms ease;
}

.filter-section[open] .filter-section__summary::after {
  transform: rotate(135deg);
}

.filter-section[open] .filter-section__options {
  margin-top: 12px;
}

.filter-section__list {
  min-width: 0;
  display: grid;
  gap: 10px;
}

.filter-panel__back {
  width: 100%;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--color-ink-12);
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-align: left;
  text-transform: uppercase;
  cursor: pointer;
}

.filter-panel__back svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.filter-panel__options {
  padding-top: 18px;
}

.filter-section__options {
  min-width: 0;
  max-height: 220px;
  padding-right: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.filter-check {
  width: 100%;
  min-width: 0;
  min-height: 28px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  text-align: left;
  cursor: pointer;
}

.filter-check__label {
  min-width: 0;
  flex: 1 1 auto;
  overflow-wrap: anywhere;
  word-break: normal;
  white-space: normal;
  line-height: 1.35;
}

.filter-check__count {
  margin-left: auto;
  color: var(--color-ink-60);
  font-size: 12px;
  flex: 0 0 auto;
  line-height: 1.35;
}

.filter-check__box,
.filter-check__radio,
.filter-check__swatch {
  margin-top: 1px;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border: 1px solid var(--color-ink-30);
  background: var(--color-white);
}

.filter-check__swatch {
  border-radius: 50%;
}

.filter-check__radio {
  border-radius: 50%;
}

.filter-check.is-selected .filter-check__box {
  background: var(--color-ink);
  box-shadow: inset 0 0 0 4px var(--color-white);
}

.filter-check.is-selected .filter-check__swatch {
  outline: 2px solid var(--color-ink);
  outline-offset: 2px;
}

.filter-check.is-selected .filter-check__radio {
  border-color: var(--color-ink);
  box-shadow: inset 0 0 0 4px var(--color-white);
  background: var(--color-ink);
}

.filter-colors {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px 8px;
}

.filter-colors button {
  min-width: 0;
  display: grid;
  justify-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-ink-60);
  font: inherit;
  cursor: pointer;
}

.filter-colors button > span {
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-ink-12);
  border-radius: 50%;
}

.filter-colors button.is-selected > span {
  outline: 2px solid var(--color-ink);
  outline-offset: 3px;
}

.filter-colors small {
  width: 100%;
  font-size: 9px;
  letter-spacing: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-sizes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.filter-sizes button {
  min-height: 36px;
  padding: 0 6px;
  border: 1px solid var(--color-ink-12);
  border-radius: 4px;
  background: var(--color-white);
  color: var(--color-ink);
  font: inherit;
  font-size: 12px;
  letter-spacing: 0;
  cursor: pointer;
}

.filter-sizes button.is-selected {
  border-color: var(--color-ink);
  background: var(--color-ink);
  color: var(--color-white);
}

.filter-price__quick {
  display: grid;
  gap: 8px;
  max-height: none;
}

.filter-price__quick button {
  width: 100%;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--color-ink-12);
  border-radius: 4px;
  background: var(--color-white);
  color: var(--color-ink);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  text-align: left;
  cursor: pointer;
}

.filter-price__quick button.is-selected {
  border-color: var(--color-ink);
  background: var(--color-ink);
  color: var(--color-white);
}

@media (max-width: 860px) {
  .catalog-filters {
    position: static;
    max-height: none;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 24px;
    padding: 18px var(--sp-5) 24px;
    border-right: 0;
    border-bottom: 1px solid var(--color-ink-12);
    overflow: visible;
  }

  .catalog-filters__heading,
  .catalog-filters__clear {
    grid-column: 1 / -1;
  }
}

@media (max-width: 560px) {
  .catalog-filters {
    grid-template-columns: 1fr;
    padding-inline: var(--sp-4);
  }

  .catalog-filters__heading,
  .catalog-filters__clear {
    grid-column: auto;
  }
}
</style>
