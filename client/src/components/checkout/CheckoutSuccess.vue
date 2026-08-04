<template>
  <section class="checkout-success">
    <!-- Hero -->
    <div class="checkout-success__hero">
      <div class="checkout-success__check-wrap">
        <svg class="checkout-success__check-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="24" cy="24" r="23" stroke="currentColor" stroke-width="1.5" opacity="0.16"/>
          <circle cx="24" cy="24" r="23" stroke="currentColor" stroke-width="1.5" stroke-dasharray="144.51" stroke-dashoffset="0" class="checkout-success__check-ring"/>
          <path d="M14 24.5l7 7 13-14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="checkout-success__check-tick"/>
        </svg>
      </div>
      <div class="checkout-success__hero-copy">
        <p class="checkout-success__label">{{ heroLabel }}</p>
        <h2 class="checkout-success__title">{{ heroTitle }}</h2>
        <p class="checkout-success__sub">{{ heroMessage }}</p>
      </div>
    </div>

    <!-- Order meta strip -->
    <div class="checkout-success__strip">
      <div class="checkout-success__strip-item">
        <span class="checkout-success__strip-label">Order ID</span>
        <strong class="checkout-success__strip-value checkout-success__strip-id">{{ orderResult.id }}</strong>
      </div>
      <div class="checkout-success__strip-divider"></div>
      <div class="checkout-success__strip-item">
        <span class="checkout-success__strip-label">Payment</span>
        <strong class="checkout-success__strip-value">
          {{ paymentMethodLabel }}
        </strong>
      </div>
      <div class="checkout-success__strip-divider"></div>
      <div class="checkout-success__strip-item">
        <span class="checkout-success__strip-label">Status</span>
        <span class="checkout-success__badge">{{ orderResult.orderStatus }}</span>
      </div>
    </div>

    <div class="checkout-success__body">
      <div v-if="isBankTransfer" class="checkout-success__card checkout-success__bank">
        <p class="checkout-success__card-heading">
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="4" height="4" stroke="currentColor" stroke-width="1.2"/>
            <rect x="10" y="2" width="4" height="4" stroke="currentColor" stroke-width="1.2"/>
            <rect x="2" y="10" width="4" height="4" stroke="currentColor" stroke-width="1.2"/>
            <path d="M10 10h2v2h-2v-2Zm3 0h1v4h-4v-1h3v-3Z" fill="currentColor"/>
          </svg>
          Bank Transfer (QR Code)
        </p>
        <template v-if="showPaymentForm">
          <div class="checkout-success__countdown" aria-live="polite">
            <span>Time remaining to complete payment:</span>
            <strong>{{ formattedRemainingTime }}</strong>
          </div>
          <div class="checkout-success__bank-grid">
            <div class="checkout-success__qr">
              <img
                v-if="bankTransfer.qrImageUrl"
                :src="bankTransfer.qrImageUrl"
                alt="VietQR bank transfer code"
                @load="activatePaymentWindow"
              />
              <span v-else>Generating VietQR...</span>
            </div>
            <dl class="checkout-success__bank-info">
              <div>
                <dt>Bank name</dt>
                <dd>{{ bankTransfer.bankName }}</dd>
              </div>
              <div>
                <dt>Account number</dt>
                <dd>{{ bankTransfer.accountNumber }}</dd>
              </div>
              <div>
                <dt>Account holder</dt>
                <dd>{{ bankTransfer.accountHolder }}</dd>
              </div>
              <div>
                <dt>Total amount</dt>
                <dd>{{ formatCurrency(bankTransfer.amount || orderResult.totalAmount) }}</dd>
              </div>
              <div>
                <dt>Transfer description</dt>
                <dd>{{ bankTransfer.description }}</dd>
              </div>
            </dl>
          </div>
          <div class="checkout-success__payment-actions">
            <button
              type="button"
              class="checkout-success__paid-button"
              :disabled="!canNotifyPaid || isCancellingPayment"
              @click="$emit('mark-bank-transfer-paid')"
            >
              I have Paid
            </button>
            <button
              type="button"
              class="checkout-success__cancel-payment-button"
              :disabled="isMarkingPaymentPaid || isCancellingPayment"
              @click="$emit('cancel-bank-transfer')"
            >
              {{ isCancellingPayment ? 'Cancelling...' : 'Cancel Payment' }}
            </button>
          </div>
        </template>

        <div
          v-else
          class="checkout-success__payment-state"
          :class="{ 'is-loading': isMarkingPaymentPaid, 'is-cancelled': isPaymentCancelled || isPaymentRejected }"
          aria-live="polite"
        >
          <span class="checkout-success__payment-state-icon" aria-hidden="true">
            <span v-if="isMarkingPaymentPaid" class="checkout-success__payment-spinner"></span>
            <svg v-else viewBox="0 0 24 24" fill="none">
              <path v-if="isPaymentCancelled || isPaymentRejected" d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <path v-else d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
          <p class="checkout-success__payment-state-label">{{ paymentStateLabel }}</p>
          <h3>{{ paymentStateTitle }}</h3>
          <p>{{ paymentStateMessage }}</p>
          <dl class="checkout-success__payment-state-meta">
            <div><dt>Order</dt><dd>#{{ shortOrderId }}</dd></div>
            <div><dt>Amount</dt><dd>{{ formatCurrency(bankTransfer.amount || orderResult.totalAmount) }}</dd></div>
          </dl>
          <router-link v-if="!isMarkingPaymentPaid" to="/profile/orders" class="checkout-success__payment-state-link">View Order</router-link>
        </div>
      </div>

      <!-- Shipping details -->
      <div class="checkout-success__card">
        <p class="checkout-success__card-heading">
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 5.5h8.5c.6 0 1.1.5 1.1 1.1v3.9H2V5.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M11.6 7.4h1.6l1.3 1.6v1.5h-2.9V7.4Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
            <circle cx="4.5" cy="11.5" r="1" stroke="currentColor" stroke-width="1.2"/>
            <circle cx="13" cy="11.5" r="1" stroke="currentColor" stroke-width="1.2"/>
            <path d="M3.5 4h4.5M4.3 2.8h2.9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          Shipping details
        </p>
        <div class="checkout-success__shipping-grid">
          <div>
            <span class="checkout-success__field-label">Recipient</span>
            <strong>{{ orderResult.shippingFullName }}</strong>
          </div>
          <div>
            <span class="checkout-success__field-label">Email</span>
            <span>{{ customerEmail }}</span>
          </div>
          <div>
            <span class="checkout-success__field-label">Phone</span>
            <span>{{ orderResult.shippingPhone }}</span>
          </div>
          <div class="checkout-success__shipping-address">
            <span class="checkout-success__field-label">Address</span>
            <span>{{ orderResult.shippingAddressLine }}, {{ orderResult.shippingWard }}, {{ orderResult.shippingDistrict }}, {{ orderResult.shippingCity }}</span>
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="checkout-success__card">
        <p class="checkout-success__card-heading">
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.2"/>
            <path d="M5 6h6M5 9h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          Items ordered
        </p>
        <div class="checkout-success__items">
          <article v-for="item in orderItems" :key="item.id" class="checkout-success__item">
            <router-link :to="productLink(item)" class="checkout-success__media" :aria-label="`View ${item.productName}`">
              <img
                v-if="displayProductImage(item)"
                :src="displayProductImage(item)"
                :alt="item.productName"
                class="checkout-success__image"
              />
              <ProductVisual v-else :product="item.product || item" compact />
            </router-link>

            <div class="checkout-success__copy">
              <p class="checkout-success__eyebrow">{{ item.collection || item.category || 'HEM' }}</p>
              <h3><router-link :to="productLink(item)">{{ item.productName }}</router-link></h3>
              <p v-if="item.productCode" class="checkout-success__variants">
                <span>Product code {{ item.productCode }}</span>
              </p>
              <p v-if="shouldDisplaySize(item.sizeLabel) || item.colorName" class="checkout-success__variants">
                <span v-if="item.colorName">Color {{ item.colorName }}</span>
                <span v-if="shouldDisplaySize(item.sizeLabel) && item.colorName" class="checkout-success__dot">·</span>
                <span v-if="shouldDisplaySize(item.sizeLabel)">Size {{ item.sizeLabel }}</span>
              </p>
              <p class="checkout-success__qty">
                <span
                  v-if="priceLabel(item)"
                  class="checkout-price-label"
                  :class="`price-label--${itemPriceTone(item)}`"
                >{{ priceLabel(item) }}</span>
                <span class="checkout-price-line">
                  <span>{{ item.quantity }} ×</span>
                  <strong class="price-current" :class="`price-current--${itemPriceTone(item)}`">
                    {{ formatCurrency(itemPrice(item)) }}
                  </strong>
                </span>
              </p>
            </div>

            <strong class="checkout-success__item-total">
              <span>{{ formatCurrency(itemPrice(item) * item.quantity) }}</span>
            </strong>
          </article>
        </div>

        <dl class="checkout-success__totals">
          <div>
            <dt>Subtotal</dt>
            <dd>{{ formatCurrency(orderResult.subtotal) }}</dd>
          </div>
          <div>
            <dt>Shipping fee</dt>
            <dd>{{ Number(orderResult.shippingFee) === 0 ? 'Free' : formatCurrency(orderResult.shippingFee) }}</dd>
          </div>
          <div>
            <dt>Discount<span v-if="orderResult.voucherCode"> ({{ orderResult.voucherCode }})</span></dt>
            <dd class="checkout-success__discount">-{{ formatCurrency(orderResult.discountAmount) }}</dd>
          </div>
          <div class="checkout-success__totals-final">
            <dt>Total</dt>
            <dd>{{ formatCurrency(orderResult.totalAmount) }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- Actions -->
    <div class="checkout-success__actions">
      <router-link :to="continueShoppingLink" class="checkout-success__btn-primary">
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 8h12M10 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Continue shopping
      </router-link>
      <router-link to="/profile/orders" class="checkout-success__btn-ghost">View my orders</router-link>
    </div>
  </section>
</template>

<script>
import {
  itemPriceTone,
  orderItemProductLink,
  orderItemPrice,
  priceLabel,
  primaryProductImage
} from '../../helpers/cart/cartItemHelpers';
import ProductVisual from '../product/ProductVisual.vue';
import { shouldDisplaySize } from '../../helpers/sizes';

export default {
  name: 'CheckoutSuccess',
  components: {
    ProductVisual
  },
  props: {
    orderResult: {
      type: Object,
      required: true
    },
    orderItems: {
      type: Array,
      default: () => []
    },
    customerEmail: {
      type: String,
      default: ''
    },
    continueShoppingLink: {
      type: String,
      default: '/women'
    },
    formatCurrency: {
      type: Function,
      required: true
    },
    isMarkingPaymentPaid: {
      type: Boolean,
      default: false
    },
    isCancellingPayment: {
      type: Boolean,
      default: false
    }
  },
  emits: ['activate-bank-transfer', 'mark-bank-transfer-paid', 'cancel-bank-transfer', 'expire-bank-transfer', 'refresh-bank-transfer'],
  data() {
    return {
      remainingSeconds: 0,
      countdownTimer: null,
      statusPollingTimer: null,
      expirationRequested: false,
      activationRequested: false,
      activationDisplayStartedAt: null,
      serverClockOffsetMs: 0,
      serverClockReference: ''
    };
  },
  computed: {
    isBankTransfer() {
      return this.orderResult.paymentMethod === 'bank_transfer';
    },
    bankTransfer() {
      return this.orderResult.bankTransfer || {};
    },
    isPaymentCancelled() {
      return String(this.orderResult.paymentStatus || '').toLowerCase() === 'payment_cancelled';
    },
    isPaymentRejected() {
      return String(this.orderResult.paymentStatus || '').toLowerCase() === 'payment_rejected';
    },
    heroLabel() {
      if (!this.isBankTransfer) return 'Order placed';
      if (this.orderResult.paymentStatus === 'paid') return 'Payment confirmed';
      if (this.orderResult.paymentStatus === 'payment_under_review') return 'Payment under review';
      if (this.isPaymentCancelled) return 'Payment cancelled';
      if (this.isPaymentRejected) return 'Payment rejected';
      if (this.orderResult.paymentStatus === 'payment_expired') return 'Payment expired';
      return 'Please complete your payment';
    },
    heroTitle() {
      if (!this.isBankTransfer) return 'Thank you for your order';
      if (this.orderResult.paymentStatus === 'paid') return 'Your order is being prepared';
      if (this.orderResult.paymentStatus === 'payment_under_review') return 'We are verifying your transfer';
      if (this.isPaymentCancelled) return 'This order was cancelled';
      if (this.isPaymentRejected) return 'Your payment was not confirmed';
      if (this.orderResult.paymentStatus === 'payment_expired') return 'This order was cancelled';
      return 'Scan the VietQR to pay';
    },
    heroMessage() {
      if (!this.isBankTransfer) return 'Your COD order was placed successfully. Payment will be collected upon delivery.';
      if (this.orderResult.paymentStatus === 'paid') return 'Your payment was confirmed and HEM Shop is preparing your order.';
      if (this.orderResult.paymentStatus === 'payment_under_review') return 'We received your payment notification. HEM will verify the bank transaction before preparing the order.';
      if (this.isPaymentCancelled) return 'The payment and order were cancelled at your request.';
      if (this.isPaymentRejected) return this.orderResult.paymentReviewReason || 'The bank transfer could not be verified and the order was cancelled.';
      if (this.orderResult.paymentStatus === 'payment_expired') return 'The 10-minute payment window ended. Return to your bag and place a new order to try again.';
      return 'Complete the transfer within 10 minutes, then tap I have Paid.';
    },
    showQrPayment() {
      return this.isBankTransfer && String(this.orderResult.paymentStatus || '').toLowerCase() === 'pending_payment';
    },
    formattedRemainingTime() {
      const minutes = Math.floor(this.remainingSeconds / 60);
      const seconds = this.remainingSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },
    paymentWindowSeconds() {
      return Math.max(60, Math.round(Number(this.bankTransfer.paymentWindowMinutes || 10) * 60));
    },
    qrUnavailableLabel() {
      const status = String(this.orderResult.paymentStatus || '').toLowerCase();
      if (status === 'payment_under_review') return 'Payment notification submitted';
      if (status === 'paid') return 'Payment confirmed';
      if (status === 'payment_cancelled') return 'Payment cancelled';
      if (status === 'payment_rejected') return 'Payment rejected';
      if (status === 'payment_expired') return 'QR expired';
      return 'QR unavailable';
    },
    paymentMethodLabel() {
      if (this.isBankTransfer) return 'Bank Transfer (QR Code)';
      return 'Cash on Delivery';
    },
    canNotifyPaid() {
      return this.showQrPayment && Boolean(this.bankTransfer.activatedAt) && this.remainingSeconds > 0 && !this.isMarkingPaymentPaid;
    },
    showPaymentForm() {
      return this.showQrPayment && !this.isMarkingPaymentPaid;
    },
    shortOrderId() {
      return String(this.orderResult.id || '').slice(0, 8).toUpperCase();
    },
    paymentStateLabel() {
      if (this.isMarkingPaymentPaid) return 'Submitting';
      return this.qrUnavailableLabel;
    },
    paymentStateTitle() {
      if (this.isMarkingPaymentPaid) return 'Sending your payment notification';
      const status = String(this.orderResult.paymentStatus || '').toLowerCase();
      if (status === 'payment_under_review') return 'Payment is under review';
      if (status === 'paid') return 'Payment confirmed';
      if (status === 'payment_cancelled') return 'Your order was cancelled';
      if (status === 'payment_rejected') return 'Your payment was rejected';
      if (status === 'payment_expired') return 'Payment window expired';
      return 'Payment update';
    },
    paymentStateMessage() {
      if (this.isMarkingPaymentPaid) return 'Please wait while HEM records your transfer notification.';
      if (this.orderResult.paymentStatus === 'payment_under_review') {
        return 'We are reviewing your bank transfer. You will receive an email after the payment is verified.';
      }
      if (this.isPaymentCancelled) {
        return 'The QR code is no longer valid. Reserved items and any applied coupon have been released.';
      }
      return this.paymentReviewNote;
    },
    paymentReviewNote() {
      if (this.isMarkingPaymentPaid) return 'Sending your payment notification...';
      const status = String(this.orderResult.paymentStatus || '').toLowerCase();
      if (status === 'payment_under_review') return 'Your payment notice is under review.';
      if (status === 'paid') return 'Payment confirmed.';
      if (status === 'payment_cancelled') return 'Payment and order cancelled.';
      if (status === 'payment_rejected') return this.orderResult.paymentReviewReason || 'Payment verification failed and the order was cancelled.';
      if (status === 'payment_expired') return 'Payment expired. This order was cancelled; place a new order to pay again.';
      return 'Payment status will update after admin verification.';
    }
  },
  watch: {
    'bankTransfer.expiresAt': {
      immediate: true,
      handler() {
        this.startCountdown();
      }
    },
    'bankTransfer.activatedAt'(value) {
      if (value) this.activationRequested = true;
      this.startCountdown();
    },
    'bankTransfer.serverTime'() {
      this.startCountdown();
    },
    'orderResult.paymentStatus': {
      handler() {
        this.startCountdown();
        this.startStatusPolling();
      }
    }
  },
  beforeUnmount() {
    this.stopCountdown();
    this.stopStatusPolling();
  },
  mounted() {
    this.$nextTick(() => {
      window.requestAnimationFrame(() => this.activatePaymentWindow());
    });
  },
  methods: {
    productLink: orderItemProductLink,
    shouldDisplaySize,
    itemPrice: orderItemPrice,
    itemPriceTone,
    priceLabel,
    displayProductImage: primaryProductImage,
    activatePaymentWindow() {
      if (!this.showQrPayment || this.bankTransfer.activatedAt || this.activationRequested) return;
      this.activationRequested = true;
      this.$emit('activate-bank-transfer');
    },
    stopCountdown() {
      if (this.countdownTimer) clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    },
    stopStatusPolling() {
      if (this.statusPollingTimer) clearInterval(this.statusPollingTimer);
      this.statusPollingTimer = null;
    },
    startStatusPolling() {
      this.stopStatusPolling();
      if (!this.isBankTransfer || this.orderResult.paymentStatus !== 'payment_under_review') return;
      this.statusPollingTimer = setInterval(() => {
        this.$emit('refresh-bank-transfer');
      }, 5000);
    },
    startCountdown() {
      this.stopCountdown();
      this.expirationRequested = false;
      const serverTime = String(this.bankTransfer.serverTime || '');
      if (serverTime !== this.serverClockReference) {
        const serverTimeMs = new Date(serverTime).getTime();
        this.serverClockReference = serverTime;
        this.serverClockOffsetMs = Number.isFinite(serverTimeMs) ? serverTimeMs - Date.now() : 0;
      }
      const status = String(this.orderResult.paymentStatus || '').toLowerCase();
      if (!this.isBankTransfer || status !== 'pending_payment') {
        this.activationDisplayStartedAt = null;
        this.remainingSeconds = 0;
        return;
      }

      if (!this.bankTransfer.activatedAt || !this.bankTransfer.expiresAt) {
        if (!this.activationDisplayStartedAt) this.activationDisplayStartedAt = Date.now();
        const tickBeforeActivation = () => {
          const elapsedSeconds = Math.floor((Date.now() - this.activationDisplayStartedAt) / 1000);
          this.remainingSeconds = Math.max(0, this.paymentWindowSeconds - elapsedSeconds);
        };
        tickBeforeActivation();
        this.countdownTimer = setInterval(tickBeforeActivation, 1000);
        return;
      }

      this.activationDisplayStartedAt = new Date(this.bankTransfer.activatedAt).getTime();

      const tick = () => {
        const expiresAt = new Date(this.bankTransfer.expiresAt).getTime();
        const serverAlignedNow = Date.now() + this.serverClockOffsetMs;
        this.remainingSeconds = Math.min(
          this.paymentWindowSeconds,
          Math.max(0, Math.ceil((expiresAt - serverAlignedNow) / 1000))
        );
        if (this.remainingSeconds === 0) {
          this.stopCountdown();
          if (!this.expirationRequested) {
            this.expirationRequested = true;
            this.$emit('expire-bank-transfer');
          }
        }
      };

      tick();
      if (this.remainingSeconds > 0) this.countdownTimer = setInterval(tick, 1000);
    }
  }
};
</script>

<style scoped>
.checkout-success {
  display: grid;
  gap: 0;
  max-width: 680px;
  margin: 0 auto;
  width: 100%;
}

.checkout-success__discount {
  color: #16803c;
}

.checkout-success__bank {
  gap: 18px;
}

.checkout-success__countdown {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  background: #f8f8f6;
  font-size: 13px;
  font-weight: 750;
}

.checkout-success__countdown strong {
  color: #b42318;
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.checkout-success__bank-grid {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.checkout-success__qr {
  display: grid;
  place-items: center;
  min-height: 230px;
  border: 1px solid rgba(17, 17, 17, 0.12);
  border-radius: 12px;
  background: #ffffff;
}

.checkout-success__qr img {
  width: min(100%, 220px);
  height: auto;
  object-fit: contain;
}

.checkout-success__bank-info {
  display: grid;
  gap: 10px;
  margin: 0;
}

.checkout-success__bank-info div {
  display: grid;
  grid-template-columns: 138px minmax(0, 1fr);
  gap: 10px;
}

.checkout-success__bank-info dt {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.checkout-success__bank-info dd {
  margin: 0;
  color: var(--color-text-primary);
  font-weight: 800;
  overflow-wrap: anywhere;
}

.checkout-success__paid-button {
  justify-self: start;
  min-height: 42px;
  padding: 0 22px;
  border: 1px solid #111111;
  border-radius: 999px;
  background: #111111;
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 160ms ease, transform 160ms ease;
}

.checkout-success__payment-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.checkout-success__cancel-payment-button {
  min-height: 42px;
  padding: 0 22px;
  border: 1px solid #b42318;
  border-radius: 999px;
  background: #b42318;
  color: #ffffff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 160ms ease, transform 160ms ease;
}

.checkout-success__paid-button:hover:not(:disabled),
.checkout-success__cancel-payment-button:hover:not(:disabled) {
  opacity: 0.86;
  transform: translateY(-1px);
}

.checkout-success__paid-button:disabled,
.checkout-success__cancel-payment-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.checkout-success__review-note {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 700;
}

.checkout-success__payment-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  min-height: 300px;
  padding: 36px 28px;
  border: 1px solid rgba(17, 17, 17, 0.11);
  background: #f8f8f6;
  text-align: center;
}

.checkout-success__payment-state-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: 4px;
  border: 1px solid rgba(17, 17, 17, 0.18);
  background: #ffffff;
  color: #176b34;
}

.checkout-success__payment-state-icon svg {
  width: 26px;
  height: 26px;
}

.checkout-success__payment-state.is-loading .checkout-success__payment-state-icon {
  color: #111111;
}

.checkout-success__payment-state.is-cancelled .checkout-success__payment-state-icon {
  color: #b42318;
}

.checkout-success__payment-spinner {
  width: 23px;
  height: 23px;
  border: 2px solid rgba(17, 17, 17, 0.18);
  border-top-color: #111111;
  border-radius: 50% !important;
  animation: checkout-payment-spin 700ms linear infinite;
}

@keyframes checkout-payment-spin {
  to { transform: rotate(360deg); }
}

.checkout-success__payment-state-label {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 750;
  line-height: 1.2;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.checkout-success__payment-state h3 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
}

.checkout-success__payment-state > p:not(.checkout-success__payment-state-label) {
  max-width: 500px;
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.checkout-success__payment-state-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(150px, 1fr));
  width: min(100%, 430px);
  margin: 12px 0 0;
  border-top: 1px solid rgba(17, 17, 17, 0.1);
  border-bottom: 1px solid rgba(17, 17, 17, 0.1);
}

.checkout-success__payment-state-meta div {
  display: grid;
  gap: 4px;
  padding: 13px 16px;
}

.checkout-success__payment-state-meta div + div {
  border-left: 1px solid rgba(17, 17, 17, 0.1);
}

.checkout-success__payment-state-meta dt {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 650;
  text-transform: uppercase;
}

.checkout-success__payment-state-meta dd {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.checkout-success__payment-state-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  margin-top: 6px;
  padding: 0 20px;
  border: 1px solid #111111;
  background: #111111;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}

/* Hero */
.checkout-success__hero {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 36px 32px 28px;
  background: #fff;
  border: 1px solid rgba(17,17,17,0.09);
  border-radius: 18px 18px 0 0;
}

.checkout-success__check-wrap {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  color: #111111;
}

.checkout-success__check-icon {
  width: 56px;
  height: 56px;
}

.checkout-success__check-ring {
  stroke-dasharray: 144.51;
  stroke-dashoffset: 144.51;
  animation: ring-draw 0.6s 0.1s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.checkout-success__check-tick {
  stroke-dasharray: 28;
  stroke-dashoffset: 28;
  animation: tick-draw 0.35s 0.65s ease forwards;
}

@keyframes ring-draw {
  to { stroke-dashoffset: 0; }
}

@keyframes tick-draw {
  to { stroke-dashoffset: 0; }
}

.checkout-success__hero-copy {
  display: grid;
  gap: 6px;
}

.checkout-success__label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #111111;
  opacity: 0.45;
}

.checkout-success__title {
  margin: 0;
  font-size: 22px;
  font-weight: 650;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.checkout-success__sub {
  margin: 0;
  font-size: 13.5px;
  color: var(--color-text-secondary);
  line-height: 1.55;
}

/* Strip */
.checkout-success__strip {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 32px;
  background: rgba(17,17,17,0.035);
  border-left: 1px solid rgba(17,17,17,0.09);
  border-right: 1px solid rgba(17,17,17,0.09);
}

.checkout-success__strip-item {
  display: grid;
  gap: 3px;
  padding: 16px 20px 16px 0;
}

.checkout-success__strip-item:first-child {
  padding-left: 0;
}

.checkout-success__strip-divider {
  width: 1px;
  height: 28px;
  background: rgba(17,17,17,0.1);
  margin: 0 20px 0 0;
  flex-shrink: 0;
}

.checkout-success__strip-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.checkout-success__strip-value {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.checkout-success__strip-id {
  font-size: 12px;
  font-family: ui-monospace, monospace;
  letter-spacing: 0.02em;
  opacity: 0.72;
}

.checkout-success__badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(22, 128, 60, 0.1);
  color: #15803d;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: capitalize;
}

/* Body */
.checkout-success__body {
  display: grid;
  gap: 1px;
  background: rgba(17,17,17,0.09);
  border-left: 1px solid rgba(17,17,17,0.09);
  border-right: 1px solid rgba(17,17,17,0.09);
}

.checkout-success__card {
  display: grid;
  gap: 16px;
  padding: 24px 32px;
  background: #fff;
}

.checkout-success__card-heading {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.checkout-success__card-heading svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  opacity: 0.6;
}

.checkout-success__shipping-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 24px;
}

.checkout-success__shipping-address {
  grid-column: 1 / -1;
}

.checkout-success__shipping-grid > div {
  display: grid;
  gap: 3px;
}

.checkout-success__field-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.checkout-success__shipping-grid strong,
.checkout-success__shipping-grid span:not(.checkout-success__field-label) {
  font-size: 13.5px;
  color: var(--color-text-primary);
}

/* Items */
.checkout-success__items {
  display: grid;
  gap: 0;
}

.checkout-success__item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px 0;
  border-top: 1px solid var(--color-border-subtle);
}

.checkout-success__item:first-child {
  padding-top: 0;
  border-top: none;
}

.checkout-success__media {
  width: 72px;
  flex-shrink: 0;
}

.checkout-success__media,
.checkout-success__copy h3 a {
  color: inherit;
  text-decoration: none;
}

.checkout-success__image {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 12px;
  background: transparent;
  display: block;
}

.checkout-success__media :deep(.product-visual),
.checkout-success__media :deep(.product-visual__images) {
  width: 72px;
  height: 72px;
}

.checkout-success__media :deep(.product-visual) {
  border-radius: 12px;
  overflow: hidden;
  background: transparent;
}

.checkout-success__media :deep(.product-visual__image) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: transparent;
}

