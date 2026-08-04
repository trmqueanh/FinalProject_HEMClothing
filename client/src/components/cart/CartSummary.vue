<template>
  <aside class="cart-summary shell-card">

    <!-- ── Header ── -->
    <div class="cart-summary__header">
      <p class="eyebrow">Order summary</p>
      <div class="cart-summary__header-row">
        <h2 class="cart-summary__title">
          Your bag
          <span class="cart-summary__badge">{{ itemCount }}</span>
        </h2>
        <button
          v-if="items && items.length && !readonlyItems"
          class="cart-summary__clear-btn"
          @click="$emit('clear-bag')"
        >
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.5 4h11M6 4V2.5h4V4M10 11.5V7M6 11.5V7M3.5 4l.75 9h7.5l.75-9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Clear bag
        </button>
      </div>
    </div>

    <!-- ── Product list ── -->
    <ul v-if="items && items.length" class="cart-summary__items">
      <li
        v-for="(item, index) in visibleItems"
        :key="item.lineId || item.id || index"
        class="cart-summary__item"
        :class="{ 'cart-summary__item--readonly': readonlyItems }"
      >
        <!-- Thumbnail -->
        <div class="cart-summary__item-thumb">
          <router-link v-if="productLink(item)" :to="productLink(item)" class="cart-summary__item-thumb-link" :aria-label="`View ${item.name}`">
            <product-visual :product="item" compact />
          </router-link>
          <product-visual v-else :product="item" compact />
        </div>

        <!-- Info + controls -->
        <div class="cart-summary__item-body">
          <div v-if="readonlyItems" class="cart-summary__item-meta cart-summary__item-meta--readonly">
            <p class="cart-summary__item-brand">{{ item.brand || 'HEM' }}</p>
            <router-link v-if="productLink(item)" :to="productLink(item)" class="cart-summary__item-name cart-summary__item-name--link">
              {{ item.name }}
            </router-link>
            <p v-else class="cart-summary__item-name">{{ item.name }}</p>
            <div class="cart-summary__item-unit">
              <span
                v-if="priceLabel(item)"
                class="cart-price-label"
                :class="`price-label--${itemPriceTone(item)}`"
              >{{ priceLabel(item) }}</span>
              <span class="cart-price-line">
                <strong class="price-current" :class="`price-current--${itemPriceTone(item)}`">
                  {{ formatCurrency(itemPrice(item)) }}
                </strong>
                <span
                  v-if="hasComparePrice(item)"
                  class="cart-price-compare price-compare price-compare--sale"
                >{{ formatCurrency(itemComparePrice(item)) }}</span>
              </span>
            </div>
            <dl class="cart-summary__details">
              <div v-if="item.productCode">
                <dt>Product code</dt>
                <dd>{{ item.productCode }}</dd>
              </div>
              <div>
                <dt>Color</dt>
                <dd>{{ item.color || item.colorName || 'Default' }}</dd>
              </div>
              <div v-if="shouldDisplaySize(item.size || item.sizeLabel)">
                <dt>Size</dt>
                <dd>{{ item.size || item.sizeLabel }}</dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{{ item.quantity || 1 }}</dd>
              </div>
            </dl>
          </div>

          <div v-else class="cart-summary__item-meta">
            <router-link v-if="productLink(item)" :to="productLink(item)" class="cart-summary__item-name cart-summary__item-name--link">
              {{ item.name }}
            </router-link>
            <p v-else class="cart-summary__item-name">{{ item.name }}</p>
            <p v-if="item.variant" class="cart-summary__item-variant">{{ item.variant }}</p>
          </div>

          <div v-if="!readonlyItems" class="cart-summary__item-footer">
            <!-- Quantity stepper -->
            <div class="cart-summary__stepper">
              <!-- Minus / Trash -->
              <button
                class="cart-summary__stepper-btn"
                :class="{ 'cart-summary__stepper-btn--danger': item.quantity <= 1 }"
                :aria-label="item.quantity <= 1 ? 'Remove item' : 'Decrease quantity'"
                @click="item.quantity <= 1
                  ? $emit('remove-item', item.id)
                  : $emit('update-quantity', item.id, item.quantity - 1)"
              >
                <!-- Trash icon when qty = 1 -->
                <svg v-if="item.quantity <= 1" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.5 4h11M6 4V2.5h4V4M10 11.5V7M6 11.5V7M3.5 4l.75 9h7.5l.75-9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <!-- Minus icon when qty > 1 -->
                <svg v-else viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.5 8h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>

              <span class="cart-summary__stepper-count">{{ item.quantity }}</span>

              <!-- Plus -->
              <button
                class="cart-summary__stepper-btn"
                aria-label="Increase quantity"
                @click="$emit('update-quantity', item.id, item.quantity + 1)"
              >
                <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>

            <!-- Price -->
            <span class="cart-summary__item-price">
              <span
                v-if="priceLabel(item)"
                class="cart-price-label"
                :class="`price-label--${itemPriceTone(item)}`"
              >{{ priceLabel(item) }}</span>
              <span class="cart-price-line cart-price-line--right">
                <strong class="price-current" :class="`price-current--${itemPriceTone(item)}`">
                  {{ formatCurrency(itemPrice(item) * (item.quantity || 1)) }}
                </strong>
                <span
                  v-if="hasComparePrice(item)"
                  class="cart-price-compare price-compare price-compare--sale"
                >{{ formatCurrency(itemComparePrice(item) * (item.quantity || 1)) }}</span>
              </span>
            </span>
          </div>
        </div>
      </li>

      <!-- Show more toggle -->
      <li v-if="items.length > previewLimit" class="cart-summary__show-more">
        <button class="cart-summary__show-more-btn" @click="expanded = !expanded">
          <span v-if="!expanded">
            +{{ items.length - previewLimit }} more item{{ items.length - previewLimit !== 1 ? 's' : '' }}
          </span>
          <span v-else>Show less</span>
          <svg
            class="cart-summary__show-more-icon"
            :class="{ 'is-rotated': expanded }"
            viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </li>
    </ul>

    <!-- ── Price breakdown ── -->
    <div class="cart-summary__lines">
      <div class="cart-summary__row">
        <span class="cart-summary__label">Subtotal</span>
        <strong class="cart-summary__value">{{ formatCurrency(subtotal) }}</strong>
      </div>
      <div v-if="!subtotalOnly" class="cart-summary__row">
        <span class="cart-summary__label">Shipping</span>
        <strong
          class="cart-summary__value"
          :class="{ 'cart-summary__value--free': shipping === 0 }"
        >
          {{ shipping === 0 ? 'Free' : formatCurrency(shipping) }}
        </strong>
      </div>
      <div v-if="!subtotalOnly && (showDiscount || discount > 0)" class="cart-summary__row">
        <span class="cart-summary__label">Discount</span>
        <strong class="cart-summary__value cart-summary__value--discount">
          {{ discount > 0 ? `-${formatCurrency(discount)}` : formatCurrency(0) }}
        </strong>
      </div>
    </div>

    <!-- ── Free shipping progress ── -->
    <div v-if="showShippingProgress" class="cart-summary__shipping-progress">
      <div class="cart-summary__shipping-progress-header">
        <span class="cart-summary__shipping-progress-label">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 3H1v11h12V3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M13 7h3l3 3v4h-6V7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
            <circle cx="5" cy="16" r="1.5" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="16" cy="16" r="1.5" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          Free shipping from {{ formatCurrency(freeShippingThreshold) }}
        </span>
        <span
          class="cart-summary__shipping-progress-amount"
          :class="{ 'is-unlocked': subtotal >= freeShippingThreshold }"
        >
          <template v-if="subtotal < freeShippingThreshold">
            {{ formatCurrency(freeShippingThreshold - subtotal) }} away from free shipping
          </template>
          <template v-else>
            <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 6.5l2.5 2.5 5.5-5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            You are eligible for free shipping
          </template>
        </span>
      </div>
      <div class="cart-summary__progress-track">
        <div
          class="cart-summary__progress-fill"
          :class="{ 'is-complete': subtotal >= freeShippingThreshold }"
          :style="{ width: progressPercent + '%' }"
        />
      </div>
    </div>

    <!-- ── Total ── -->
    <div v-if="!subtotalOnly" class="cart-summary__total">
      <span class="cart-summary__total-label">Total</span>
      <strong class="cart-summary__total-value">{{ formatCurrency(total) }}</strong>
    </div>

    <!-- ── CTA ── -->
    <button
      v-if="showCheckoutButton"
      type="button"
      class="primary-button cart-summary__cta"
      :disabled="checkoutDisabled"
      :aria-describedby="checkoutDisabled && checkoutDisabledMessage ? 'cart-checkout-message' : undefined"
      @click="goToCheckout"
    >
      <span>{{ checkoutLabel }}</span>
      <svg class="cart-summary__cta-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <p
      v-if="checkoutDisabled && checkoutDisabledMessage"
      id="cart-checkout-message"
      class="cart-summary__checkout-message"
      role="status"
    >
      {{ checkoutDisabledMessage }}
    </p>

    <!-- ── Trust badges ── -->
    <div class="cart-summary__trust">
      <div class="cart-summary__trust-item">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1.5L10 6h4.5l-3.5 3 1.5 4.5L8 11l-4.5 3 1.5-4.5L1.5 6H6L8 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
        </svg>
        Secure checkout
      </div>
      <div class="cart-summary__trust-item">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" stroke="currentColor" stroke-width="1.2"/>
          <path d="M5.5 8.5l2 2 3-4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        7-day returns
      </div>
      <div class="cart-summary__trust-item">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
          <path d="M5 5V4a3 3 0 016 0v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        Privacy protected
      </div>
    </div>

  </aside>
