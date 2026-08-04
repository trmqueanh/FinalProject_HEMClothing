<template>
  <section class="profile-panel profile-order-detail">
    <div class="profile-order-detail__topbar">
      <button
        type="button"
        class="profile-order-detail__back"
        @click="$emit('back')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        <span>Back to orders</span>
      </button>

      <div class="profile-order-detail__topbar-title" v-if="selectedOrder">
        <p class="eyebrow">Order Detail</p>
        <span class="profile-order-detail__topbar-id">#{{ shortId(selectedOrder.id) }}</span>
      </div>
    </div>

    <div v-if="isLoading" class="profile-empty">
      Loading order detail...
    </div>

    <div v-else-if="selectedOrder" class="profile-order-detail__grid">
      <div class="profile-order-detail__left">
        <article class="profile-order-detail__card">
          <p class="eyebrow profile-order-shipping-title">Shipping information</p>
          <dl class="profile-order-shipping-card">
            <div>
              <dt>Receiver</dt>
              <dd>{{ selectedOrder.shippingFullName || '-' }}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{{ selectedOrder.shippingPhone || '-' }}</dd>
            </div>
            <div class="profile-order-shipping-card__address">
              <dt>Address</dt>
              <dd>{{ formatFullShippingAddress(selectedOrder) }}</dd>
            </div>
            <div class="profile-order-shipping-card__note">
              <dt>Note</dt>
              <dd>{{ selectedOrder.shippingNote || 'No delivery note' }}</dd>
            </div>
          </dl>
        </article>

        <article class="profile-order-detail__card profile-order-detail__card--products">
          <div class="profile-order-detail__heading">
            <div>
              <p class="eyebrow">Products</p>
              <h2>{{ orderItems.length }} item{{ orderItems.length === 1 ? '' : 's' }}</h2>
            </div>
          </div>

          <div class="profile-order__items profile-order-detail__items">
            <OrderLineItem
              v-for="item in orderItems"
              :key="item.id"
              :item="item"
              :order="selectedOrder"
              variant="detail"
              :format-currency="formatCurrency"
              :product-link="productLink"
              :item-price="itemPrice"
              :price-label="priceLabel"
              :can-review-order-item="canReviewOrderItem"
              :is-reviewed-order-item="isReviewedOrderItem"
              @review="$emit('review', $event)"
            />
          </div>
        </article>

        <article
          v-if="selectedOrder.returnRequest || selectedOrder.refundRequest"
          id="returns-refunds"
          ref="aftercareSection"
          class="profile-order-detail__card profile-order-detail__card--aftercare"
          :class="{ 'is-focused': focusRefundAccount }"
        >
          <div class="profile-order-detail__heading">
            <div>
              <p class="eyebrow">Returns &amp; refunds</p>
            </div>
          </div>

          <div class="profile-order-detail__aftercare">
            <ReturnHistory
              v-if="selectedOrder.returnRequests && selectedOrder.returnRequests.length > 1"
              :returns="selectedOrder.returnRequests"
              :format-label="formatLabel"
              :format-date="formatDate"
              :format-currency="formatCurrency"
            />
            <template v-if="selectedOrder.returnRequest">
              <div class="profile-order-detail__aftercare-header">
                <div>
                  <h2>Return {{ formatLabel(selectedOrder.returnRequest.returnStatus) }}</h2>
                  <span>{{ formatDate(returnDisplayDate) }}</span>
                </div>
              </div>

              <p class="profile-order-detail__aftercare-reason">
                <span>Reason</span>
                <strong>{{ formatLabel(selectedOrder.returnRequest.reason) }}</strong>
              </p>
              <p v-if="selectedOrder.returnRequest.rejectionReason" class="profile-order-detail__aftercare-rejection">
                {{ selectedOrder.returnRequest.rejectionReason }}
              </p>

              <div v-if="selectedOrder.returnRequest.items && selectedOrder.returnRequest.items.length" class="profile-order-detail__aftercare-items">
                <article v-for="item in selectedOrder.returnRequest.items" :key="item.id" class="profile-order-detail__aftercare-item">
                  <router-link :to="productLink(item)" class="profile-order-detail__aftercare-media" :aria-label="`View ${item.productName}`">
                    <img v-if="item.productImage" :src="item.productImage" :alt="`${item.productName} in ${item.colorName || 'selected colour'}`" />
                    <span v-else>HEM</span>
                  </router-link>
                  <div class="profile-order-detail__aftercare-item-copy">
                    <router-link :to="productLink(item)">{{ item.productName }}</router-link>
                    <span>{{ [item.colorName, item.sizeLabel && `Size ${item.sizeLabel}`].filter(Boolean).join(' · ') }}</span>
                  </div>
                  <strong class="profile-order-detail__aftercare-quantity">
                    {{ returnItemQuantity(item) }} item{{ returnItemQuantity(item) === 1 ? '' : 's' }} {{ returnItemOutcome(item) }}
                  </strong>
                </article>
              </div>
            </template>

            <section v-if="refundDetails" class="profile-order-detail__aftercare-refund">
              <div>
                <span class="profile-order-detail__aftercare-label">Refund</span>
                <strong>{{ refundDetails.refundCode }}</strong>
                <span>{{ formatLabel(refundDetails.status) }}</span>
              </div>
              <strong class="profile-order-detail__aftercare-amount">
                {{ formatCurrency(refundDetails.approvedAmount || refundDetails.requestedAmount) }}
              </strong>
            </section>

            <RefundAccountForm
              v-if="shouldShowRefundAccount"
              id="refund-account"
              ref="refundAccountSection"
              :account="refundAccount"
              :can-edit="canEditRefundAccount"
              :is-saving="isSaving"
              @submit="submitRefundAccount"
            />
          </div>
        </article>
      </div>

      <div class="profile-order-detail__right">
        <article class="profile-order-detail__card profile-order-detail__card--summary">
          <div class="profile-order-detail__heading">
            <div>
              <p class="eyebrow">Order summary</p>
              <div class="profile-order-detail__id-block">
                <span class="profile-order-detail__id-label"></span>
                <span class="profile-order-detail__id-number">#{{ shortId(selectedOrder.id) }}</span>
              </div>
              <span>{{ formatDate(selectedOrder.createdAt) }}</span>
            </div>
            <div class="profile-order-detail__badges">
              <span class="profile-order__status-badge" :class="[orderStatusBadgeClass(selectedOrder.orderStatus), `is-${selectedOrder.orderStatus}`]">
                {{ formatLabel(selectedOrder.orderStatus) }}
              </span>
              <span class="profile-order__status-badge profile-order__status-badge--payment">
                {{ formatLabel(selectedOrder.paymentStatus) }}
              </span>
            </div>
          </div>

          <BankTransferPaymentNotice :order="selectedOrder" />

          <dl class="profile-order-detail__facts">
            <div>
              <dt>Payment method</dt>
              <dd>{{ formatPaymentMethod(selectedOrder.paymentMethod) }}</dd>
            </div>
            <div>
              <dt>Total Items</dt>
              <dd>{{ orderItems.length }} item{{ orderItems.length === 1 ? '' : 's' }}</dd>
            </div>
            <div>
              <dt>Subtotal</dt>
              <dd>{{ formatCurrency(selectedOrder.subtotal) }}</dd>
            </div>
            <div>
              <dt>Shipping fee</dt>
              <dd>{{ Number(selectedOrder.shippingFee) === 0 ? 'Free' : formatCurrency(selectedOrder.shippingFee) }}</dd>
            </div>
            <div>
              <dt>Discount<span v-if="selectedOrder.voucherCode"> ({{ selectedOrder.voucherCode }})</span></dt>
              <dd class="profile-order-detail__discount">-{{ formatCurrency(selectedOrder.discountAmount) }}</dd>
            </div>
            <div>
              <dt>Total amount</dt>
              <dd>{{ formatCurrency(selectedOrder.totalAmount) }}</dd>
            </div>
          </dl>

          <div v-if="isOrderCanceled(selectedOrder)" class="profile-order-detail__cancelled">
            <strong>Canceled</strong>
            <span>{{ formatCancelActor(selectedOrder.cancelledBy) }} · {{ formatDate(selectedOrder.cancelledAt) }}</span>
            <p v-if="selectedOrder.cancelReason">Reason: {{ formatCancelReason(selectedOrder.cancelReason) }}</p>
          </div>

          <div class="profile-order-detail__actions">
            <button
              v-if="canBuyAgainOrder(selectedOrder)"
              type="button"
              class="profile-order-detail__action profile-order-detail__action--buy-again"
              :disabled="isBuyingAgain"
              :aria-busy="isBuyingAgain ? 'true' : 'false'"
              @click="$emit('request-buy-again', selectedOrder)"
            >
              {{ isBuyingAgain ? 'Adding...' : 'Buy Again' }}
            </button>
            <button
              v-if="canConfirmReceived(selectedOrder)"
              type="button"
              class="profile-order-detail__action profile-order-detail__action--primary"
              @click="$emit('confirm-received', selectedOrder)"
            >
              Confirm Received
            </button>
            <button
              v-if="canRequestReturn(selectedOrder)"
              type="button"
              class="profile-order-detail__action"
              @click="$emit('request-return', selectedOrder)"
            >
              Request return
            </button>
          </div>
        </article>

        <article class="profile-order-detail__card profile-order-detail__card--timeline">
          <p class="eyebrow">Order tracking</p>
          <OrderTimeline
            :timeline="timeline"
            :is-timeline-cancellation="isTimelineCancellation"
            :format-order-timeline-title="formatOrderTimelineTitle"
            :format-timeline-role="formatTimelineRole"
            :format-date="formatDate"
            :format-timeline-note="formatTimelineNote"
          />
        </article>
      </div>
    </div>

    <div v-else class="profile-empty">
      <h3>Order not found.</h3>
      <p>This order may no longer be available.</p>
      <button type="button" class="ghost-button" @click="$emit('back')">Back to Orders</button>
    </div>
  </section>
