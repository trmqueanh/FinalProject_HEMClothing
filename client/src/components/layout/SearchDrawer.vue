<template>
  <transition name="search-drawer">
    <div v-if="isOpen" class="search-drawer-backdrop" @click.self="$emit('close')">
      <aside class="search-drawer" role="dialog" aria-modal="true" aria-label="Search">
        <form class="search-drawer__form" @submit.prevent="$emit('submit-search')">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4.2-4.2" />
          </svg>
          <input
            ref="searchInput"
            :value="searchQuery"
            type="search"
            placeholder="What are you shopping for today?"
            aria-label="Search the storefront"
            @input="$emit('search-input', $event)"
            @compositionstart="$emit('search-composition-start', $event)"
            @compositionupdate="$emit('search-composition', $event)"
            @compositionend="$emit('search-composition-end', $event)"
          />
          <button type="button" class="search-drawer__close" aria-label="Close search" @click="$emit('close')">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </form>

        <div class="search-drawer__body">
          <div v-if="isSearchLoading" class="search-drawer__state search-drawer__state--wide">
            Loading...
          </div>

          <div v-else class="search-drawer__preview">
            <section class="search-drawer__navigation" aria-label="Search suggestions">
              <div class="search-drawer__navigation-head">
                <p class="search-drawer__column-title">{{ navigationTitle }}</p>
              </div>

              <div v-if="hasNavigationSuggestions" class="search-drawer__groups" :class="{ 'search-drawer__groups--popular': !hasQuery }">
                <ul v-if="!hasQuery" class="search-drawer__suggestions search-drawer__suggestions--popular">
                  <li v-for="item in popularSearchSuggestions" :key="item.key">
                    <button
                      type="button"
                      class="search-drawer__suggestion"
                      @click="$emit('select-search-suggestion', item)"
                    >
                      <svg
                        v-if="item.type === 'keyword'"
                        class="search-drawer__suggestion-icon search-drawer__suggestion-icon--search"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.3" />
                        <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                      </svg>
                      <svg v-else class="search-drawer__suggestion-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3 3h3.2v3.2H3zM9.8 3H13v3.2H9.8zM3 9.8h3.2V13H3zM9.8 9.8H13V13H9.8z" stroke="currentColor" stroke-width="1.2" />
                      </svg>
                      <span class="search-drawer__suggestion-copy">
                        <span class="search-drawer__suggestion-label">{{ item.label }}</span>
                        <small v-if="item.meta" class="search-drawer__suggestion-meta">{{ item.meta }}</small>
                      </span>
                    </button>
                  </li>
                </ul>

                <template v-else>
                  <section v-if="categorySuggestions.length" class="search-drawer__group search-drawer__group--categories">
                    <p class="search-drawer__label search-drawer__label--bar">Category</p>
                    <ul class="search-drawer__suggestions">
                      <li v-for="item in categorySuggestions" :key="item.key">
                        <button
                          type="button"
                          class="search-drawer__suggestion search-drawer__suggestion--category"
                          @click="$emit('select-search-suggestion', item)"
                        >
                          <span class="search-drawer__suggestion-copy">
                            <span class="search-drawer__suggestion-label">{{ item.label }}</span>
                            <small v-if="item.meta" class="search-drawer__suggestion-meta">{{ item.meta }}</small>
                          </span>
                        </button>
                      </li>
                    </ul>
                  </section>

                  <section v-if="collectionSuggestions.length" class="search-drawer__group">
                    <p class="search-drawer__label">Collections</p>
                    <ul class="search-drawer__suggestions">
                      <li v-for="item in collectionSuggestions" :key="item.key">
                        <button
                          type="button"
                          class="search-drawer__suggestion"
                          @click="$emit('select-search-suggestion', item)"
                        >
                          <svg class="search-drawer__suggestion-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M3 4.5h10M3 8h10M3 11.5h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                          </svg>
                          <span class="search-drawer__suggestion-copy">
                            <span class="search-drawer__suggestion-label">{{ item.label }}</span>
                            <small v-if="item.meta" class="search-drawer__suggestion-meta">{{ item.meta }}</small>
                          </span>
                        </button>
                      </li>
                    </ul>
                  </section>

                  <section v-if="keywordSuggestions.length" class="search-drawer__group">
                    <p class="search-drawer__label">Searches</p>
                    <ul class="search-drawer__suggestions">
                      <li v-for="item in keywordSuggestions" :key="item.key">
                        <button
                          type="button"
                          class="search-drawer__suggestion"
                          @click="$emit('select-search-suggestion', item)"
                        >
                          <svg class="search-drawer__suggestion-icon search-drawer__suggestion-icon--search" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.3" />
                            <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
                          </svg>
                          <span class="search-drawer__suggestion-copy">
                            <span class="search-drawer__suggestion-label">{{ item.label }}</span>
                          </span>
                        </button>
                      </li>
                    </ul>
                  </section>
                </template>
              </div>

              <div v-else class="search-drawer__state">
                {{ navigationStateText }}
              </div>

              <button v-if="hasPreviewTerm" type="button" class="search-drawer__view-all" @click="$emit('submit-search')">
                <span>View all results for "{{ trimmedQuery }}"</span>
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h9M8.5 4.5L12 8l-3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>

              <section v-if="showRecentSearches" class="search-drawer__recent">
                <div class="search-drawer__section-head">
                  <p class="search-drawer__label">Search History</p>
                  <button type="button" class="search-drawer__clear" @click="$emit('clear-search-history')">Clear</button>
                </div>

                <div class="search-drawer__history">
                  <button
                    v-for="entry in searchHistory"
                    :key="entry.id"
                    type="button"
                    class="search-drawer__history-item"
                    @click="$emit('run-search-history', entry.keyword)"
                  >
                    <svg class="search-drawer__history-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.3" />
                      <path d="M8 5.5V8l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span class="search-drawer__history-keyword">{{ entry.keyword }}</span>
                  </button>
                </div>
              </section>
            </section>

            <section class="search-drawer__products" aria-label="Suggested products">
              <ShopProductPreviewGrid
                v-if="suggestedProducts.length"
                section-id="search-drawer-products"
                :label="productTitle"
                :products="suggestedProducts"
                class="search-drawer__product-grid"
              />

              <div v-else class="search-drawer__state search-drawer__state--products">
                {{ productStateText }}
              </div>
            </section>
          </div>
        </div>
      </aside>
    </div>
  </transition>
