<template>
  <section class="catalog-tabs" aria-label="Product categories">
    <div role="tablist" aria-label="Filter by category" class="catalog-tabs__list">
      <button
        v-for="category in visibleCategories"
        :key="category.id || category.slug || category.name"
        type="button"
        role="tab"
        class="catalog-tabs__button"
        :class="{ 'catalog-tabs__button--active': isCategoryActive(category) }"
        :aria-selected="isCategoryActive(category) ? 'true' : 'false'"
        :tabindex="isCategoryActive(category) ? 0 : -1"
        @click="$emit('select-category', category)"
        @keydown="$emit('tab-keydown', $event, category)"
      >
        {{ category.label || formatCategoryLabel(category.name) }}
      </button>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ShopCategoryTabs',
  props: {
    visibleCategories: {
      type: Array,
      default: () => []
    },
    isCategoryActive: {
      type: Function,
      required: true
    },
    formatCategoryLabel: {
      type: Function,
      required: true
    }
  },
  emits: ['select-category', 'tab-keydown']
};
</script>

<style scoped>
.catalog-tabs {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  overflow-x: auto;
  background: var(--color-paper);
  border-bottom: 1px solid var(--color-ink-12);
  scrollbar-width: none;
  position: sticky;
  top: var(--store-header-height, 64px);
  z-index: 10;
}

.catalog-tabs::-webkit-scrollbar {
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
  font-size: var(--size-11);
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

@media (max-width: 860px) {
  .catalog-tabs__list { padding: 0 var(--sp-5); }
}

@media (max-width: 560px) {
  .catalog-tabs__list { padding: 0 var(--sp-4); gap: 4px; }
  .catalog-tabs__button { min-height: 52px; font-size: var(--size-10); padding: 0 var(--sp-3); }
}
</style>