</template>

<script>
import { cartSummaryMethods } from './logic/cartSummaryMethods';
import { FREE_SHIPPING_THRESHOLD } from '../../helpers/cart/cartItemHelpers';
import ProductVisual from '../product/ProductVisual.vue';

export default {
  name: 'CartSummary',
  components: {
    ProductVisual
  },
  emits: ['update-quantity', 'remove-item', 'clear-bag'],
  props: {
    itemCount: {
      type: Number,
      default: 0
    },
    subtotal: {
      type: Number,
      default: 0
    },
    shipping: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    showDiscount: {
      type: Boolean,
      default: false
    },
    subtotalOnly: {
      type: Boolean,
      default: false
    },
    showShippingProgress: {
      type: Boolean,
      default: true
    },
    total: {
      type: Number,
      default: 0
    },
    showCheckoutButton: {
      type: Boolean,
      default: true
    },
    checkoutLabel: {
      type: String,
      default: 'Proceed to checkout'
    },
    checkoutTo: {
      type: [String, Object],
      default: '/checkout'
    },
    checkoutDisabled: {
      type: Boolean,
      default: false
    },
    checkoutDisabledMessage: {
      type: String,
      default: ''
    },
    /** Array of { id, name, variant, image, price, quantity } */
    items: {
      type: Array,
      default: () => []
    },
    readonlyItems: {
      type: Boolean,
      default: false
    },
    linkItems: {
      type: Boolean,
      default: true
    },
    freeShippingThreshold: {
      type: Number,
      default: FREE_SHIPPING_THRESHOLD
    },
    previewLimit: {
      type: Number,
      default: 3
    }
  },
  data() {
    return {
      expanded: false
    };
  },
  computed: {
    visibleItems() {
      if (this.expanded) return this.items;
      return this.items.slice(0, this.previewLimit);
    },
    progressPercent() {
      return Math.min((this.subtotal / this.freeShippingThreshold) * 100, 100);
    }
  },
  methods: cartSummaryMethods
};
</script>

