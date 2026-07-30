<template>
  <section class="profile-panel">
    <div class="profile-panel__top">
      <div>
        <p class="eyebrow">Orders</p>
        <h1>Your orders</h1>
      </div>
      <span v-if="pagination.totalItems" class="profile-panel__count">
        {{ pagination.totalItems }} order{{ pagination.totalItems === 1 ? '' : 's' }}
      </span>
    </div>

    <div class="profile-order-search">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4.2-4.2" />
      </svg>
      <input :value="orderSearch" type="search" placeholder="Search by order, status, payment, address, or date" @input="$emit('update-order-search', $event.target.value.trim())" />
    </div>

    <div class="profile-order-tabs" role="tablist" aria-label="Filter orders by status">
      <button
        v-for="tab in statusTabs"
        :key="tab.value"
        type="button"
        role="tab"
        class="profile-order-tabs__button"
        :class="{ 'profile-order-tabs__button--active': activeStatusTab === tab.value }"
        :aria-selected="activeStatusTab === tab.value ? 'true' : 'false'"
        :tabindex="activeStatusTab === tab.value ? 0 : -1"
        @click="$emit('select-status-tab', tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="isLoading" class="profile-empty">
      Loading orders...
    </div>

    <template v-else>
      <div v-if="!orders.length && !orderSearch && activeStatusTab === 'all'" class="profile-empty">
        <h3>No orders yet.</h3>
        <p>Your placed orders will appear here after checkout.</p>
        <router-link to="/women" class="primary-button">Continue shopping</router-link>
      </div>

      <template v-else>
        <div v-if="!orders.length" class="profile-empty">
          <h3>No orders in this section yet.</h3>
          <p>Try another order ID, product name, status, address, or purchase date.</p>
          <button v-if="orderSearch" type="button" class="ghost-button" @click="$emit('clear-search')">Clear search</button>
        </div>

        <div v-else class="profile-orders profile-orders--list">
          <article v-for="order in orders" :key="order.id" class="profile-order profile-order--summary">
            <div class="profile-order__head">
              <div class="profile-order__head-left">
                <span class="profile-order__id">Order #{{ shortId(order.id) }}</span>
                <span class="profile-order__date">{{ formatDate(order.createdAt) }}</span>
              </div>
              <div class="profile-order__head-right">
                <span v-if="requestStatusLabel(order)" class="profile-order__request-badge">
                  {{ requestStatusLabel(order) }}
                </span>
                <span class="profile-order__status-badge" :class="[orderStatusBadgeClass(order.orderStatus), `is-${order.orderStatus}`]">
                  {{ formatLabel(order.orderStatus) }}
                </span>
              </div>
            </div>

            <BankTransferPaymentNotice :order="order" compact />

            <div v-if="order.items && order.items.length" class="profile-order__items profile-order__items--summary">
              <OrderLineItem
                v-for="item in visibleOrderItems(order)"
                :key="item.id"
                :item="item"
                :order="order"
                variant="summary"
                :format-currency="formatCurrency"
                :product-link="productLink"
                :item-price="itemPrice"
                :price-label="priceLabel"
              />

              <button
                v-if="order.items.length > 1"
                type="button"
                class="profile-order__items-toggle"
                :aria-expanded="isOrderExpanded(order.id) ? 'true' : 'false'"
                @click="toggleOrderItems(order.id)"
              >
                {{ isOrderExpanded(order.id) ? 'Show less' : `View more (${order.items.length - 1})` }}
              </button>
            </div>

            <div class="profile-order__summary">
              <span>
                Total ({{ orderItemCount(order) }} item{{ orderItemCount(order) === 1 ? '' : 's' }}):
              </span>
              <strong>{{ formatCurrency(order.totalAmount) }}</strong>
            </div>

            <div class="profile-order__actions">
              <button
                v-if="canCancelOrder(order)"
                type="button"
                class="profile-order__action profile-order__action--danger"
                @click="$emit('cancel-order', order)"
              >
                Cancel Order
              </button>
              <button
                v-if="canConfirmReceived(order)"
                type="button"
                class="profile-order__action profile-order__action--primary"
                @click="$emit('confirm-received', order)"
              >
                Confirm Received
              </button>
              <button type="button" class="profile-order__action profile-order__action--secondary" @click="$emit('view-detail', order)">
                View Detail
              </button>
            </div>
          </article>

          <nav v-if="pagination.totalPages > 1" class="profile-orders-pagination" aria-label="Order pagination">
            <button
              type="button"
              :disabled="pagination.page <= 1 || isLoading"
              @click="$emit('set-page', pagination.page - 1)"
            >
              Previous
            </button>
            <span>Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
            <button
              type="button"
              :disabled="pagination.page >= pagination.totalPages || isLoading"
              @click="$emit('set-page', pagination.page + 1)"
            >
              Next
            </button>
          </nav>
        </div>
      </template>
    </template>
  </section>