</template>

<script>
import ShopProductPreviewGrid from '../shop/ShopProductPreviewGrid.vue';
import { expandProductsToColorCards } from '../../helpers/shop/listingColorCards';

const MIN_PREVIEW_QUERY_LENGTH = 2;

export default {
  name: 'SearchDrawer',
  components: {
    ShopProductPreviewGrid
  },
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
    searchQuery: {
      type: String,
      default: ''
    },
    isSearchLoading: {
      type: Boolean,
      default: false
    },
    searchSuggestions: {
      type: Array,
      default: () => []
    },
    searchHistory: {
      type: Array,
      default: () => []
    },
    formatSearchDate: {
      type: Function,
      required: true
    }
  },
  emits: [
    'close',
    'submit-search',
    'search-input',
    'search-composition-start',
    'search-composition',
    'search-composition-end',
    'select-search-suggestion',
    'clear-search-history',
    'run-search-history'
  ],
  computed: {
    trimmedQuery() {
      return String(this.searchQuery || '').trim();
    },
    hasQuery() {
      return Boolean(this.trimmedQuery);
    },
    hasPreviewTerm() {
      return this.trimmedQuery.length >= MIN_PREVIEW_QUERY_LENGTH;
    },
    suggestions() {
      return Array.isArray(this.searchSuggestions) ? this.searchSuggestions : [];
    },
    suggestedProducts() {
      return expandProductsToColorCards(
        this.suggestions
          .filter(item => item && item.type === 'product' && item.product)
          .map(item => item.product),
        { singleCardPerProduct: true }
      ).slice(0, 8);
    },
    popularSearchSuggestions() {
      if (this.hasQuery) return [];

      return this.suggestions
        .filter(item => item && ['category', 'collection', 'product', 'keyword'].includes(item.type))
        .slice(0, 6);
    },
    categorySuggestions() {
      return this.suggestions.filter(item => item && item.type === 'category').slice(0, 4);
    },
    collectionSuggestions() {
      return this.suggestions.filter(item => item && item.type === 'collection').slice(0, 2);
    },
    keywordSuggestions() {
      return this.suggestions.filter(item => item && item.type === 'keyword').slice(0, 3);
    },
    hasNavigationSuggestions() {
      if (!this.hasQuery) {
        return Boolean(this.popularSearchSuggestions.length);
      }

      return Boolean(
        this.categorySuggestions.length ||
        this.collectionSuggestions.length ||
        this.keywordSuggestions.length
      );
    },
    navigationTitle() {
      return this.hasQuery ? 'YOU ARE LOOKING FOR...' : 'POPULAR SEARCHES';
    },
    productTitle() {
      return this.hasQuery ? 'SUGGESTED PRODUCTS' : 'POPULAR PRODUCTS';
    },
    navigationStateText() {
      if (!this.hasQuery) {
        return 'Start typing to search';
      }

      return this.hasPreviewTerm ? 'No product suggestions found' : 'Keep typing to search';
    },
    showRecentSearches() {
      return !this.hasQuery && Array.isArray(this.searchHistory) && this.searchHistory.length;
    },
    productStateText() {
      if (!this.hasQuery) {
        return 'Popular products will appear here';
      }

      return this.hasPreviewTerm
        ? `No products found for “${this.trimmedQuery}”. Try another product name, colour, category, or material.`
        : 'Keep typing to see products';
    }
  },
  methods: {
    focusInput() {
      const input = this.$refs.searchInput;
      if (input && typeof input.focus === 'function') {
        input.focus();
      }
    }
  }
};
</script>