<style scoped>
/* ── Container ───────────────────────────────────────── */
.cart-summary {
  display: grid;
  gap: var(--space-4);
  align-content: start;
}

/* ── Header ──────────────────────────────────────────── */
.cart-summary__header {
  display: grid;
  gap: var(--space-1);
}

.cart-summary__header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.cart-summary__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.2;
}

.cart-summary__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background-color: var(--color-border-default);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  letter-spacing: 0;
}

.cart-summary__value--discount {
  color: #16803c;
}

.cart-summary__checkout-message {
  margin: calc(var(--space-2) * -1) 0 0;
  color: var(--color-feedback-error);
  font-size: var(--font-size-xs);
  line-height: 1.45;
  text-align: center;
}

.cart-summary__clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 500;
  transition: color 0.15s ease;
}

.cart-summary__clear-btn:hover {
  color: var(--color-text-primary);
}

.cart-summary__clear-btn svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

/* ── Product list ────────────────────────────────────── */
.cart-summary__items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-4);
}

.cart-summary__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.cart-summary__item--readonly {
  align-items: stretch;
}

/* Thumbnail */
.cart-summary__item-thumb {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
}

.cart-summary__item-thumb-link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.cart-summary__item-thumb :deep(.product-visual) {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 0;
  overflow: hidden;
  background: #f7f7f7;
}

.cart-summary__item-thumb :deep(.product-visual__images) {
  width: 100%;
  height: 100%;
}

.cart-summary__item-thumb :deep(.product-visual__image) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  background: #f7f7f7;
}

.cart-summary__item-thumb :deep(.product-visual--has-images::after) {
  display: none;
}

.cart-summary__item--readonly .cart-summary__item-thumb {
  display: flex;
  width: 88px;
  height: auto;
  align-self: stretch;
}

.cart-summary__item--readonly .cart-summary__item-thumb-link {
  height: 100%;
}

.cart-summary__item--readonly .cart-summary__item-thumb :deep(.product-visual) {
  flex: 1;
  width: 88px;
  height: 100%;
  min-height: 124px;
  aspect-ratio: auto;
}

/* Body */
.cart-summary__item-body {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: var(--space-2);
}

.cart-summary__item-meta {
  display: grid;
  gap: 2px;
}

