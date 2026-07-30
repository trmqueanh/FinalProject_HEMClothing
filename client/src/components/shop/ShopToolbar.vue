<template>
  <section class="catalog-meta">
    <div class="catalog-meta__left">
      <div class="catalog-meta__controls">
        <div class="catalog-meta__count" aria-live="polite" aria-atomic="true">
          <strong>{{ formattedItemCount }}</strong>
          <span>{{ itemCount === 1 ? 'Result' : 'Results' }}</span>
        </div>

        <details ref="sortMenu" class="catalog-sort">
          <summary>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 3v14M3 6l3-3 3 3M14 17V3M11 14l3 3 3-3" />
            </svg>
            Sort By
          </summary>

          <div class="catalog-sort__menu" role="radiogroup" aria-label="Sort products">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              role="radio"
              :aria-checked="sortBy === option.value ? 'true' : 'false'"
              :class="{ 'is-selected': sortBy === option.value }"
              @click="selectSort(option.value)"
            >
              <span aria-hidden="true"></span>
              {{ option.label }}
            </button>
          </div>
        </details>
      </div>

      <div v-if="activeFilterChips.length" class="catalog-meta__chips" aria-label="Applied filters">
        <button
          v-for="chip in activeFilterChips"
          :key="chip.key"
          type="button"
          class="catalog-meta__chip"
          @click="$emit('remove-filter-chip', chip)"
        >
          <span>{{ chip.label }}</span>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>
    </div>

    <button type="button" class="catalog-filter-toggle" @click="$emit('open-filters')">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5 3v14M15 3v14M3 6h4M13 14h4M3 14h4M13 6h4" />
        <circle cx="5" cy="10" r="2" />
        <circle cx="15" cy="10" r="2" />
      </svg>
      Filter 
    </button>
  </section>
</template>

<script>
export default {
  name: 'ShopToolbar',
  props: {
    itemCount: {
      type: Number,
      default: 0
    },
    sortBy: {
      type: String,
      default: 'newest'
    },
    sortOptions: {
      type: Array,
      default: () => []
    },
    activeFilterChips: {
      type: Array,
      default: () => []
    }
  },
  emits: ['open-filters', 'remove-filter-chip', 'set-inline-sort'],
  computed: {
    formattedItemCount() {
      return new Intl.NumberFormat('en-US').format(this.itemCount);
    }
  },
  methods: {
    selectSort(value) {
      this.$emit('set-inline-sort', value);
      if (this.$refs.sortMenu) this.$refs.sortMenu.removeAttribute('open');
    }
  }
};
</script>

<style scoped>
.catalog-meta {
  position: relative;
  z-index: 9;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 30px;
  min-height: 58px;
  padding: 0 var(--sp-5);
  border-bottom: 1px solid var(--color-ink-06);
  background: var(--color-paper);
  color: var(--color-ink);
}

.catalog-meta__left {
  min-width: 0;
  display: grid;
  gap: 10px;
  padding: 10px 0;
}

.catalog-meta__controls {
  display: inline-flex;
  align-items: center;
  gap: 28px;
}

.catalog-meta__count {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  font-size: 14px;
  letter-spacing: 0;
}

.catalog-meta__count strong {
  color: #3c45b8;
  font-size: 15px;
  font-weight: 800;
}

.catalog-meta__count span {
  font-weight: 600;
}

.catalog-sort {
  position: relative;
}

.catalog-sort summary {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  cursor: pointer;
  list-style: none;
}

.catalog-sort summary::-webkit-details-marker {
  display: none;
}

.catalog-sort summary svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.catalog-sort__menu {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  z-index: 20;
  width: 230px;
  display: grid;
  gap: 4px;
  padding: 14px;
  border: 1px solid var(--color-ink-12);
  border-radius: 8px;
  background: var(--color-white);
  box-shadow: 0 14px 34px rgba(10, 10, 10, 0.12);
}

.catalog-sort__menu button {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  text-align: left;
  cursor: pointer;
}

.catalog-sort__menu button > span {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  border: 1px solid var(--color-ink-12);
  border-radius: 50%;
}

.catalog-sort__menu button.is-selected > span {
  border-color: #3c45b8;
  background: #3c45b8;
  box-shadow: inset 0 0 0 4px var(--color-white);
}

.catalog-sort__menu button:hover {
  background: #f4f4f4;
}

.catalog-meta__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.catalog-meta__chip {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 0;
  background: #f4f4f4;
  color: var(--color-ink);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.catalog-meta__chip svg {
  width: 13px;
  height: 13px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.catalog-filter-toggle {
  min-height: 44px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  border: 2px solid var(--color-ink-20, rgba(17, 17, 17, 0.2));
  background: var(--color-white);
  color: var(--color-ink);
  font: inherit;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: 0;
  cursor: pointer;
}

.catalog-filter-toggle:hover {
  border-color: var(--color-ink);
}

.catalog-filter-toggle svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (max-width: 560px) {
  .catalog-meta {
    align-items: flex-start;
    gap: 16px;
    padding-inline: var(--sp-4);
  }

  .catalog-meta__controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .catalog-filter-toggle {
    min-height: 42px;
    padding-inline: 12px;
    font-size: 14px;
  }

  .catalog-sort__menu {
    width: min(230px, calc(100vw - 32px));
  }
}
</style>