</template>

<script>
import BankTransferPaymentNotice from './BankTransferPaymentNotice.vue';
import OrderLineItem from './OrderLineItem.vue';

export default {
  name: 'OrdersList',
  components: {
    BankTransferPaymentNotice,
    OrderLineItem
  },
  data() {
    return {
      expandedOrderIds: {}
    };
  },
  props: {
    orders: {
      type: Array,
      default: () => []
    },
    orderSearch: {
      type: String,
      default: ''
    },
    statusTabs: {
      type: Array,
      default: () => []
    },
    activeStatusTab: {
      type: String,
      default: 'all'
    },
    pagination: {
      type: Object,
      default: () => ({
        page: 1,
        totalItems: 0,
        totalPages: 1
      })
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    shortId: {
      type: Function,
      required: true
    },
    formatDate: {
      type: Function,
      required: true
    },
    formatCurrency: {
      type: Function,
      required: true
    },
    formatLabel: {
      type: Function,
      required: true
    },
    orderStatusBadgeClass: {
      type: Function,
      required: true
    },
    productLink: {
      type: Function,
      required: true
    },
    itemPrice: {
      type: Function,
      required: true
    },
    priceLabel: {
      type: Function,
      required: true
    },
    canCancelOrder: {
      type: Function,
      required: true
    },
    canConfirmReceived: {
      type: Function,
      required: true
    }
  },
  methods: {
    requestStatusLabel(order) {
      if (order && order.returnRequest) {
        return `Return ${this.formatLabel(order.returnRequest.returnStatus)}`;
      }

      if (order && order.refundRequest) {
        return `Refund ${this.formatLabel(order.refundRequest.status)}`;
      }

      return '';
    },
    isOrderExpanded(orderId) {
      return Boolean(this.expandedOrderIds[orderId]);
    },
    toggleOrderItems(orderId) {
      this.expandedOrderIds = {
        ...this.expandedOrderIds,
        [orderId]: !this.isOrderExpanded(orderId)
      };
    },
    visibleOrderItems(order) {
      const items = Array.isArray(order && order.items) ? order.items : [];
      return this.isOrderExpanded(order && order.id) ? items : items.slice(0, 1);
    },
    orderItemCount(order) {
      const itemCount = Number(order && order.itemCount);

      if (Number.isFinite(itemCount) && itemCount > 0) {
        return itemCount;
      }

      return (order && Array.isArray(order.items) ? order.items : [])
        .reduce((total, item) => total + Math.max(1, Number(item.quantity) || 1), 0);
    }
  },
  emits: [
    'update-order-search',
    'select-status-tab',
    'clear-search',
    'cancel-order',
    'confirm-received',
    'view-detail',
    'set-page'
  ]
};
</script>

<style scoped>
.profile-panel {
  display: grid;
  gap: 32px;
}

.profile-panel__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.10);
}

.profile-panel__top h1 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: 0;
  text-transform: none;
}

.profile-panel__count {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.profile-panel__top .eyebrow {
  display: none;
}

.profile-order-tabs {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 1px;
  border-bottom: 1px solid rgba(17, 17, 17, 0.10);
  scrollbar-width: none;
}

.profile-order-tabs::-webkit-scrollbar {
  display: none;
}

.profile-order-tabs__button {
  position: relative;
  flex: 1 0 auto;
  min-height: 42px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: color 150ms ease;
}

.profile-order-tabs__button::after {
  content: '';
  position: absolute;
  right: 14px;
  bottom: -1px;
  left: 14px;
  height: 2px;
  background: #111111;
  transform: scaleX(0);
  transition: transform 150ms ease;
}

.profile-order-tabs__button:hover,
.profile-order-tabs__button--active {
  color: var(--color-text-primary);
}

.profile-order-tabs__button--active {
  font-weight: 700;
}

.profile-order-tabs__button--active::after {
  transform: scaleX(1);
}

.profile-order-tabs__button:focus-visible {
  outline: 2px solid #111111;
  outline-offset: -3px;
}

/* ── Empty states ──────────────────────────────── */
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

/* ── Search bar ────────────────────────────────── */
.profile-order-search {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border: none;
  border-bottom: 1.5px solid rgba(17, 17, 17, 0.12);
  background: transparent;
  transition: border-color 0.18s ease;
}

.profile-order-search:focus-within {
  border-color: rgba(17, 17, 17, 0.5);
}

.profile-order-search svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  color: var(--color-text-secondary);
}

