<template>
  <!-- CheckoutCouponSection: nhập, áp dụng, hiển thị voucher khả dụng trong checkout. -->
  <div class="shell-card checkout-form__section checkout-coupon">
    <button
      type="button"
      class="checkout-coupon__toggle"
      :aria-expanded="isExpanded ? 'true' : 'false'"
      aria-controls="checkout-coupon-panel"
      @click="isExpanded = !isExpanded"
    >
      <span class="checkout-coupon__toggle-copy">
        <strong>{{ appliedVoucher ? 'Coupon applied' : 'Have a coupon?' }}</strong>
        <span>
          {{ appliedVoucher
            ? `${appliedVoucher.voucherCode} · You saved ${formatCurrency(appliedVoucher.discountAmount)}`
            : bestEligibleCoupon
              ? `Best coupon saves ${formatCurrency(bestEligibleCoupon.discountAmount)}`
              : 'View available coupons' }}
        </span>
      </span>
      <svg :class="{ 'is-expanded': isExpanded }" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <transition name="coupon-panel">
      <div v-if="isExpanded" id="checkout-coupon-panel" class="checkout-coupon__panel">

    <div v-if="appliedVoucher" class="checkout-coupon__applied">
      <div>
        <strong>Coupon applied</strong>
        <span>{{ appliedVoucher.voucherCode }} · You saved {{ formatCurrency(appliedVoucher.discountAmount) }}</span>
      </div>
      <button type="button" class="checkout-coupon__remove" @click="$emit('remove')">Remove coupon</button>
    </div>

    <div v-else class="checkout-coupon__entry">
      <div class="checkout-coupon__input-wrap">
        <svg class="checkout-coupon__input-icon" width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 8.167V4a.667.667 0 0 1 .667-.667H6.25a.667.667 0 0 1 .471.195l6 6a.667.667 0 0 1 0 .943l-3.5 3.5a.667.667 0 0 1-.943 0l-6-6A.667.667 0 0 1 2 8.167Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="4.667" cy="5.333" r=".667" fill="currentColor"/>
        </svg>
        <input
          :value="voucherCode"
          type="text"
          autocomplete="off"
          placeholder="Enter coupon code"
          @input="$emit('update-voucher-code', $event.target.value.trim())"
          @keyup.enter.prevent="$emit('apply')"
        />
      </div>
      <button type="button" :disabled="isVoucherApplying || !voucherCode" @click="$emit('apply')">
        {{ isVoucherApplying ? 'Applying...' : 'Apply coupon' }}
      </button>
    </div>

    <p v-if="voucherError" class="checkout-coupon__error">{{ voucherError }}</p>
    <p
      v-else-if="hasCheckedEligibleVouchers && !hasEligibleCoupon && !appliedVoucher"
      class="checkout-coupon__empty"
    >No eligible coupon</p>

    <div v-if="availableCoupons.length" class="checkout-coupon__available">
      <span class="checkout-coupon__available-label">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1.75 7.583V3.5a.583.583 0 0 1 .583-.583H5.75a.583.583 0 0 1 .412.17l5.25 5.25a.583.583 0 0 1 0 .825l-3.083 3.083a.583.583 0 0 1-.826 0l-5.25-5.25a.583.583 0 0 1-.503-.412Z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="4.083" cy="4.667" r=".583" fill="currentColor"/>
        </svg>
        Coupons
      </span>
      <article
        v-for="coupon in availableCoupons"
        :key="coupon.id"
        class="checkout-coupon__card"
        :class="{
          'is-applied': appliedVoucher && appliedVoucher.voucherCode === coupon.code,
          'is-best': isBestCoupon(coupon),
          'is-unavailable': !coupon.isEligible
        }"
      >
        <div class="checkout-coupon__card-badge">
          {{ coupon.discountType === 'percent' ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue) }}
        </div>
        <div class="checkout-coupon__card-body">
          <div class="checkout-coupon__card-heading">
            <strong class="checkout-coupon__card-code">{{ coupon.code }}</strong>
            <span v-if="isBestCoupon(coupon)" class="checkout-coupon__best-label">Best saving</span>
          </div>
          <div class="checkout-coupon__card-state">
            <span>{{ couponValidity(coupon) }}</span>
            <div class="checkout-coupon__card-status">
              <p v-if="coupon.isEligible" class="checkout-coupon__card-desc">
                Save {{ formatCurrency(coupon.discountAmount) }} on this order
              </p>
              <p v-else class="checkout-coupon__card-unavailable">
                {{ couponUnavailableMessage(coupon) }}
              </p>
            </div>
          </div>
          <ul class="checkout-coupon__card-meta">
            <li>
              <span class="checkout-coupon__meta-label">Min. order</span>
              <span class="checkout-coupon__meta-value">{{ formatCurrency(coupon.minOrderAmount) }}</span>
            </li>
            <li>
              <span class="checkout-coupon__meta-label">Max. discount</span>
              <span class="checkout-coupon__meta-value">{{ couponMaximumDiscount(coupon) }}</span>
            </li>
          </ul>
        </div>
        <button
          type="button"
          class="checkout-coupon__card-use"
          :disabled="isVoucherApplying || !coupon.isEligible || Boolean(appliedVoucher && appliedVoucher.voucherCode === coupon.code)"
          :aria-disabled="!coupon.isEligible ? 'true' : 'false'"
          @click="$emit('use-voucher', coupon)"
        >
          {{ appliedVoucher && appliedVoucher.voucherCode === coupon.code
            ? 'Applied'
            : coupon.isEligible
              ? 'Apply coupon'
              : 'Unavailable' }}
        </button>
      </article>
    </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { formatVietnamDate } from '../../helpers/dateTime';