<style scoped>
.search-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 440;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: rgba(17, 17, 17, 0.16);
  backdrop-filter: blur(7px);
}

.search-drawer {
  width: 100%;
  max-height: 100vh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 24px;
  overflow: hidden;
  padding: 0 max(var(--layout-gutter), 32px) 34px;
  background: var(--color-paper, #ffffff);
  border-top: 0;
  box-shadow: 0 24px 60px rgba(17, 17, 17, 0.10);
}

.search-drawer-enter-active .search-drawer,
.search-drawer-leave-active .search-drawer {
  transition: transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.search-drawer-enter-from .search-drawer,
.search-drawer-leave-to .search-drawer {
  transform: translateY(-100%);
}

.search-drawer__form {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) 36px;
  align-items: center;
  gap: 12px;
  min-height: 68px;
  padding-top: 24px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.12);
}

.search-drawer__form svg {
  width: 15px;
  height: 15px;
  stroke: currentColor;
  stroke-width: 1.5;
  fill: none;
  color: rgba(17, 17, 17, 0.4);
}

.search-drawer .search-drawer__form input[type='search'] {
  min-height: 44px;
  border: 0 !important;
  border-radius: 0 !important;
  padding: 0 !important;
  appearance: none;
  background: transparent !important;
  color: #111111;
  font-family: inherit;
  font-size: 16px;
  font-weight: 300;
  letter-spacing: 0.02em;
  outline: none !important;
  box-shadow: none !important;
}

.search-drawer .search-drawer__form input[type='search']::placeholder {
  color: rgba(17, 17, 17, 0.25);
  font-size: 15px;
  font-weight: 300;
  letter-spacing: 0.05em;
  text-transform: none;
}

.search-drawer .search-drawer__form input[type='search']:hover,
.search-drawer .search-drawer__form input[type='search']:focus,
.search-drawer .search-drawer__form input[type='search']:focus-visible {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.search-drawer__form:focus-within {
  border-bottom-color: rgba(17, 17, 17, 0.4);
}

.search-drawer__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(17, 17, 17, 0.05);
  color: rgba(17, 17, 17, 0.55);
  cursor: pointer;
  transition: all 160ms ease;
}

.search-drawer__close:hover {
  background: rgba(17, 17, 17, 0.1);
  color: #111111;
}

.search-drawer__close svg {
  width: 12px;
  height: 12px;
}

.search-drawer__body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.search-drawer__body::-webkit-scrollbar {
  display: none;
}

.search-drawer__preview {
  display: grid;
  grid-template-columns: minmax(260px, 34%) minmax(0, 1fr);
  align-items: start;
  gap: 30px;
}

.search-drawer__navigation {
  min-height: min(560px, calc(100vh - 128px));
  display: grid;
  align-content: start;
  gap: 18px;
  padding-right: 28px;
  border-right: 1px solid rgba(17, 17, 17, 0.12);
}

.search-drawer__products {
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 18px;
}

.search-drawer__product-grid {
  --preview-grid-columns: 4;

  min-width: 0;
  max-width: 100%;
}

.search-drawer__product-grid :deep(.product-preview-grid h2) {
  font-size: 18px;
  font-weight: 650;
  line-height: 1.2;
}

