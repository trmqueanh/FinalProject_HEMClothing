<template>
  <section class="variant-selection" aria-label="Variant selection">

    <!-- Color -->
    <div class="selector-row">
      <p class="selector-label">Color <span class="selector-selected">{{ selectedColor }}</span></p>
    </div>
    <div class="color-options">
      <button
        v-for="color in productColorOptions"
        :key="color.colorVariantId || color.name"
        type="button"
        :title="color.colorName || color.name"
        :aria-label="`Choose color ${color.colorName || color.name}`"
        :aria-pressed="isSelectedColor(color) ? 'true' : 'false'"
        class="color-options__button"
        :class="{
          'color-options__button--active': isSelectedColor(color),
          'color-options__button--image': color.thumbnailImage
        }"
        @click="$emit('select-color', color)"
      >
        <img
          v-if="color.thumbnailImage"
          class="color-options__thumbnail"
          :src="color.thumbnailImage"
          :alt="color.colorName || color.name"
        />
        <span
          v-else
          class="color-options__swatch"
          :style="{ background: color.colorHex || color.hex }"
        ></span>
      </button>
    </div>

    <!-- Size -->
    <div v-if="showSizeSelector" class="selector-row selector-row--size">
      <p class="selector-label">Size</p>
      <button v-if="showSizeGuide" type="button" class="size-guide-trigger" @click="$emit('open-size-guide')">Size guide</button>
    </div>
    <div v-if="showSizeSelector" class="size-grid">
      <button
        v-for="size in availableSizesForSelectedColor"
        :key="size"
        type="button"
        :aria-pressed="selectedSize === size ? 'true' : 'false'"
        :class="{
          'size-grid__active': selectedSize === size,
          'size-grid__disabled': !isSizeAvailable(size)
        }"
        :disabled="!isSizeAvailable(size)"
        @click="$emit('select-size', size)"
      >
        {{ size }}
      </button>
    </div>

    <!-- Stock state -->
    <div v-if="stockLabel" class="stock-state" :class="stockStateClass">
      <strong class="stock-state__label">{{ stockLabel }}</strong>
      <span v-if="stockHelperText" class="stock-state__hint">{{ stockHelperText }}</span>
    </div>

    <!-- Quantity -->
    <div class="quantity-row">
      <p class="selector-label"></p>
      <div class="quantity-stepper">
        <button type="button" class="quantity-stepper__button" :disabled="isQuantityDisabled || quantity <= 1" @click="$emit('change-quantity', -1)">−</button>
        <span class="quantity-stepper__value">{{ quantity }}</span>
        <button type="button" class="quantity-stepper__button" :disabled="isQuantityDisabled || quantity >= maxQuantity" @click="$emit('change-quantity', 1)">+</button>
      </div>
      <small v-if="quantityLimitText" class="quantity-stepper__hint">{{ quantityLimitText }}</small>
    </div>

    <!-- Actions Group (Side-by-side Add to Bag and Wishlist) -->
    <div class="product-detail__cta-group">
      <button type="button" class="product-detail__add-btn" :disabled="!canAddToCart || isAdding" @click="$emit('add-to-cart')">
        <span v-if="isAdding" class="spinner"></span>
        <span>{{ addToCartLabel }}</span>
      </button>
    </div>

    <button
      type="button"
      class="review-summary"
      :aria-label="`View ${displayReviewCount} reviews. Average rating ${formattedAverageRating} out of 5`"
      @click="$emit('scroll-to-reviews')"
    >
      <span class="review-summary__link">Reviews [{{ displayReviewCount }}]</span>
      <span class="review-summary__rating">
        <span class="review-summary__stars" aria-hidden="true">
          <span v-for="star in 5" :key="star" class="review-summary__star">
            <span class="review-summary__star-empty">&#9734;</span>
            <span class="review-summary__star-fill" :style="{ width: starFillWidth(star) }">&#9733;</span>
          </span>
        </span>
        <span class="review-summary__score">{{ formattedAverageRating }}</span>
      </span>
    </button>
  </section>
</template>

