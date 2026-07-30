<template>
  <section class="product-info" aria-label="Product information">
    <div class="product-info__headline">
      <h1 class="product-info__title">{{ product.name }}</h1>
      <button
        type="button"
        class="product-info__favorite"
        :aria-pressed="isFavorite ? 'true' : 'false'"
        :aria-label="isFavorite ? 'Remove from favorites' : 'Save to favorites'"
        :class="{ 'product-info__favorite--active': isFavorite }"
        :disabled="isTogglingFavorite"
        @click="$emit('toggle-favorite')"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>

    <!-- Price -->
    <div class="product-price" :class="`product-price--${pricingMode}`" aria-label="Product price">
      <span
        v-if="activePriceLabel"
        class="product-price__label"
        :class="`price-label--${pricingMode}`"
      >{{ activePriceLabel }}</span>
      <div class="product-price__row">
        <strong
          class="product-price__current price-current"
          :class="`price-current--${pricingMode}`"
        >{{ formatCurrency(effectiveDisplayPrice) }}</strong>
        <span
          v-if="hasComparePrice"
          class="product-price__compare price-compare"
          :class="`price-compare--${pricingMode}`"
        >{{ formatCurrency(compareDisplayPrice) }}</span>
        <span v-if="pricingMode === 'sale' && saleDiscountPercent" class="product-price__discount">
          -{{ saleDiscountPercent }}%
        </span>
      </div>
    </div>

    <!-- Badges -->
    <div v-if="productBadges.length" class="product-badges" aria-label="Product badges">
      <span
        v-for="badge in productBadges"
        :key="badge.label"
        class="product-badges__item"
        :class="`product-badges__item--${badge.tone}`"
      >{{ badge.label }}</span>
    </div>
  </section>
</template>

<script>
export default {
  name: 'ProductInfoPanel',
  props: {
    product: {
      type: Object,
      required: true
    },
    pricingMode: {
      type: String,
      default: 'regular'
    },
    isFavorite: {
      type: Boolean,
      default: false
    },
    isTogglingFavorite: {
      type: Boolean,
      default: false
    },
    activePriceLabel: {
      type: String,
      default: ''
    },
    effectiveDisplayPrice: {
      type: Number,
      default: 0
    },
    hasComparePrice: {
      type: Boolean,
      default: false
    },
    compareDisplayPrice: {
      type: Number,
      default: 0
    },
    productBadges: {
      type: Array,
      default: () => []
    },
    formatCurrency: {
      type: Function,
      required: true
    }
  },
  emits: ['toggle-favorite'],
  computed: {
    saleDiscountPercent() {
      if (this.pricingMode === 'sale' && this.compareDisplayPrice > this.effectiveDisplayPrice && this.compareDisplayPrice > 0) {
        return Math.ceil(((this.compareDisplayPrice - this.effectiveDisplayPrice) / this.compareDisplayPrice) * 100);
      }

      const explicitPercent = Number(
        this.product.saleDiscountPercent ??
        this.product.sale_discount_percent ??
        this.product.discountPercent ??
        this.product.discount_percent ??
        0
      );

      if (Number.isFinite(explicitPercent) && explicitPercent > 0) {
        return Math.ceil(explicitPercent);
      }

      return 0;
    }
  }
};
</script>

<style scoped>
.product-info {
  padding: 8px 0 24px;
  border-bottom: 1px solid var(--color-border-subtle);
  display: flex;
  flex-direction: column;
}

.product-info__headline {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: start;
}

.product-info__title {
  margin: 0 0 12px;
  color: var(--color-text-primary);
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 500;
  letter-spacing: -0.01em;
  line-height: 1.15;
}

.product-info__favorite {
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: -4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  transition: color var(--duration-fast) ease, transform var(--duration-fast) ease;
}

:global(html body.hem-shop-shell #app .product-info__favorite),
:global(html body.hem-shop-shell #app .product-info__favorite:hover),
:global(html body.hem-shop-shell #app .product-info__favorite--active),
:global(html body.hem-shop-shell #app .product-info__favorite--active:hover) {
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.product-info__favorite svg path {
  fill: transparent;
  transition: fill var(--duration-fast) ease, stroke var(--duration-fast) ease;
}

.product-info__favorite:hover {
  background: transparent;
  color: #d92d20;
  transform: translateY(-1px);
}

.product-info__favorite:hover svg path {
  fill: rgba(217, 45, 32, 0.18);
}

.product-info__favorite--active {
  color: #d92d20;
}

.product-info__favorite--active svg path,
.product-info__favorite--active:hover svg path {
  fill: currentColor;
}

.product-price {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
}

.product-price__label {
  width: fit-content;
  color: #8a6819;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.product-price__row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: nowrap;
}

.product-price__current {
  color: #111111;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.product-price__compare {
  color: #111111;
  font-size: 16px;
}

.product-price__discount {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  background: #ffc83d;
  color: #111111;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.product-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.product-badges__item {
  height: 24px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border: 1px solid var(--color-border-default);
  color: var(--color-text-secondary);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: var(--color-bg-surface-alt);
}

.product-badges__item--sale {
  background: #fdf2f2;
  color: #c53030;
  border-color: rgba(197, 48, 48, 0.15);
}

.product-badges__item--best {
  background: #111111;
  color: #ffffff;
  border-color: #111111;
}

.product-badges__item--new {
  background: #f0fdf4;
  color: #15803d;
  border-color: rgba(21, 128, 61, 0.15);
}

.product-badges__item--out {
  background: #fff1f1;
  color: #b91c1c;
  border-color: rgba(185, 28, 28, 0.32);
}

.product-badges__item--low {
  background: #fffbeb;
  color: #b45309;
  border-color: rgba(180, 83, 9, 0.15);
}
</style>