.search-drawer__column-title {
  margin: 0;
  color: var(--color-text-primary, #111111);
  font-size: 18px;
  font-weight: 650;
  letter-spacing: 0;
  line-height: 1.2;
}

.search-drawer__navigation-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.search-drawer__groups {
  display: grid;
  gap: 18px;
}

.search-drawer__groups--popular {
  gap: 0;
}

.search-drawer__group,
.search-drawer__recent {
  display: grid;
  gap: 10px;
}

.search-drawer__group--categories {
  gap: 12px;
}

.search-drawer__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.search-drawer__label {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(17, 17, 17, 0.42);
}

.search-drawer__label--bar {
  padding: 8px 10px;
  background: rgba(17, 17, 17, 0.055);
  color: #111111;
  font-size: 16px;
  font-weight: 520;
  letter-spacing: 0;
  line-height: 1.2;
  text-transform: none;
}

.search-drawer__clear {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  font-family: inherit;
  transition: color 0.14s ease;
}

.search-drawer__clear:hover {
  color: var(--color-text-primary);
}

.search-drawer__suggestions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0;
}

.search-drawer__suggestion {
  display: flex;
  align-items: center;
  gap: 13px;
  width: 100%;
  min-height: 56px;
  padding: 0 8px 0 0;
  border: none;
  border-radius: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
  border-bottom: 1px solid rgba(17, 17, 17, 0.08);
  font-family: inherit;
}

.search-drawer__suggestion:hover {
  background: rgba(17, 17, 17, 0.04);
}

.search-drawer__suggestion--category {
  align-items: flex-start;
  min-height: 52px;
  padding: 4px 8px 8px 0;
  border-bottom: 0;
}

.search-drawer__suggestion--category:hover {
  background: transparent;
}

.search-drawer__suggestion--category .search-drawer__suggestion-label {
  font-size: 16px;
  font-weight: 650;
  letter-spacing: 0;
  white-space: normal;
}

.search-drawer__suggestion--category .search-drawer__suggestion-meta {
  color: rgba(17, 17, 17, 0.54);
  font-size: 13px;
  line-height: 1.3;
}

.search-drawer__suggestions--popular .search-drawer__suggestion {
  min-height: 66px;
  gap: 18px;
  padding-right: 10px;
}

.search-drawer__suggestions--popular .search-drawer__suggestion-label {
  font-size: 21px;
  font-weight: 450;
  letter-spacing: 0;
}

.search-drawer__suggestions--popular .search-drawer__suggestion-meta {
  font-size: 14px;
}

.search-drawer__suggestions--popular .search-drawer__suggestion-icon {
  width: 22px;
  height: 22px;
}

.search-drawer__suggestion-icon {
  width: 17px;
  height: 17px;
  color: rgba(17, 17, 17, 0.54);
  flex-shrink: 0;
}

.search-drawer__suggestion-icon--search {
  width: 18px;
  height: 18px;
}

.search-drawer__suggestion-copy {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.search-drawer__suggestion-label {
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 420;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-drawer__suggestion-meta {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-drawer__view-all {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 520;
  text-align: left;
}

.search-drawer__view-all svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.search-drawer__prompt,
.search-drawer__state {
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.search-drawer__state--wide {
  min-height: 180px;
}

.search-drawer__state--products {
  min-height: 220px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(17, 17, 17, 0.08);
  background: rgba(17, 17, 17, 0.02);
}

.search-drawer__history {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.search-drawer__history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 42px;
  padding: 0 8px 0 0;
  border: none;
  border-radius: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}

.search-drawer__history-item:hover {
  background: rgba(17, 17, 17, 0.04);
}

.search-drawer__history-icon {
  width: 14px;
  height: 14px;
  color: rgba(17, 17, 17, 0.35);
  flex-shrink: 0;
}

.search-drawer__history-keyword {
  flex: 1;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-drawer__history-date {
  color: var(--color-text-secondary);
  font-size: 11px;
  flex-shrink: 0;
}

.search-drawer-enter-active,
.search-drawer-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.search-drawer-enter-from,
.search-drawer-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .search-drawer {
    gap: 18px;
    padding-right: max(var(--layout-gutter), 20px);
    padding-left: max(var(--layout-gutter), 20px);
  }

  .search-drawer__preview {
    grid-template-columns: 1fr;
    gap: 28px;
  }

  .search-drawer__navigation {
    min-height: 0;
    padding-right: 0;
    padding-bottom: 24px;
    border-right: 0;
    border-bottom: 1px solid rgba(17, 17, 17, 0.12);
  }

}

@media (max-width: 560px) {
  .search-drawer {
    padding: 0 16px 24px;
  }

  .search-drawer__form {
    min-height: 62px;
    padding-top: 18px;
  }

  .search-drawer__column-title {
    font-size: 16px;
  }

  .search-drawer__suggestion {
    min-height: 52px;
  }
}
</style>