<script>
export default {
  name: 'VariantSelector',
  props: {
    selectedColor: {
      type: String,
      default: ''
    },
    selectedColorVariantId: {
      type: String,
      default: ''
    },
    productColorOptions: {
      type: Array,
      default: () => []
    },
    selectedSize: {
      type: String,
      default: ''
    },
    availableSizesForSelectedColor: {
      type: Array,
      default: () => []
    },
    showSizeGuide: {
      type: Boolean,
      default: true
    },
    showSizeSelector: {
      type: Boolean,
      default: true
    },
    isSizeAvailable: {
      type: Function,
      required: true
    },
    stockLabel: {
      type: String,
      default: ''
    },
    stockStateClass: {
      type: [String, Array, Object],
      default: ''
    },
    stockHelperText: {
      type: String,
      default: ''
    },
    quantity: {
      type: Number,
      default: 1
    },
    isQuantityDisabled: {
      type: Boolean,
      default: false
    },
    maxQuantity: {
      type: Number,
      default: 1
    },
    quantityLimitText: {
      type: String,
      default: ''
    },
    canAddToCart: {
      type: Boolean,
      default: false
    },
    isAdding: {
      type: Boolean,
      default: false
    },
    addToCartLabel: {
      type: String,
      default: 'Add to cart'
    },
    displayAverageRating: {
      type: Number,
      default: 0
    },
    displayReviewCount: {
      type: Number,
      default: 0
    }
  },
  emits: ['select-color', 'open-size-guide', 'select-size', 'change-quantity', 'add-to-cart', 'scroll-to-reviews'],
  computed: {
    formattedAverageRating() {
      return Number(this.displayAverageRating || 0).toFixed(1);
    }
  },
  methods: {
    isSelectedColor(color) {
      const selectedId = String(this.selectedColorVariantId || '').trim();
      const optionId = String(color && (color.colorVariantId || color.color_variant_id) || '').trim();

      if (selectedId && optionId) {
        return selectedId === optionId;
      }

      return String(this.selectedColor || '').trim().toLowerCase() ===
        String(color && (color.colorName || color.name) || '').trim().toLowerCase();
    },
    starFillWidth(star) {
      const fill = Math.min(1, Math.max(0, Number(this.displayAverageRating || 0) - (star - 1)));
      return `${fill * 100}%`;
    }
  }
};
</script>

<style scoped>
.variant-selection {
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.selector-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.selector-label {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.selector-selected {
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--color-text-secondary);
  margin-left: 6px;
}

.selector-row--size {
  margin-bottom: 0px;
}

.size-guide-trigger {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  transition: color var(--duration-fast) ease;
}

.size-guide-trigger:hover {
  color: var(--color-text-primary);
}

.color-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(58px, 1fr));
  gap: 10px;
}

.color-options__button {
  width: 100%;
  aspect-ratio: 3 / 4;
  background: #ffffff;
  border: 1px solid rgba(17, 17, 17, 0.14);
  padding: 0;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all var(--duration-fast) cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 0 0 1px transparent;
}

.color-options__button--image {
  aspect-ratio: auto;
  overflow: visible;
}

.color-options__swatch {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 0;
  border: 0;
  box-sizing: border-box;
  transition: all var(--duration-fast) cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.color-options__thumbnail {
  display: block;
  width: 100%;
  height: auto;
  transition: opacity var(--duration-normal) ease;
}

.color-options__button:hover:not(:disabled) {
  border-color: rgba(17, 17, 17, 0.45);
  box-shadow: 0 8px 20px rgba(17, 17, 17, 0.10);
  transform: translateY(-1px);
}

.color-options__button:hover:not(:disabled) .color-options__thumbnail {
  opacity: 0.92;
}

.color-options__button--active {
  border-color: var(--color-border-strong);
  box-shadow: 0 0 0 1px var(--color-border-strong);
}

.color-options__button--active .color-options__swatch,
.color-options__button--active .color-options__thumbnail {
  opacity: 0.94;
}

.color-options__button--disabled {
  opacity: 0.36;
  cursor: not-allowed;
}

.color-options__button--disabled .color-options__swatch {
  position: relative;
}

.color-options__button--disabled .color-options__swatch::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: var(--color-border-strong);
  transform: rotate(-45deg);
}