export default {
  name: 'CheckoutCouponSection',
  emits: ['apply', 'remove', 'update-voucher-code', 'use-voucher'],
  props: {
    appliedVoucher: {
      type: Object,
      default: null
    },
    availableCoupons: {
      type: Array,
      required: true
    },
    couponMaximumDiscount: {
      type: Function,
      required: true
    },
    formatCurrency: {
      type: Function,
      required: true
    },
    hasCheckedEligibleVouchers: {
      type: Boolean,
      default: false
    },
    isVoucherApplying: {
      type: Boolean,
      required: true
    },
    voucherCode: {
      type: String,
      required: true
    },
    voucherError: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      isExpanded: false
    };
  },
  computed: {
    hasEligibleCoupon() {
      return this.availableCoupons.some(coupon => coupon.isEligible);
    },
    bestEligibleCoupon() {
      return this.availableCoupons
        .filter(coupon => coupon.isEligible)
        .reduce((best, coupon) => {
          if (!best) return coupon;
          return Number(coupon.discountAmount || 0) > Number(best.discountAmount || 0) ? coupon : best;
        }, null);
    }
  },
  watch: {
    appliedVoucher(value) {
      if (value) this.isExpanded = false;
    }
  },
  methods: {
    isBestCoupon(coupon) {
      return Boolean(this.bestEligibleCoupon && coupon && this.bestEligibleCoupon.id === coupon.id);
    },
    couponValidity(coupon) {
      if (!coupon.endDate) return 'No expiration';
      return `Valid until ${formatVietnamDate(coupon.endDate, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;
    },
    couponUnavailableMessage(coupon) {
      if (Number(coupon.missingAmount) > 0) {
        return `Add ${this.formatCurrency(coupon.missingAmount)} more to unlock`;
      }

      if (coupon.unavailableReason === 'user_limit') {
        return 'Usage limit reached';
      }

      if (coupon.unavailableReason === 'no_discount') {
        return 'No discount available for this order';
      }

      return 'Coupon unavailable';
    }
  }
};
</script>

<style scoped>
/* CheckoutCouponSection styles: toàn bộ UI nhập/applied/available voucher nằm cùng component. */
.checkout-form__section {
  display: grid;
  gap: 12px;
}

.checkout-form__section > .eyebrow {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.checkout-coupon__entry {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.checkout-coupon__input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.checkout-coupon__input-icon {
  position: absolute;
  left: 14px;
  color: var(--color-text-secondary);
  pointer-events: none;
  flex-shrink: 0;
}

.checkout-coupon__input-wrap input {
  width: 100%;
  min-height: 46px;
  padding: 0 14px 0 38px !important;
  border: 1px solid rgba(17,17,17,0.18);
  border-radius: 8px;
  background: rgba(255,255,255,0.9);
  color: #111111;
  font-family: monospace, monospace;
  font-size: 14px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  outline: none;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
}

.checkout-coupon__input-wrap input::placeholder {
  font-family: inherit;
  letter-spacing: 0;
  text-transform: none;
}

.checkout-coupon__input-wrap input:focus {
  border-color: #111111;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(17,17,17,0.08);
}

.checkout-coupon button {
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid #111111;
  border-radius: 8px;
  background: #111111;
  color: #ffffff;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.checkout-coupon button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkout-coupon__applied {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(22, 128, 60, 0.3);
  border-radius: 8px;
  background: rgba(22, 128, 60, 0.05);
}

.checkout-coupon__applied > div,
.checkout-coupon__available {
  display: grid;
  gap: 5px;
}

.checkout-coupon__applied span,
.checkout-coupon__available > span {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.checkout-coupon__applied button,
.checkout-coupon__available button {
  min-height: 34px;
  background: transparent;
  color: #ffffff;
  background: #000000;
}

.checkout-coupon__applied .checkout-coupon__remove:hover {
  border-color: #b42318;
  background: #b42318;
  color: #ffffff;
}

.checkout-coupon__available {
  display: grid;
  gap: 16px;
  margin-top: 8px;
}

.checkout-coupon__available-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.checkout-coupon__card {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) 160px;
  align-items: stretch;
  gap: 0;
  min-height: 154px;
  border: 1.5px dashed rgba(17, 17, 17, 0.18);
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;
  transition: border-color 150ms ease, background 150ms ease;
}

.checkout-coupon__card:hover {
  border-color: rgba(17, 17, 17, 0.38);
  background: #ffffff;
}

.checkout-coupon__card.is-unavailable {
  opacity: 0.68;
  filter: grayscale(0.7);
}

.checkout-coupon__card.is-applied {
  border-color: #111111;
  box-shadow: 0 0 0 1px #111111;
}

.checkout-coupon__card.is-best {
  border-color: rgba(22, 128, 60, 0.65);
  box-shadow: 0 0 0 1px rgba(22, 128, 60, 0.12);
}

.checkout-coupon__card-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: auto;
  align-self: stretch;
  background: #111111;
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-align: center;
  padding: 0 12px;
  position: relative;
}

.checkout-coupon__card-badge::after {
  content: '';
  position: absolute;
  right: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  border: 1.5px dashed rgba(17, 17, 17, 0.18);
  z-index: 1;
}

.checkout-coupon__card:hover .checkout-coupon__card-badge::after {
  background: #ffffff;
}

.checkout-coupon__card-body {
  display: grid;
  align-content: center;
  gap: 8px;
  padding: 16px 24px 16px 28px;
  min-width: 0;
}

.checkout-coupon__card-code {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #111111;
}

.checkout-coupon__card-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 10px;
  min-width: 0;
}

.checkout-coupon__best-label {
  justify-self: start;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(22, 128, 60, 0.1);
  color: #16803c;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.checkout-coupon__card-desc {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #16803c;
  white-space: nowrap;
}

.checkout-coupon__card-unavailable {
  margin: 0;
  color: #8a4b10;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.checkout-coupon__card-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 18px;
  list-style: none;
  margin: 2px 0 0;
  padding: 0;
}

.checkout-coupon__card-meta li {
  display: grid;
  gap: 2px;
}

.checkout-coupon__meta-label {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

.checkout-coupon__meta-value {
  color: #111111;
  font-size: 11px;
  font-weight: 700;
}

.checkout-coupon__card-use {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  box-sizing: border-box;
  min-width: 0;
  min-height: unset !important;
  height: auto;
  width: auto;
  padding: 0 4px !important;
  border: none !important;
  border-left: 1.5px dashed rgba(17, 17, 17, 0.18) !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: #111111 !important;
  font-size: 10px !important;
  font-weight: 700 !important;
  letter-spacing: 0.01em;
  text-transform: none;
  text-align: center;
  white-space: nowrap;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}

.checkout-coupon__card-use:hover:not(:disabled) {
  background: #111111 !important;
  color: #ffffff !important;
}

.checkout-coupon__card-use:disabled {
  cursor: not-allowed;
}

.checkout-coupon__error {
  margin: 0;
  color: #b42318;
  font-size: 12px;
  font-weight: 600;
}

.checkout-coupon__empty {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.checkout-coupon {
  gap: 0;
}

.checkout-coupon .checkout-coupon__toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 58px;
  padding: 8px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-primary);
  text-align: left;
}

.checkout-coupon .checkout-coupon__toggle:hover {
  background: transparent;
  color: var(--color-text-primary);
}

.checkout-coupon__toggle-copy {
  display: grid;
  gap: 3px;
}

.checkout-coupon__toggle-copy strong {
  font-size: 13px;
  font-weight: 700;
}

.checkout-coupon__toggle-copy span {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 500;
}

.checkout-coupon__toggle > svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  transition: transform 180ms ease;
}

.checkout-coupon__toggle > svg.is-expanded {
  transform: rotate(180deg);
}

.checkout-coupon__panel {
  display: grid;
  gap: 16px;
  padding: 14px 0 6px;
}

.checkout-coupon__available {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 6px;
}

.checkout-coupon__card-state {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: 18px;
  min-height: 18px;
}

.checkout-coupon__card-status {
  display: grid;
  justify-items: start;
  gap: 4px;
  text-align: left;
}

.checkout-coupon__card-state span {
  color: var(--color-text-secondary);
  font-size: 10px;
}

.checkout-coupon__card-status strong {
  color: #8a4b10;
  font-size: 10px;
  font-weight: 700;
  text-transform: none;
}

.checkout-coupon__card-status strong.is-eligible {
  color: #16803c;
}

.coupon-panel-enter-active,
.coupon-panel-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.coupon-panel-enter-from,
.coupon-panel-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 640px) {
  .checkout-coupon__card {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
  }

  .checkout-coupon__card-badge {
    grid-row: 1 / 3;
    width: 76px;
  }

  .checkout-coupon__card-body {
    padding: 16px 14px 14px 24px;
  }

  .checkout-coupon__card-meta {
    grid-template-columns: 1fr;
  }

  .checkout-coupon__card-state {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .checkout-coupon__card-status {
    justify-items: start;
    text-align: left;
  }

  .checkout-coupon__card-desc {
    white-space: normal;
  }

  .checkout-coupon__card-unavailable {
    white-space: normal;
  }

  .checkout-coupon__card-use {
    grid-column: 2;
    width: 100%;
    min-height: 44px !important;
    border-top: 1.5px dashed rgba(17, 17, 17, 0.18) !important;
    border-left: 0 !important;
  }
}

@media (min-width: 1440px) {
  .checkout-coupon__best-label {
    padding: 4px 9px;
    font-size: 0.8125rem;
  }
}

@media (min-width: 1920px) {
  .checkout-coupon__best-label {
    padding: 5px 10px;
    font-size: 0.875rem;
  }
}
</style>