.profile-order-search input {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--color-text-primary);
  font: inherit;
  font-size: 14px;
  outline: none;
}

.profile-order-search input::placeholder {
  color: var(--color-text-secondary);
}

/* ── Order list ────────────────────────────────── */
.profile-orders {
  display: grid;
  gap: 12px;
}

.profile-order {
  display: grid;
  gap: 0;
  border: 1px solid rgba(17, 17, 17, 0.09);
  border-radius: 12px;
  background: var(--color-bg-page);
  overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.profile-order:hover {
  border-color: rgba(17, 17, 17, 0.18);
  box-shadow: 0 4px 16px rgba(17, 17, 17, 0.06);
}

/* ── Order header ──────────────────────────────── */
.profile-order__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: rgba(17, 17, 17, 0.02);
  border-bottom: 1px solid rgba(17, 17, 17, 0.07);
}

.profile-order__head-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.profile-order__id {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.profile-order__date {
  font-size: 18px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* separator dots between head-left items */
.profile-order__head-left > span + span::before {
  content: '·';
  margin-right: 10px;
  color: var(--color-text-secondary);
  opacity: 0.4;
}

.profile-order__head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.profile-order__request-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 10px;
  border: 1px solid rgba(154, 106, 19, 0.28);
  border-radius: 999px;
  background: rgba(240, 190, 88, 0.14);
  color: #7b5310;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

/* ── Status badges ─────────────────────────────── */
.profile-order__status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 3px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 17, 17, 0.7);
  background: #ededed;
  line-height: 1.2;
  white-space: nowrap;
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

.profile-order__status-badge--danger {
  border-color: rgba(185, 28, 28, 0.22);
  background: rgba(185, 28, 28, 0.07);
  color: #b91c1c;
}

/* ── Line items ────────────────────────────────── */
.profile-order__items {
  display: grid;
  gap: 0;
  padding: 0 18px;
}

.profile-order__items--summary {
  padding-top: 2px;
  padding-bottom: 2px;
}

.profile-order__items-toggle {
  justify-self: start;
  margin: 0 0 12px;
  padding: 0;
  border: 0;
  border-bottom: 1px solid currentColor;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: color 150ms ease;
}

.profile-order__items-toggle:hover {
  color: var(--color-text-primary);
}

.profile-order__items-toggle:focus-visible {
  outline: 2px solid #111111;
  outline-offset: 3px;
}

.profile-order__summary {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid rgba(17, 17, 17, 0.07);
  color: var(--color-text-secondary);
  font-size: 13px;
}

.profile-order__summary strong {
  color: var(--color-text-primary);
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ── Action footer ─────────────────────────────── */
.profile-order__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid rgba(17, 17, 17, 0.07);
  background: rgba(17, 17, 17, 0.01);
}

.profile-order__action {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease, opacity 150ms ease;
}

.profile-order__action--primary {
  background: transparent;
  border-color: #111111;
  color: var(--color-text-primary);
}

.profile-order__action--primary:hover {
  background: #111111;
  border-color: #111111;
  color: #ffffff;
}

.profile-order__action--secondary {
  background: transparent;
  border-color: rgba(17, 17, 17, 0.18);
  color: var(--color-text-primary);
}

.profile-order__action--secondary:hover {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-order__action--danger {
  background: transparent;
  border-color: rgba(185, 28, 28, 0.3);
  color: #b91c1c;
}

.profile-order__action--danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
  color: #ffffff;
}

/* ── Pagination ────────────────────────────────── */
.profile-orders-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding-top: 8px;
}

.profile-orders-pagination button {
  display: inline-flex;
  align-items: center;
  height: 34px;
  padding: 0 16px;
  border: 1px solid rgba(17, 17, 17, 0.14);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
}

.profile-orders-pagination button:hover:not(:disabled) {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-orders-pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}

.profile-empty .primary-button,
.profile-empty .ghost-button {
  border: 1px solid rgba(17, 17, 17, 0.18);
  background: transparent;
  color: var(--color-text-primary);
}

.profile-empty .primary-button:hover,
.profile-empty .ghost-button:hover {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.profile-orders-pagination span {
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
}

/* ── Mobile ────────────────────────────────────── */
@media (max-width: 768px) {
  .profile-panel__top h1 {
    font-size: 18px;
  }

  .profile-order__head {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .profile-order__head-right {
    justify-content: flex-start;
  }

  .profile-order__actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