.size-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 8px;
}

.size-grid button {
  height: 48px;
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-surface-alt);
  color: var(--color-text-primary);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  position: relative;
  overflow: hidden;
  transition: all var(--duration-fast) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.size-grid button:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  background: var(--color-state-hover);
}

.size-grid__active {
  background: var(--color-text-primary) !important;
  color: var(--color-text-inverse) !important;
  border-color: var(--color-text-primary) !important;
  font-weight: 600 !important;
}

.size-grid__disabled {
  opacity: 0.35;
  cursor: not-allowed;
  background: rgba(20, 20, 20, 0.02) !important;
  color: var(--color-text-secondary) !important;
  border-color: var(--color-border-subtle) !important;
}

.size-grid__disabled::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to top right, transparent calc(50% - 0.5px), rgba(20, 20, 20, 0.25) 50%, transparent calc(50% + 0.5px));
  pointer-events: none;
}

.stock-state {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 2px;
  font-size: 12px;
}

.stock-state--in {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid rgba(21, 128, 61, 0.1);
}

.stock-state--low {
  background: #fffbeb;
  color: #b45309;
  border: 1px solid rgba(180, 83, 9, 0.12);
}

.stock-state--out {
  background: #fff1f1;
  color: #b91c1c;
  border: 1px solid rgba(185, 28, 28, 0.32);
}

.stock-state__label {
  font-weight: 800;
}

.stock-state__hint {
  opacity: 0.85;
}

.quantity-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.quantity-stepper {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-surface-alt);
  border-radius: 4px;
  overflow: hidden;
}

.quantity-stepper__button {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--duration-fast) ease;
}

.quantity-stepper__button:hover:not(:disabled) {
  background: var(--color-state-hover);
}

.quantity-stepper__button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.quantity-stepper__value {
  width: 32px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.quantity-stepper__hint {
  color: var(--color-text-secondary);
  font-size: 11px;
}

.product-detail__cta-group {
  display: block;
  margin-top: 8px;
}

.product-detail__add-btn {
  width: 100%;
  height: 52px;
  border: none;
  background: var(--color-text-primary);
  color: var(--color-text-inverse);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all var(--duration-base) cubic-bezier(0.2, 0.8, 0.2, 1);
}

.product-detail__add-btn:hover:not(:disabled) {
  background: #333;
}

.product-detail__add-btn:disabled {
  background: var(--color-state-disabled);
  color: rgba(255, 255, 255, 0.6);
  cursor: not-allowed;
}

.review-summary {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 0 0;
  border: 0;
  border-top: 1px solid var(--color-border-subtle);
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  cursor: pointer;
}

.review-summary__link {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-transform: uppercase;
}

.review-summary__rating,
.review-summary__stars {
  display: inline-flex;
  align-items: center;
}

.review-summary__rating {
  gap: 10px;
}

.review-summary__stars {
  gap: 2px;
}

.review-summary__star {
  position: relative;
  width: 17px;
  height: 17px;
  display: inline-block;
  font-size: 17px;
  line-height: 17px;
}

.review-summary__star-empty {
  color: var(--color-rating-star-muted);
}

.review-summary__star-fill {
  position: absolute;
  inset: 0 auto 0 0;
  overflow: hidden;
  color: var(--color-rating-star);
  white-space: nowrap;
}

.review-summary__score {
  min-width: 24px;
  font-size: 16px;
  font-weight: 500;
  text-align: right;
}

.review-summary:hover .review-summary__link {
  color: var(--color-text-secondary);
}

@media (max-width: 420px) {
  .review-summary {
    align-items: flex-start;
  }

  .review-summary__rating {
    gap: 6px;
  }

  .review-summary__star {
    width: 14px;
    height: 14px;
    font-size: 14px;
    line-height: 14px;
  }

  .review-summary__score {
    font-size: 14px;
  }
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--color-text-inverse);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