.checkout-success__media :deep(.product-visual--has-images::after) {
  display: none;
}

.checkout-success__copy {
  display: grid;
  gap: 4px;
}

.checkout-success__copy h3,
.checkout-success__copy p {
  margin: 0;
}

.checkout-success__eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.checkout-success__copy h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.checkout-success__variants {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
}

.checkout-success__dot {
  opacity: 0.4;
}

.checkout-success__qty {
  display: grid;
  gap: 2px;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.checkout-success__item-total {
  display: grid;
  justify-items: end;
  gap: 2px;
  font-size: 14px;
  font-weight: 650;
  color: var(--color-text-primary);
  white-space: nowrap;
}

.checkout-price-label {
  color: #9a6a13;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.checkout-price-line {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
}

.checkout-price-line strong {
  font-weight: 700;
}

.checkout-success__totals {
  display: grid;
  gap: 10px;
  margin: 4px 0 0 auto;
  width: min(280px, 100%);
  padding-top: 16px;
  border-top: 1px solid var(--color-border-subtle);
}

.checkout-success__totals div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.checkout-success__totals dt,
.checkout-success__totals dd {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.checkout-success__totals dd {
  color: var(--color-text-primary);
  font-weight: 600;
}

.checkout-success__totals-final {
  margin-top: 2px;
  padding-top: 12px;
  border-top: 1px solid rgba(17, 17, 17, 0.12);
}

.checkout-success__totals-final dt,
.checkout-success__totals-final dd {
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 700;
}

/* Actions */
.checkout-success__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 32px;
  background: #fff;
  border: 1px solid rgba(17,17,17,0.09);
  border-top: none;
  border-radius: 0 0 18px 18px;
}

.checkout-success__btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 22px;
  border-radius: 999px;
  background: #111111;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.checkout-success__btn-primary:hover {
  opacity: 0.85;
  transform: translateY(-1px);
}