</template>

<script>
import BankTransferPaymentNotice from './BankTransferPaymentNotice.vue';
import OrderLineItem from './OrderLineItem.vue';
import OrderTimeline from './OrderTimeline.vue';
import RefundAccountForm from './RefundAccountForm.vue';
import ReturnHistory from './ReturnHistory.vue';

export default {
  name: 'OrderDetail',
  components: {
    BankTransferPaymentNotice,
    OrderLineItem,
    OrderTimeline,
    RefundAccountForm,
    ReturnHistory
  },
  props: {
    selectedOrder: {
      type: Object,
      default: null
    },
    orderItems: {
      type: Array,
      default: () => []
    },
    timeline: {
      type: Array,
      default: () => []
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    focusRefundAccount: { type: Boolean, default: false },
    isSaving: { type: Boolean, default: false },
    isBuyingAgain: { type: Boolean, default: false },
    shortId: { type: Function, required: true },
    formatFullShippingAddress: { type: Function, required: true },
    formatCurrency: { type: Function, required: true },
    productLink: { type: Function, required: true },
    itemPrice: { type: Function, required: true },
    priceLabel: { type: Function, required: true },
    canBuyAgainOrder: { type: Function, required: true },
    canReviewOrderItem: { type: Function, required: true },
    isReviewedOrderItem: { type: Function, required: true },
    isTimelineCancellation: { type: Function, required: true },
    formatOrderTimelineTitle: { type: Function, required: true },
    formatTimelineRole: { type: Function, required: true },
    formatDate: { type: Function, required: true },
    formatTimelineNote: { type: Function, required: true },
    orderStatusBadgeClass: { type: Function, required: true },
    formatLabel: { type: Function, required: true },
    formatPaymentMethod: { type: Function, required: true },
    isOrderCanceled: { type: Function, required: true },
    formatCancelActor: { type: Function, required: true },
    formatCancelReason: { type: Function, required: true },
    canConfirmReceived: { type: Function, required: true },
    canRequestReturn: { type: Function, required: true }
  },
  computed: {
    refundDetails() {
      const returnRequest = this.selectedOrder && this.selectedOrder.returnRequest;
      const refunds = returnRequest && Array.isArray(returnRequest.refunds) ? returnRequest.refunds : [];
      const orderRefund = this.selectedOrder && this.selectedOrder.refundRequest;

      if (orderRefund && refunds.some(refund => String(refund.id) === String(orderRefund.id))) {
        const returnRefund = refunds.find(refund => String(refund.id) === String(orderRefund.id));
        return { ...returnRefund, ...orderRefund };
      }

      return refunds.length ? refunds[refunds.length - 1] : orderRefund;
    },
    returnDisplayDate() {
      const request = this.selectedOrder && this.selectedOrder.returnRequest;
      return request && (
        request.completedAt ||
        request.inspectedAt ||
        request.receivedAt ||
        request.approvedAt ||
        request.requestedAt
      );
    },
    refundAccount() {
      const request = this.selectedOrder && this.selectedOrder.returnRequest;
      const returnAccount = request && request.refundAccount;
      const refundAccount = this.refundDetails && this.refundDetails.refundAccount;
      const returnAccountStatus = String(returnAccount && returnAccount.status || '').toLowerCase();

      if (returnAccount && (
        !['', 'not_provided'].includes(returnAccountStatus) ||
        returnAccount.bankName ||
        returnAccount.maskedAccountNumber ||
        returnAccount.accountNumber
      )) {
        return returnAccount;
      }

      return refundAccount || returnAccount || {};
    },
    canEditRefundAccount() {
      const request = this.selectedOrder && this.selectedOrder.returnRequest;
      const refundStatus = String(this.refundDetails && this.refundDetails.status || '').toLowerCase();
      if (request) {
        const returnStatus = String(request.returnStatus || request.status || '').toLowerCase();
        return returnStatus === 'refund_pending' && ['pending', 'failed'].includes(refundStatus);
      }

      return ['pending', 'failed'].includes(refundStatus);
    },
    shouldShowRefundAccount() {
      const request = this.selectedOrder && this.selectedOrder.returnRequest;
      if (request) {
        const returnStatus = String(request.returnStatus || request.status || '').toLowerCase();
        if (!['refund_pending', 'completed'].includes(returnStatus)) return false;
      }

      const account = this.refundAccount;
      const accountStatus = String(account.status || '').toLowerCase();
      const hasAccountDetails = Boolean(
        account.bankName &&
        (account.maskedAccountNumber || account.accountNumber) &&
        account.accountHolder
      );
      return this.canEditRefundAccount || hasAccountDetails || accountStatus === 'rejected';
    }
  },
  watch: {
    focusRefundAccount: {
      immediate: true,
      handler(value) {
        if (value) this.scrollToRefundAccount();
      }
    },
    selectedOrder() {
      if (this.focusRefundAccount) this.scrollToRefundAccount();
    },
    isLoading(value) {
      if (!value && this.focusRefundAccount) this.scrollToRefundAccount();
    }
  },
  methods: {
    returnItemQuantity(item) {
      const accepted = Number(item && item.acceptedQuantity || 0);
      const rejected = Number(item && item.rejectedQuantity || 0);
      const approved = Number(item && item.approvedQuantity || 0);
      const requested = Number(item && item.requestedQuantity || 0);
      return accepted || rejected || approved || requested;
    },
    returnItemOutcome(item) {
      if (Number(item && item.acceptedQuantity || 0) > 0) return 'accepted';
      if (Number(item && item.rejectedQuantity || 0) > 0) return 'rejected';
      if (Number(item && item.approvedQuantity || 0) > 0) return 'approved';
      return 'requested';
    },
    submitRefundAccount(payload) {
      if (this.selectedOrder && this.selectedOrder.returnRequest) {
        this.$emit('save-return-refund-account', payload);
        return;
      }
      this.$emit('save-refund-account', payload);
    },
    scrollToRefundAccount() {
      this.$nextTick(() => {
        if (typeof window === 'undefined') return;
        window.requestAnimationFrame(() => {
          const accountComponent = this.$refs.refundAccountSection;
          const target = accountComponent && accountComponent.$el
            ? accountComponent.$el
            : this.$refs.aftercareSection;
          if (target && typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      });
    }
  },
  emits: [
    'back',
    'request-buy-again',
    'review',
    'confirm-received',
    'request-return',
    'save-return-refund-account',
    'save-refund-account'
  ]
};
</script>

<style scoped>
.profile-order-detail__discount {
  color: #16803c;
}

.profile-panel {
  display: grid;
  gap: 32px;
}

.profile-order-detail__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 18px;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(17,17,17,0.07);
}

.profile-order-detail__topbar-title {
  text-align: right;
}

.profile-order-detail__topbar-title .eyebrow {
  margin: 0 0 2px;
  font-size: 10px;
  letter-spacing: 0.1em;
}

.profile-order-detail__topbar-id {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.profile-order-detail__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 7px 14px 7px 10px;
  border: 1px solid rgba(17,17,17,0.12);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.profile-order-detail__back svg {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  stroke-width: 2.4;
  fill: none;
  flex-shrink: 0;
}

.profile-order-detail__back:hover {
  color: #ffffff;
  background: #111111;
  border-color: #111111;
}

.profile-order-detail .ghost-button {
  border: 1px solid rgba(17, 17, 17, 0.18);
  background: transparent;
  color: var(--color-text-primary);
}

.profile-order-detail .ghost-button:hover {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-order-detail__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.profile-order-detail__left,
.profile-order-detail__right {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.profile-order-detail__card {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgba(17,17,17,0.07);
  border-radius: 14px;
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.profile-order-detail__card--summary {
  border-top: 3px solid #111111;
  background: rgba(255,255,255,0.70);
}

.profile-order-detail__card--aftercare {
  gap: 18px;
  background: #ffffff;
  scroll-margin-top: calc(var(--store-header-height, 0px) + 24px);
  transition: border-color .2s ease, box-shadow .2s ease;
}

.profile-order-detail__card--aftercare.is-focused {
  border-color: rgba(17,17,17,.28);
  box-shadow: 0 0 0 3px rgba(17,17,17,.05);
}

.profile-order-detail__card--aftercare h2 {
  margin: 0;
  font-size: 18px;
  letter-spacing: -0.02em;
}

.profile-order-detail__aftercare {
  display: grid;
  gap: 18px;
}

.profile-order-detail__aftercare-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.profile-order-detail__aftercare-header > div {
  display: grid;
  gap: 5px;
}

.profile-order-detail__aftercare-header span,
.profile-order-detail__aftercare-item-copy span,
.profile-order-detail__aftercare-refund div > span:last-child {
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.45;
}

.profile-order-detail__aftercare-reason {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0;
}

.profile-order-detail__aftercare-reason span,
.profile-order-detail__aftercare-label {
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
}

.profile-order-detail__aftercare-reason strong {
  font-size: 14px;
}

.profile-order-detail__aftercare-rejection {
  margin: -8px 0 0;
  color: #b91c1c;
  font-size: 13px;
}

.profile-order-detail__aftercare-items {
  display: grid;
  border-block: 1px solid rgba(17,17,17,.08);
}

.profile-order-detail__aftercare-item {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px 0;
}

.profile-order-detail__aftercare-item + .profile-order-detail__aftercare-item {
  border-top: 1px solid rgba(17,17,17,.07);
}

.profile-order-detail__aftercare-media {
  display: grid;
  place-items: center;
  width: 68px;
  height: 86px;
  overflow: hidden;
  background: #f4f2ee;
  color: rgba(17,17,17,.45);
  text-decoration: none;
}

.profile-order-detail__aftercare-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-order-detail__aftercare-media span {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
}

.profile-order-detail__aftercare-item-copy {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.profile-order-detail__aftercare-item-copy a {
  width: fit-content;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.profile-order-detail__aftercare-item-copy a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.profile-order-detail__aftercare-quantity {
  font-size: 13px;
  text-align: right;
  white-space: nowrap;
}

.profile-order-detail__aftercare-refund {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.profile-order-detail__aftercare-refund > div {
  display: grid;
  gap: 4px;
}

.profile-order-detail__aftercare-refund div > strong {
  font-size: 14px;
  overflow-wrap: anywhere;
}

.profile-order-detail__aftercare-amount {
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.profile-order-detail__card--timeline {
  padding: 18px;
}

.profile-order-detail__card--timeline .eyebrow {
  margin: 0;
}

.profile-order-detail__card--products {
  gap: 14px;
  padding: 22px;
  background: #ffffff;
}

.profile-order-detail__card--products .profile-order-detail__heading {
  margin: 0;
}

.profile-order-detail__card--products .eyebrow {
  margin: 0 0 8px;
}

.profile-order-detail__card--products h2 {
  margin: 0;
}

.profile-order-detail__card--products .profile-order-detail__items {
  margin-top: 0;
}

.payment-status--unpaid {
  background: #f0fdf9;
  color: #0f766e;
  border: 1px solid #99f6e4;
}

.profile-order-detail__heading {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.profile-order-detail__card-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin: 0 0 4px;
}

.profile-order-detail__card-title {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.015em;
  color: var(--color-text-primary);
  margin: 0;
}

.profile-order-detail__id-block {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 2px 0;
}

.profile-order-detail__id-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.profile-order-detail__id-number {
  font-size: 22px;
  font-weight: 800;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.profile-order-detail__heading span,
.profile-order-detail__muted {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.profile-order-detail__badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  align-items: flex-start;
}

.profile-order-detail__facts {
  display: grid;
  gap: 0;
  margin: 0;
  border: 1px solid rgba(17,17,17,0.07);
  border-radius: 10px;
  overflow: hidden;
}

.profile-order-detail__facts--wide {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.profile-order-detail__facts div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 9px 13px;
  border-bottom: 1px solid rgba(17,17,17,0.055);
}

.profile-order-detail__facts div:last-child {
  border-bottom: none;
  background: rgba(17,17,17,0.025);
}

.profile-order-detail__facts dt {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.profile-order-detail__facts dd {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
  min-width: 0;
  overflow-wrap: anywhere;
}

.profile-order-shipping-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  border: 1px solid rgba(17,17,17,0.07);
  border-radius: 10px;
  overflow: hidden;
}

.profile-order-shipping-title {
  font-size: 11px !important;
  font-weight: 700 !important;
  letter-spacing: 0.09em !important;
  text-transform: uppercase !important;
  color: var(--color-text-secondary) !important;
  margin: 0 !important;
}

.profile-order-shipping-card div {
  display: grid;
  gap: 3px;
  padding: 9px 13px;
  border-bottom: 1px solid rgba(17,17,17,0.055);
}

.profile-order-shipping-card div:last-child {
  border-bottom: none;
}

.profile-order-shipping-card__address,
.profile-order-shipping-card__note {
  grid-column: 1 / -1;
}

.profile-order-shipping-card dt {
  color: var(--color-text-secondary);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.profile-order-shipping-card dd {
  margin: 0;
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
}

.profile-order-detail__cancelled {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: 10px;
  background: rgba(254, 242, 242, 0.8);
  color: #dc2626;
}

.profile-order-detail__cancelled strong {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-order-detail__cancelled span,
.profile-order-detail__cancelled p {
  margin: 0;
  color: #991b1b;
  font-size: 12px;
  line-height: 1.5;
}

.profile-order-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.profile-order-detail__action {
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
}

.profile-order-detail__action:hover:not(:disabled) {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-order-detail__action--buy-again {
  border-color: #111111;
  background: #ffffff;
  color: #111111;
}

.profile-order-detail__action--buy-again:hover:not(:disabled) {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-order-detail__action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.profile-order-detail__action--primary {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-order-detail__action--primary:hover:not(:disabled) {
  background: #333333;
}

.profile-order-detail__items {
  padding: 0;
  border: 1px solid rgba(17,17,17,0.09);
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
}

.profile-order__status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 17, 17, 0.7);
  background: #ededed;
  line-height: 1.2;
}

.profile-order__status-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}

.profile-order__status-badge.is-completed,
.profile-order__status-badge.is-delivered {
  background: #dff3e4;
  color: #176b34;
}

.profile-order__status-badge.is-cancelled,
.profile-order__status-badge.is-delivery_failed,
.profile-order__status-badge.is-refunded {
  background: #fee2e2;
  color: #991b1b;
}

.profile-order__status-badge--payment {
  background: transparent;
  border: 1px solid #0f766e;
  color: #0f766e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.profile-order__status-badge--payment::before {
  content: none;
}

.profile-order__status-badge--danger {
  border-color: rgba(185, 28, 28, 0.28);
  background: rgba(185, 28, 28, 0.08);
  color: #b91c1c;
}

.profile-order-detail__cancelled {
  display: grid;
  gap: 4px;
  margin-top: 16px;
  padding: 14px;
  border: 1px solid rgba(185, 28, 28, 0.18);
  border-radius: 10px;
  background: rgba(185, 28, 28, 0.06);
  color: #b91c1c;
}

.profile-order-detail__cancelled strong {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.profile-order-detail__cancelled span,
.profile-order-detail__cancelled p {
  margin: 0;
  color: #991b1b;
  font-size: 12px;
  line-height: 1.5;
}

.profile-order__items {
  display: grid;
  gap: 0;
  padding: 0 20px;
}

.profile-empty {
  display: grid;
  gap: 14px;
  justify-items: start;
  padding: 42px 0;
}

.profile-empty h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0;
}

@media (max-width: 768px) {
  .profile-order-detail__grid,
  .profile-order-detail__facts--wide,
  .profile-order-shipping-card {
    grid-template-columns: 1fr;
  }

  .profile-order-detail__heading {
    display: grid;
    justify-items: start;
  }

  .profile-order-detail__aftercare-item {
    grid-template-columns: 60px minmax(0, 1fr);
  }

  .profile-order-detail__aftercare-media {
    width: 60px;
    height: 78px;
  }

  .profile-order-detail__aftercare-quantity {
    grid-column: 2;
    text-align: left;
    white-space: normal;
  }

  .profile-order-detail__aftercare-refund {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }
}
</style>
