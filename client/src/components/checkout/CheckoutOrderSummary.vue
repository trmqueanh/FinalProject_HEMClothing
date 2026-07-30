<template>
  <div class="checkout-sidebar">
    <CartSummary
      :item-count="itemCount"
      :subtotal="subtotal"
      :shipping="shipping"
      :discount="discount"
      :show-discount="true"
      :total="total"
      :show-checkout-button="false"
      :show-shipping-progress="false"
      :items="items"
      :readonly-items="true"
      :link-items="false"
      :preview-limit="items.length"
    />
    <button
      type="button"
      class="primary-button checkout-form__submit"
      :disabled="isSubmitting"
      :aria-busy="isSubmitting ? 'true' : 'false'"
      @click="$emit('submit-checkout')"
    >
      <svg v-if="!isSubmitting" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 8h12M10 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span v-else class="checkout-submit-spinner" aria-hidden="true"></span>
      <span>{{ isSubmitting ? 'Placing your order...' : 'Confirm & place order' }}</span>
    </button>
    <p class="checkout-sidebar__note">
      <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="4" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/>
        <path d="M4.5 4V3a2.5 2.5 0 015 0v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
      Secure checkout with manual payment verification
    </p>
  </div>
</template>

<script>
import CartSummary from '../cart/CartSummary.vue';

export default {
  name: 'CheckoutOrderSummary',
  components: {
    CartSummary
  },
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
    total: {
      type: Number,
      default: 0
    },
    items: {
      type: Array,
      default: () => []
    },
    isSubmitting: {
      type: Boolean,
      default: false
    }
  },
  emits: ['submit-checkout']
};
</script>

<style scoped>
.checkout-sidebar {
  display: grid;
  gap: 12px;
}

.checkout-form__submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 50px;
  border-radius: 999px;
  border: none;
  background: #111111;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: opacity 0.15s ease;
  text-decoration: none;
}

.checkout-form__submit:hover:not(:disabled) {
  opacity: 0.85;
}

.checkout-form__submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.checkout-form__submit svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.checkout-submit-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 999px;
  animation: checkout-submit-spin 0.65s linear infinite;
  flex-shrink: 0;
}

@keyframes checkout-submit-spin {
  to {
    transform: rotate(360deg);
  }
}

.checkout-sidebar__note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
  font-size: 11px;
  color: var(--color-text-secondary);
}

.checkout-sidebar__note svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  opacity: 0.6;
}
</style>