.cart-summary__item-name {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

.cart-summary__item-name--link {
  display: block;
  text-decoration: none;
  transition: color 160ms ease;
}

.cart-summary__item-name--link:hover {
  color: rgba(17, 17, 17, 0.62);
}

.cart-summary__item-brand {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.cart-summary__item-unit {
  display: grid;
  gap: 3px;
  margin: 2px 0 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 650;
}

.cart-summary__details {
  display: grid;
  gap: 5px;
  margin: 4px 0 0;
}

.cart-summary__details div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.cart-summary__details dt,
.cart-summary__details dd {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.cart-summary__details dd {
  color: var(--color-text-primary);
  font-weight: 650;
  text-align: right;
}

.cart-summary__item-variant {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Footer row: stepper + price */
.cart-summary__item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

/* Stepper */
.cart-summary__stepper {
  display: inline-flex;
  align-items: center;
  gap: 0;
  border: 1px solid var(--color-border-default);
  border-radius: 8px;
  overflow: hidden;
  height: 30px;
}

.cart-summary__stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  flex-shrink: 0;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.cart-summary__stepper-btn:hover {
  background-color: var(--color-border-default);
  color: var(--color-text-primary);
}

/* Danger state: trash icon turns subtle red tint on hover */
.cart-summary__stepper-btn--danger:hover {
  background-color: #fff1f1;
  color: #e53e3e;
}

.cart-summary__stepper-btn svg {
  width: 13px;
  height: 13px;
  pointer-events: none;
}

.cart-summary__stepper-count {
  min-width: 28px;
  text-align: center;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  border-left: 1px solid var(--color-border-default);
  border-right: 1px solid var(--color-border-default);
  line-height: 30px;
  height: 30px;
}

/* Item price */
.cart-summary__item-price {
  display: grid;
  justify-items: end;
  gap: 3px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.cart-price-label {
  color: #9a6a13;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.cart-price-line {
  --cart-current-price-size: var(--font-size-sm);
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
}

.cart-price-line--right {
  justify-content: flex-end;
}

.cart-price-line strong {
  font-size: var(--cart-current-price-size);
  font-weight: 800;
}

.cart-price-compare {
  font-size: calc(var(--cart-current-price-size) - 2px) !important;
  font-weight: 500;
}

/* Show more */
.cart-summary__show-more {
  display: flex;
  justify-content: center;
}

.cart-summary__show-more-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  transition: color 0.15s ease;
}

.cart-summary__show-more-btn:hover {
  color: var(--color-text-primary);
}

.cart-summary__show-more-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}

.cart-summary__show-more-icon.is-rotated {
  transform: rotate(180deg);
}

/* ── Price lines ─────────────────────────────────────── */
.cart-summary__lines {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3) 0;
  border-top: 1px solid var(--color-border-default);
  border-bottom: 1px solid var(--color-border-default);
}

.cart-summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.cart-summary__label {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.cart-summary__value {
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: var(--font-size-sm);
  font-variant-numeric: tabular-nums;
}

.cart-summary__value--free {
  color: var(--color-text-secondary);
  font-weight: 500;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  font-size: var(--font-size-xs);
}

/* ── Free shipping progress ──────────────────────────── */
.cart-summary__shipping-progress {
  display: grid;
  gap: var(--space-2);
}

.cart-summary__shipping-progress-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.cart-summary__shipping-progress-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cart-summary__shipping-progress-label svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.cart-summary__shipping-progress-amount {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  transition: color 0.2s ease;
}

.cart-summary__shipping-progress-amount.is-unlocked {
  color: var(--color-text-primary);
}

.cart-summary__shipping-progress-amount svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.cart-summary__progress-track {
  width: 100%;
  height: 4px;
  background-color: var(--color-border-default);
  border-radius: 999px;
  overflow: hidden;
}

.cart-summary__progress-fill {
  height: 100%;
  background-color: var(--color-text-primary);
  border-radius: 999px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Total ───────────────────────────────────────────── */
.cart-summary__total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.cart-summary__total-label {
  color: var(--color-text-primary);
  font-size: var(--font-size-base);
  font-weight: 600;
  letter-spacing: 0.01em;
}

.cart-summary__total-value {
  color: var(--color-text-primary);
  font-size: var(--font-size-xl);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}

/* ── CTA ─────────────────────────────────────────────── */
.cart-summary__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  border: none;
  font-family: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: gap 0.2s ease;
}

.cart-summary__cta:hover {
  gap: var(--space-3);
}

.cart-summary__cta:disabled,
.cart-summary__cta:disabled:hover {
  gap: var(--space-2);
  cursor: not-allowed;
}

.cart-summary__cta-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.cart-summary__cta:hover .cart-summary__cta-icon {
  transform: translateX(2px);
}

/* ── Trust badges ────────────────────────────────────── */
.cart-summary__trust {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  padding-top: var(--space-1);
  border-top: 1px solid var(--color-border-default);
}

.cart-summary__trust-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  flex: 1;
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-align: center;
  letter-spacing: 0.01em;
  line-height: 1.3;
}

.cart-summary__trust-item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.6;
}
</style>