.checkout-success__btn-primary svg {
  width: 14px;
  height: 14px;
}

.checkout-success__btn-ghost {
  display: inline-flex;
  align-items: center;
  height: 46px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1px solid rgba(17,17,17,0.16);
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.checkout-success__btn-ghost:hover {
  border-color: rgba(17,17,17,0.32);
  background: rgba(17,17,17,0.03);
  transform: translateY(-1px);
}

@media (max-width: 960px) {
  .checkout-success__hero {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 24px 20px 20px;
    border-radius: 14px 14px 0 0;
  }

  .checkout-success__title {
    font-size: 19px;
  }

  .checkout-success__strip {
    flex-wrap: wrap;
    padding: 0 20px;
  }

  .checkout-success__strip-item {
    padding: 12px 16px 12px 0;
  }

  .checkout-success__strip-divider {
    margin-right: 16px;
  }

  .checkout-success__card {
    padding: 20px;
  }

  .checkout-success__bank-grid,
  .checkout-success__bank-info div {
    grid-template-columns: 1fr;
  }

  .checkout-success__paid-button {
    width: 100%;
  }

  .checkout-success__payment-actions {
    display: grid;
  }

  .checkout-success__cancel-payment-button {
    width: 100%;
  }

  .checkout-success__payment-state {
    min-height: 260px;
    padding: 28px 18px;
  }

  .checkout-success__payment-state-meta {
    grid-template-columns: 1fr;
  }

  .checkout-success__payment-state-meta div + div {
    border-top: 1px solid rgba(17, 17, 17, 0.1);
    border-left: 0;
  }

  .checkout-success__shipping-grid {
    grid-template-columns: 1fr;
  }

  .checkout-success__shipping-address {
    grid-column: 1;
  }

  .checkout-success__item {
    grid-template-columns: 64px minmax(0, 1fr) auto;
    gap: 12px;
  }

  .checkout-success__media {
    width: 64px;
  }

  .checkout-success__image {
    width: 64px;
    height: 64px;
  }

  .checkout-success__media :deep(.product-visual),
  .checkout-success__media :deep(.product-visual__images) {
    width: 64px;
    height: 64px;
  }

  .checkout-success__actions {
    flex-direction: column;
    align-items: stretch;
    padding: 20px;
    border-radius: 0 0 14px 14px;
  }

  .checkout-success__btn-primary,
  .checkout-success__btn-ghost {
    justify-content: center;
  }
}

@media (min-width: 1440px) {
  .checkout-success {
    max-width: min(1160px, 72vw);
  }

  .checkout-success__hero {
    gap: 28px;
    padding: 42px 38px 34px;
  }

  .checkout-success__check-wrap,
  .checkout-success__check-icon {
    width: 64px;
    height: 64px;
  }

  .checkout-success__label,
  .checkout-success__strip-label,
  .checkout-success__field-label,
  .checkout-success__eyebrow,
  .checkout-price-label {
    font-size: 0.875rem;
    letter-spacing: 0;
  }

  .checkout-success__title {
    font-size: 1.875rem;
    letter-spacing: 0;
  }

  .checkout-success__sub,
  .checkout-success__strip-value,
  .checkout-success__badge,
  .checkout-success__shipping-grid strong,
  .checkout-success__shipping-grid span:not(.checkout-success__field-label),
  .checkout-success__bank-info dt,
  .checkout-success__bank-info dd,
  .checkout-success__review-note,
  .checkout-success__variants,
  .checkout-success__qty,
  .checkout-success__totals dt,
  .checkout-success__totals dd {
    font-size: 1rem;
    line-height: 1.5;
  }

  .checkout-success__strip-id {
    font-size: 0.9375rem;
  }

  .checkout-success__card {
    gap: 20px;
    padding: 30px 38px;
  }

  .checkout-success__bank {
    gap: clamp(24px, 1.8vw, 34px);
  }

  .checkout-success__countdown {
    padding: 18px 22px;
    font-size: clamp(1rem, 0.9vw, 1.25rem);
  }

  .checkout-success__countdown strong {
    font-size: clamp(1.75rem, 1.7vw, 2.25rem);
  }

  .checkout-success__bank-grid {
    grid-template-columns: clamp(280px, 20vw, 360px) minmax(0, 1fr);
    gap: clamp(30px, 3vw, 52px);
    align-items: center;
  }

  .checkout-success__qr {
    min-height: 0;
    padding: 12px;
    border-radius: 16px;
  }

  .checkout-success__qr img {
    width: 100%;
    max-width: 360px;
  }

  .checkout-success__bank-info {
    gap: clamp(14px, 1.2vw, 22px);
  }

  .checkout-success__bank-info div {
    grid-template-columns: clamp(160px, 12vw, 210px) minmax(0, 1fr);
    gap: 18px;
  }

  .checkout-success__bank-info dt,
  .checkout-success__bank-info dd {
    font-size: clamp(1rem, 1vw, 1.25rem);
    line-height: 1.4;
  }

  .checkout-success__card-heading {
    font-size: 0.9375rem;
    letter-spacing: 0;
  }

  .checkout-success__copy h3,
  .checkout-success__item-total,
  .checkout-success__totals-final dt,
  .checkout-success__totals-final dd {
    font-size: 1.25rem;
  }

  .checkout-success__item {
    grid-template-columns: 132px minmax(0, 1fr) auto;
    gap: 26px;
    padding: 26px 0;
  }

  .checkout-success__media,
  .checkout-success__image,
  .checkout-success__media :deep(.product-visual),
  .checkout-success__media :deep(.product-visual__images) {
    width: 132px;
    height: 165px;
  }

  .checkout-success__copy {
    gap: 8px;
  }

  .checkout-success__eyebrow,
  .checkout-price-label {
    font-size: 0.9375rem;
  }

  .checkout-success__variants,
  .checkout-success__qty {
    font-size: 1.125rem;
    line-height: 1.5;
  }

  .checkout-success__paid-button,
  .checkout-success__cancel-payment-button,
  .checkout-success__btn-primary,
  .checkout-success__btn-ghost {
    min-height: 50px;
    font-size: 1rem;
  }

  .checkout-success__payment-state {
    min-height: 360px;
    padding: 48px 36px;
  }

  .checkout-success__payment-state-label,
  .checkout-success__payment-state-meta dt {
    font-size: 0.8125rem;
    letter-spacing: 0.04em;
  }

  .checkout-success__payment-state h3 {
    font-size: 1.5rem;
  }

  .checkout-success__payment-state > p:not(.checkout-success__payment-state-label),
  .checkout-success__payment-state-meta dd,
  .checkout-success__payment-state-link {
    font-size: 1rem;
  }

  .checkout-success__actions {
    padding: 28px 38px;
  }
}

@media (min-width: 1920px) {
  .checkout-success {
    max-width: min(1320px, 70vw);
  }

  .checkout-success__card {
    padding: 40px 48px;
  }

  .checkout-success__card-heading {
    font-size: 1.125rem;
  }

  .checkout-success__bank-grid {
    grid-template-columns: clamp(360px, 21vw, 440px) minmax(0, 1fr);
  }

  .checkout-success__qr img {
    max-width: 440px;
  }

  .checkout-success__bank-info div {
    grid-template-columns: clamp(190px, 11vw, 240px) minmax(0, 1fr);
  }

  .checkout-success__bank-info dt,
  .checkout-success__bank-info dd {
    font-size: clamp(1.125rem, 1.05vw, 1.375rem);
  }

  .checkout-success__item {
    grid-template-columns: 168px minmax(0, 1fr) auto;
    gap: 32px;
    padding: 32px 0;
  }

  .checkout-success__media,
  .checkout-success__image,
  .checkout-success__media :deep(.product-visual),
  .checkout-success__media :deep(.product-visual__images) {
    width: 168px;
    height: 210px;
  }

  .checkout-success__eyebrow,
  .checkout-price-label {
    font-size: 1rem;
  }

  .checkout-success__copy h3,
  .checkout-success__item-total {
    font-size: 1.5rem;
  }

  .checkout-success__variants,
  .checkout-success__qty {
    font-size: 1.25rem;
  }
}
</style>
