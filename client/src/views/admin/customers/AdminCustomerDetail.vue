<template>
  <div class="studio-page customer-detail-page">
    <header class="studio-page__header customer-detail-page__header">
      <router-link :to="customerBackTarget" class="studio-back">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back to Customers
      </router-link>

      <div class="customer-detail-page__header-copy">
        <span>Customer Detail</span>
        <strong>{{ customer ? `#${shortId(customer.id)}` : 'Loading customer...' }}</strong>
      </div>
    </header>

    <main class="studio-page__body customer-detail-page__body">
      <section v-if="isLoading" class="customer-detail-state" aria-live="polite">
        <strong>Loading customer profile</strong>
        <p>Collecting account and order information.</p>
      </section>

      <section v-else-if="!customer" class="customer-detail-state">
        <strong>Customer details are unavailable</strong>
        <p>{{ errorMessage }}</p>
        <router-link :to="customerBackTarget">Return to customer accounts</router-link>
      </section>

      <template v-else>
        <section class="customer-detail-hero">
          <div class="customer-detail-identity">
            <div>
              <p class="customer-detail-eyebrow">Customer account</p>
              <h1>{{ customerName }}</h1>
              <a :href="`mailto:${customer.email}`">{{ customer.email }}</a>
              <div class="customer-detail-badges">
                <span class="status" :class="customer.status === 'inactive' ? 'status--pending' : 'status--completed'">
                  {{ customer.status === 'inactive' ? 'Inactive' : 'Active' }}
                </span>
                <span class="status" :class="customer.emailVerified ? 'status--completed' : 'status--pending'">
                  {{ customer.emailVerified ? 'Email verified' : 'Email not verified' }}
                </span>
              </div>
            </div>
          </div>

          <dl class="customer-detail-membership">
            <div>
              <dt>Customer since</dt>
              <dd>{{ formatDate(customer.createdAt) }}</dd>
            </div>
            <div>
              <dt>Last order</dt>
              <dd>{{ formatDate(statistics.lastOrderAt, 'No orders yet') }}</dd>
            </div>
          </dl>
        </section>

        <section class="customer-order-overview" aria-label="Customer order overview">
          <article class="customer-detail-card customer-order-chart">
            <header>
              <h2>Order status</h2>
              <span class="customer-detail-card__meta">
                {{ isRefreshing && !orderStatusSummary.length ? 'Loading order data' : `${statistics.orderCount} total orders` }}
              </span>
            </header>

            <div v-if="isRefreshing && !orderStatusSummary.length" class="customer-detail-inline-loading">
              Loading order data...
            </div>
            <div v-else class="customer-order-chart__body">
              <div class="customer-order-pie">
                <svg
                  viewBox="-1 -1 2 2"
                  xmlns="http://www.w3.org/2000/svg"
                  @mouseleave="hoveredOrderStatus = null"
                >
                  <template v-if="orderStatusSummary.length">
                    <path
                      v-for="(slice, index) in orderPieSlices"
                      :key="slice.status"
                      :d="slice.path"
                      :fill="statusColor(index, slice.status)"
                      :opacity="hoveredOrderStatus === null || hoveredOrderStatus === index ? 1 : 0.5"
                      @mouseenter="hoveredOrderStatus = index"
                    />
                  </template>
                  <circle v-else cx="0" cy="0" r="1" fill="#e5e7eb"/>
                </svg>

                <div
                  v-if="hoveredOrderStatus !== null && orderPieSlices[hoveredOrderStatus]"
                  class="customer-order-pie__tooltip"
                  :style="{
                    left: `calc(${(orderPieSlices[hoveredOrderStatus].midX + 1) / 2 * 100}%)`,
                    top: `calc(${(orderPieSlices[hoveredOrderStatus].midY + 1) / 2 * 100}%)`
                  }"
                >
                  <i :style="{ background: statusColor(hoveredOrderStatus, orderPieSlices[hoveredOrderStatus].status) }"></i>
                  {{ formatLabel(orderPieSlices[hoveredOrderStatus].status) }}
                  <strong>{{ orderPieSlices[hoveredOrderStatus].count }}</strong>
                </div>
              </div>

              <div class="customer-order-legend">
                <p
                  v-for="(item, index) in orderStatusSummary"
                  :key="item.status"
                  @mouseenter="hoveredOrderStatus = index"
                  @mouseleave="hoveredOrderStatus = null"
                >
                  <i :style="{ background: statusColor(index, item.status) }"></i>
                  <span>{{ formatLabel(item.status) }}</span>
                  <strong>{{ item.count }}</strong>
                  <em>{{ orderStatusTotal ? Math.round(item.count / orderStatusTotal * 100) : 0 }}%</em>
                </p>
                <p v-if="!orderStatusSummary.length" class="customer-detail-empty">No orders yet.</p>
              </div>
            </div>
          </article>

          <div class="customer-order-metrics">
            <article>
              <span>Completed spend</span>
              <strong>{{ isRefreshing ? '—' : formatCurrency(statistics.totalSpent) }}</strong>
              <small>{{ isRefreshing ? 'Loading order data' : `${statistics.completedOrderCount} completed orders` }}</small>
            </article>
            <article>
              <span>Average order</span>
              <strong>{{ isRefreshing ? '—' : formatCurrency(statistics.averageOrderValue) }}</strong>
              <small>{{ isRefreshing ? 'Loading order data' : 'Across completed orders' }}</small>
            </article>
            <article>
              <span>Returns</span>
              <strong>{{ isRefreshing ? '—' : statistics.returnRequestCount }}</strong>
              <small>{{ isRefreshing ? 'Loading order data' : `${statistics.cancelledOrderCount} canceled orders` }}</small>
            </article>
          </div>
        </section>

        <section class="customer-detail-card customer-profile-card">
          <header>
            <h2>Profile information</h2>
          </header>

          <dl class="customer-detail-list">
            <div>
              <dt>Full name</dt>
              <dd>{{ customer.profile.fullName || customer.name || 'Not provided' }}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                <a v-if="customer.profile.phone" :href="`tel:${customer.profile.phone}`">
                  {{ customer.profile.phone }}
                </a>
                <span v-else>Not provided</span>
              </dd>
            </div>
            <div>
              <dt>Gender</dt>
              <dd>{{ formatLabel(customer.profile.gender) || 'Not provided' }}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>{{ formatDate(customer.profile.birthDate, 'Not provided', false) }}</dd>
            </div>
            <div>
              <dt>Account updated</dt>
              <dd>{{ formatDate(customer.updatedAt) }}</dd>
            </div>
          </dl>
        </section>

        <section class="customer-detail-card customer-orders-card">
          <header>
            <h2>Orders History</h2>
            <span class="customer-detail-card__count">{{ pagination.totalItems }}</span>
          </header>

          <div
            v-if="orders.length"
            class="dashboard-table customer-orders-table"
            :class="{ 'is-page-loading': isPageLoading }"
            :aria-busy="String(isPageLoading)"
          >
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th aria-label="Open order"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="order in orders"
                  :key="order.id"
                  :data-customer-order-id="order.id"
                  :class="{ 'is-return-focus': isFocusedOrder(order.id) }"
                >
                  <td><strong>#{{ shortId(order.id) }}</strong></td>
                  <td>{{ formatDate(order.createdAt) }}</td>
                  <td>{{ order.itemCount }}</td>
                  <td>
                    <span class="customer-order-payment">{{ paymentMethodLabel(order.paymentMethod) }}</span>
                    <span class="status" :class="paymentStatusClass(order.paymentStatus)">
                      {{ formatLabel(order.paymentStatus) }}
                    </span>
                  </td>
                  <td>
                    <span class="status" :class="orderStatusClass(order.orderStatus)">
                      {{ formatLabel(order.orderStatus) }}
                    </span>
                  </td>
                  <td><strong>{{ formatCurrency(order.totalAmount) }}</strong></td>
                  <td>
                    <router-link
                      :to="orderDetailRoute(order)"
                      class="customer-order-open"
                      :aria-label="`Open order ${shortId(order.id)}`"
                      @click="rememberCustomerOrderPosition(order.id)"
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                    </router-link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else-if="isRefreshing" class="customer-detail-empty">Loading order history...</p>
          <p v-else class="customer-detail-empty">This customer has not placed an order.</p>

          <nav v-if="pagination.totalPages > 1" class="customer-orders-pagination" aria-label="Customer order pagination">
            <button type="button" :disabled="pagination.page <= 1 || isPageLoading" @click="setOrderPage(pagination.page - 1)">
              Previous
            </button>
            <span>Page {{ pagination.page }} of {{ pagination.totalPages }}</span>
            <button type="button" :disabled="pagination.page >= pagination.totalPages || isPageLoading" @click="setOrderPage(pagination.page + 1)">
              Next
            </button>
          </nav>
        </section>
      </template>
    </main>
  </div>
</template>

<script>
import { adminOrderStatusColor, buildAdminPieSlices } from '../../../helpers/admin/adminChartPresentation';
import { adminOrderStatusClass, adminPaymentStatusClass } from '../../../helpers/admin/adminStatusPresentation';
import { formatVietnamDate } from '../../../helpers/dateTime';
import {
  fetchAdminCustomerDetail,
  fetchAdminCustomerOrders,
  readAdminCustomerDetail,
  readAdminCustomerSummary
} from '../../../stores/adminCustomerDetailStore';
import { formatCurrency } from '../../../utils/formatCurrency';

const EMPTY_STATISTICS = () => ({
  orderCount: 0,
  completedOrderCount: 0,
  cancelledOrderCount: 0,
  returnRequestCount: 0,
  totalSpent: 0,
  averageOrderValue: 0,
  lastOrderAt: null
});

export default {
  name: 'AdminCustomerDetailView',
  data() {
    const customerId = String(this.$route.params.customerId || '').trim();
    const page = Math.max(1, Number(this.$route.query.orderPage) || 1);
    const cachedDetail = readAdminCustomerDetail(customerId, page);
    const cachedCustomer = cachedDetail && cachedDetail.customer
      ? cachedDetail.customer
      : readAdminCustomerSummary(customerId);

    return {
      customer: cachedCustomer
        ? { ...cachedCustomer, profile: cachedCustomer.profile || {} }
        : null,
      errorMessage: '',
      hoveredOrderStatus: null,
      isLoading: !cachedCustomer,
      isRefreshing: Boolean(cachedCustomer && !(cachedDetail && cachedDetail.customer)),
      isPageLoading: false,
      orderStatusSummary: cachedDetail && Array.isArray(cachedDetail.orderStatusSummary)
        ? cachedDetail.orderStatusSummary
        : [],
      orders: cachedDetail && Array.isArray(cachedDetail.orders) ? cachedDetail.orders : [],
      pagination: {
        page,
        limit: 10,
        totalItems: 0,
        totalPages: 1,
        ...cachedDetail && cachedDetail.pagination
      },
      statistics: {
        ...EMPTY_STATISTICS(),
        ...cachedDetail && cachedDetail.statistics
      },
      customerCommerceSyncTimer: null,
      customerCommerceSyncInFlight: false
    };
  },
  computed: {
    customerBackTarget() {
      const query = this.$route.query || {};
      const wasOpenedFromCustomers = String(query.from || '') === 'customers';
      const returnFocus = String(query.returnFocus || '').trim();

      return {
        name: 'studio-customers',
        query: wasOpenedFromCustomers && returnFocus ? { focus: returnFocus } : {}
      };
    },
    customerName() {
      if (!this.customer) return 'Customer';
      return this.customer.profile.fullName || this.customer.name || 'Customer';
    },
    orderPieSlices() {
      return buildAdminPieSlices(this.orderStatusSummary);
    },
    orderStatusTotal() {
      return this.orderStatusSummary.reduce(
        (total, item) => total + Number(item.count || 0),
        0
      );
    }
  },
  mounted() {
    const cachedDetail = readAdminCustomerDetail(
      this.$route.params.customerId,
      this.pagination.page
    );
    this.loadCustomer({
      background: Boolean(this.customer),
      showRefreshing: !(cachedDetail && cachedDetail.customer),
      force: Boolean(cachedDetail && cachedDetail.customer)
    });
    window.addEventListener('focus', this.handleCustomerCommerceFocus);
    document.addEventListener('visibilitychange', this.handleCustomerCommerceVisibilityChange);
    this.startCustomerCommerceSync();
  },
  beforeUnmount() {
    this.stopCustomerCommerceSync();
    window.removeEventListener('focus', this.handleCustomerCommerceFocus);
    document.removeEventListener('visibilitychange', this.handleCustomerCommerceVisibilityChange);
  },
  methods: {
    formatCurrency,
    formatDate(value, fallback = 'No date', includeTime = true) {
      if (!value) return fallback;

      return formatVietnamDate(value, includeTime
        ? { dateStyle: 'medium', timeStyle: 'short' }
        : { dateStyle: 'medium' }, fallback);
    },
    formatLabel(value) {
      return String(value || '')
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    },
    async loadCustomer(options = {}) {
      const customerId = String(this.$route.params.customerId || '').trim();
      const pageOnly = Boolean(options.pageOnly);
      const page = Math.max(1, Number(options.page || this.pagination.page) || 1);
      const background = Boolean(options.background);

      if (pageOnly) {
        this.isPageLoading = true;
      } else if (!background) {
        this.isLoading = true;
        this.errorMessage = '';
      } else if (options.showRefreshing !== false) {
        this.isRefreshing = true;
      }

      const payload = await fetchAdminCustomerDetail(customerId, {
        page,
        limit: this.pagination.limit
      }, { force: Boolean(options.force) });

      if (!payload || !payload.customer) {
        if (!pageOnly) {
          this.customer = null;
          this.errorMessage = 'The account may no longer exist or the server could not return its details.';
        }
        this.isLoading = false;
        this.isRefreshing = false;
        this.isPageLoading = false;
        return;
      }

      this.applyCustomerPayload(payload);
      this.isLoading = false;
      this.isRefreshing = false;
      this.isPageLoading = false;
      await this.$nextTick();
      this.scrollToFocusedOrder();
    },
    async refreshCustomerCommerceSurface() {
      if (
        this.customerCommerceSyncInFlight ||
        this.isLoading ||
        this.isPageLoading ||
        (typeof document !== 'undefined' && document.hidden)
      ) return;

      this.customerCommerceSyncInFlight = true;
      try {
        await this.loadCustomer({
          background: true,
          showRefreshing: false,
          force: true
        });
      } finally {
        this.customerCommerceSyncInFlight = false;
      }
    },
    handleCustomerCommerceFocus() {
      this.refreshCustomerCommerceSurface();
    },
    handleCustomerCommerceVisibilityChange() {
      if (typeof document !== 'undefined' && !document.hidden) {
        this.refreshCustomerCommerceSurface();
      }
    },
    startCustomerCommerceSync() {
      this.stopCustomerCommerceSync();
      this.customerCommerceSyncTimer = window.setInterval(
        () => this.refreshCustomerCommerceSurface(),
        15000
      );
    },
    stopCustomerCommerceSync() {
      if (this.customerCommerceSyncTimer) window.clearInterval(this.customerCommerceSyncTimer);
      this.customerCommerceSyncTimer = null;
    },
    applyCustomerPayload(payload) {
      this.customer = {
        ...payload.customer,
        profile: payload.customer.profile || {}
      };
      this.statistics = {
        ...EMPTY_STATISTICS(),
        ...payload.statistics
      };
      this.orderStatusSummary = Array.isArray(payload.orderStatusSummary)
        ? payload.orderStatusSummary
        : [];
      this.orders = Array.isArray(payload.orders) ? payload.orders : [];
      this.pagination = {
        ...this.pagination,
        ...payload.pagination
      };
    },
    paymentStatusClass(value) {
      return adminPaymentStatusClass(value);
    },
    orderStatusClass(value) {
      return adminOrderStatusClass(value);
    },
    orderDetailRoute(order) {
      return {
        name: 'studio-order-detail',
        params: { orderId: order.id },
        query: {
          from: 'customer',
          customerId: this.customer.id,
          customerOrderPage: String(this.pagination.page),
          customerReturnFocus: String(this.$route.query.returnFocus || ''),
          customerFrom: String(this.$route.query.from || '')
        }
      };
    },
    rememberCustomerOrderPosition(orderId) {
      if (typeof window === 'undefined') return;

      try {
        window.sessionStorage.setItem('hem-admin-customer-order-return', JSON.stringify({
          customerId: String(this.$route.params.customerId || ''),
          orderId: String(orderId || ''),
          scrollY: window.scrollY
        }));
      } catch {
        // Navigation still falls back to the focused order row.
      }
    },
    paymentMethodLabel(value) {
      const method = String(value || '').toLowerCase();
      if (method === 'bank_transfer') return 'Bank transfer';
      if (method === 'cod') return 'Cash on delivery';
      return this.formatLabel(value) || 'Not provided';
    },
    async setOrderPage(page) {
      const nextPage = Math.min(
        Math.max(1, Number(page) || 1),
        this.pagination.totalPages || 1
      );

      if (nextPage === this.pagination.page) return;
      this.isPageLoading = true;
      await this.$router.replace({
        query: {
          ...this.$route.query,
          orderPage: String(nextPage),
          focusOrder: undefined
        }
      });
      const payload = await fetchAdminCustomerOrders(
        this.$route.params.customerId,
        { page: nextPage, limit: this.pagination.limit }
      );

      if (payload) {
        this.orders = Array.isArray(payload.orders) ? payload.orders : [];
        this.pagination = {
          ...this.pagination,
          ...payload.pagination
        };
      }
      this.isPageLoading = false;
    },
    isFocusedOrder(orderId) {
      return String(this.$route.query.focusOrder || '') === String(orderId || '');
    },
    scrollToFocusedOrder() {
      const focusedOrderId = String(this.$route.query.focusOrder || '').trim();

      if (!focusedOrderId || !this.$el) return;

      const target = [...this.$el.querySelectorAll('[data-customer-order-id]')]
        .find(element => element.getAttribute('data-customer-order-id') === focusedOrderId);

      const savedPosition = (() => {
        try {
          return JSON.parse(window.sessionStorage.getItem('hem-admin-customer-order-return') || 'null');
        } catch {
          return null;
        }
      })();

      if (
        savedPosition &&
        String(savedPosition.customerId || '') === String(this.$route.params.customerId || '') &&
        String(savedPosition.orderId || '') === focusedOrderId &&
        Number.isFinite(Number(savedPosition.scrollY))
      ) {
        window.scrollTo({ top: Number(savedPosition.scrollY), behavior: 'auto' });
      } else if (target) {
        target.scrollIntoView({ block: 'center' });
      }
    },
    shortId(value) {
      return String(value || '').slice(0, 8).toUpperCase();
    },
    statusColor(index, status) {
      return adminOrderStatusColor(status, index);
    }
  }
};
</script>

<style scoped src="@/assets/styles/admin/products/AdminCreateProduct.css"></style>
<style scoped src="@/components/admin/sections/adminSectionShared.css"></style>
<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

.customer-detail-page {
  --page-bg: #ffffff;
  --card-bg: #ffffff;
  --card-border: rgba(13, 59, 56, 0.08);
  --card-shadow: 0 1px 4px rgba(13, 59, 56, 0.06), 0 6px 20px rgba(13, 59, 56, 0.04);
  --text-primary: #0d1f1e;
  --text-secondary: #5c7472;
  --text-tertiary: #98b0ae;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --font: 'Plus Jakarta Sans', system-ui, sans-serif;

  background: var(--page-bg);
  color: var(--text-primary);
  font-family: var(--font);
}

.customer-detail-page__header {
  justify-content: space-between;
}

.customer-detail-page__header-copy {
  display: grid;
  justify-items: end;
  gap: 2px;
  margin-left: auto;
}

.customer-detail-page__header-copy span,
.customer-detail-eyebrow {
  margin: 0;
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.customer-detail-page__header-copy strong {
  color: var(--text-primary);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.customer-detail-page__body {
  display: grid;
  width: min(100%, 1480px);
  margin: 0 auto;
  gap: 22px;
}

.customer-detail-state {
  display: grid;
  justify-items: center;
  min-height: 420px;
  align-content: center;
  gap: 10px;
  border: 1px solid var(--card-border);
  border-radius: 14px;
  background: #ffffff;
  text-align: center;
}

.customer-detail-state strong {
  color: var(--text-primary);
  font-size: 18px;
}

.customer-detail-state p {
  max-width: 480px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.customer-detail-state a {
  color: #765f4c;
  font-size: 14px;
  font-weight: 700;
}

.customer-detail-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 30px;
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
}

.customer-detail-identity {
  min-width: 0;
}

.customer-detail-identity h1 {
  margin: 5px 0 4px;
  color: var(--text-primary);
  font-size: clamp(24px, 2.4vw, 36px);
  letter-spacing: -0.04em;
  line-height: 1;
}

.customer-detail-identity a,
.customer-detail-list a {
  color: var(--text-secondary);
  text-decoration: none;
}

.customer-detail-identity a:hover,
.customer-detail-list a:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

.customer-detail-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 13px;
}

.customer-detail-membership {
  display: grid;
  grid-template-columns: repeat(2, minmax(150px, 1fr));
  gap: 1px;
  margin: 0;
  background: var(--card-border);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  overflow: hidden;
}

.customer-detail-membership div {
  min-width: 0;
  padding: 16px 18px;
  background: #fbfbfa;
}

.customer-detail-membership dt,
.customer-detail-list dt {
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.customer-detail-membership dd,
.customer-detail-list dd {
  margin: 7px 0 0;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
}

.customer-order-overview {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  align-items: stretch;
  gap: 16px;
}

.customer-order-metrics {
  display: grid;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.customer-order-metrics article {
  display: grid;
  align-content: center;
  min-width: 0;
  gap: 6px;
  padding: 20px 22px;
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
}

.customer-order-metrics span {
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.customer-order-metrics strong {
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: clamp(22px, 1.8vw, 30px);
  letter-spacing: -0.04em;
  line-height: 1;
}

.customer-order-metrics small {
  color: var(--text-tertiary);
  font-size: 11px;
}

.customer-order-chart__body {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 20px;
  min-height: 200px;
  padding: 0 26px 24px;
}

.customer-detail-inline-loading {
  display: grid;
  flex: 1;
  min-height: 200px;
  place-items: center;
  padding: 24px 26px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.customer-order-pie {
  position: relative;
  width: 160px;
  height: 160px;
  flex: 0 0 160px;
}

.customer-order-pie svg {
  width: 100%;
  height: 100%;
  overflow: visible;
  border-radius: 50%;
  animation: customer-pie-in 500ms ease-out;
}

.customer-order-pie path {
  cursor: pointer;
  stroke: #ffffff;
  stroke-width: 0.015;
  transition: opacity 150ms ease, filter 150ms ease;
}

.customer-order-pie path:hover {
  filter: brightness(1.08);
}

.customer-order-pie__tooltip {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  transform: translate(-50%, -50%);
  border-radius: 8px;
  background: rgba(13, 31, 30, 0.9);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  pointer-events: none;
}

.customer-order-pie__tooltip i,
.customer-order-legend i {
  display: inline-block;
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  border-radius: 2px;
}

.customer-order-pie__tooltip strong {
  color: #ffffff;
}

.customer-order-legend {
  display: grid;
  flex: 1;
  gap: 3px;
}

.customer-order-legend > p:not(.customer-detail-empty) {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) 42px 48px;
  align-items: center;
  gap: 12px;
  min-height: 32px;
  margin: 0;
  padding: 5px 8px;
  border-radius: 7px;
  cursor: default;
}

.customer-order-legend > p:not(.customer-detail-empty):hover {
  background: #f8f8f7;
}

.customer-order-legend span {
  color: var(--text-secondary);
  font-size: 13px;
}

.customer-order-legend strong {
  color: var(--text-primary);
  font-size: 13px;
  text-align: right;
}

.customer-order-legend em {
  color: var(--text-secondary);
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
  text-align: right;
  width: 48px;
  padding: 2px 7px;
  border-radius: 99px;
  background: var(--accent-light);
  color: var(--accent);
}

.customer-detail-card {
  min-width: 0;
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--card-shadow);
  overflow: hidden;
}

.customer-order-chart {
  display: flex;
  flex-direction: column;
}

.customer-detail-card > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 64px;
  padding: 16px 26px;
  border-bottom: 0;
}

.customer-detail-card h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 16px;
  letter-spacing: -0.025em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-detail-card__meta {
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.customer-detail-card__count {
  display: grid;
  place-items: center;
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border-radius: 999px;
  background: #f2f1ee;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.customer-detail-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
}

.customer-detail-list div {
  min-width: 0;
  padding: 20px 24px;
  border-right: 1px solid var(--card-border);
  border-bottom: 1px solid var(--card-border);
}

.customer-detail-list div:nth-child(2n) {
  border-right: 0;
}

.customer-detail-list div:last-child {
  border-bottom: 0;
}

.customer-detail-list div:last-child:nth-child(odd) {
  grid-column: 1 / -1;
  border-right: 0;
}

.customer-detail-list dd {
  overflow-wrap: anywhere;
}

.customer-detail-empty {
  margin: 0;
  padding: 42px 24px;
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
}

.customer-orders-table {
  width: 100%;
  overflow-x: auto;
}

.customer-orders-table table {
  width: 100%;
  min-width: 900px;
  border-collapse: collapse;
}

.customer-orders-table td strong {
  color: var(--text-primary);
}

.customer-orders-table tbody tr:hover {
  background: #fcfbfa;
}

.customer-orders-table.is-page-loading tbody {
  opacity: 0.48;
}

.customer-orders-table tbody {
  transition: opacity 150ms ease;
}

.customer-orders-table tbody tr.is-return-focus {
  background: rgba(168, 139, 114, 0.13);
  box-shadow: inset 3px 0 0 var(--accent);
}

.customer-orders-table tbody tr.is-return-focus:hover {
  background: rgba(168, 139, 114, 0.18);
}

.customer-order-payment {
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary);
  font-weight: 600;
}

.customer-orders-table td small {
  display: block;
  margin-top: 3px;
  color: var(--text-tertiary);
}

.customer-order-open {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  margin-left: auto;
  border-radius: 8px;
  color: #765f4c;
  background: rgba(168, 139, 114, 0.12);
}

.customer-order-open:hover {
  color: #4f3d2f;
  background: rgba(168, 139, 114, 0.24);
}

.customer-order-open svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.customer-orders-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
}

.customer-orders-pagination button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--card-border);
  border-radius: 8px;
  background: #ffffff;
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
}

.customer-orders-pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.customer-orders-pagination span {
  color: var(--text-secondary);
  font-size: 12px;
}

@keyframes customer-pie-in {
  from {
    opacity: 0;
    transform: scale(0.86);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 980px) {
  .customer-detail-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .customer-detail-membership {
    width: 100%;
  }

  .customer-order-overview {
    grid-template-columns: 1fr;
  }

  .customer-order-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: none;
  }
}

@media (max-width: 620px) {
  .customer-detail-page__header-copy {
    display: none;
  }

  .customer-detail-page__body {
    gap: 14px;
  }

  .customer-detail-hero {
    padding: 22px;
  }

  .customer-detail-membership,
  .customer-detail-list {
    grid-template-columns: 1fr;
  }

  .customer-order-chart__body {
    align-items: stretch;
    flex-direction: column;
    min-height: 0;
    padding: 24px;
  }

  .customer-order-pie {
    width: 160px;
    height: 160px;
    flex-basis: 160px;
    align-self: center;
  }

  .customer-order-metrics {
    grid-template-columns: 1fr;
  }

  .customer-detail-list div,
  .customer-detail-list div:nth-child(2n),
  .customer-detail-list div:nth-last-child(-n + 2) {
    border-right: 0;
    border-bottom: 1px solid var(--card-border);
  }

  .customer-detail-list div:last-child {
    border-bottom: 0;
  }
}

@media (min-width: 1440px) {
  .customer-detail-page__body {
    gap: 26px;
  }

  .customer-detail-page__header-copy span,
  .customer-detail-eyebrow {
    font-size: 14px;
  }

  .customer-detail-page__header-copy strong {
    font-size: 16px;
  }

  .customer-detail-identity a {
    font-size: 15px;
  }

  .customer-detail-hero {
    padding: 34px;
  }

  .customer-detail-card__count {
    min-width: 34px;
    height: 34px;
    padding: 0 10px;
    font-size: 14px;
  }

  .customer-detail-card > header {
    min-height: 70px;
    padding: 18px 28px;
  }

  .customer-detail-card h2 {
    font-size: 18px;
  }

  .customer-detail-card__meta,
  .customer-order-metrics span,
  .customer-order-legend span,
  .customer-order-legend strong,
  .customer-detail-inline-loading,
  .customer-detail-empty {
    font-size: 15px;
  }

  .customer-detail-list div {
    padding: 24px 28px;
  }

  .customer-detail-membership dt,
  .customer-detail-list dt,
  .customer-order-metrics small,
  .customer-order-legend em,
  .customer-order-pie__tooltip,
  .customer-orders-table td small {
    font-size: 14px;
  }

  .customer-detail-membership dd,
  .customer-detail-list dd {
    font-size: 16px;
  }

  .customer-order-chart__body {
    min-height: 210px;
    gap: 24px;
    padding: 0 28px 26px;
  }

  .customer-order-legend > p:not(.customer-detail-empty) {
    grid-template-columns: 10px minmax(0, 1fr) 48px 56px;
    gap: 14px;
    min-height: 38px;
    padding: 6px 9px;
  }

  .customer-order-legend em {
    width: 56px;
    padding: 3px 8px;
  }

  .customer-order-metrics article {
    padding: 24px 26px;
  }

  .customer-order-metrics strong {
    font-size: 40px;
  }

  .customer-orders-pagination {
    gap: 14px;
    padding: 18px 22px;
  }

  .customer-orders-pagination button {
    min-height: 40px;
    padding: 0 16px;
    font-size: 14px;
  }

  .customer-orders-pagination span {
    font-size: 14px;
  }
}

@media (min-width: 1920px) {
  .customer-detail-page__body {
    width: min(100%, 1520px);
    gap: 30px;
  }

  .customer-detail-page__header-copy span,
  .customer-detail-eyebrow {
    font-size: 15px;
  }

  .customer-detail-page__header-copy strong {
    font-size: 20px;
  }

  .customer-detail-identity a {
    font-size: 16px;
  }

  .customer-detail-hero {
    padding: 40px;
  }

  .customer-detail-membership div {
    padding: 22px 24px;
  }

  .customer-detail-card__count {
    min-width: 36px;
    height: 36px;
    padding: 0 11px;
    font-size: 15px;
  }

  .customer-detail-card > header {
    min-height: 74px;
    padding: 20px 30px;
  }

  .customer-order-metrics small,
  .customer-detail-membership dt,
  .customer-detail-list dt,
  .customer-order-legend em,
  .customer-order-pie__tooltip,
  .customer-orders-table td small {
    font-size: 15px;
  }

  .customer-detail-membership dd,
  .customer-detail-list dd {
    font-size: 16px;
  }

  .customer-detail-card__meta,
  .customer-order-metrics span,
  .customer-order-legend span,
  .customer-order-legend strong,
  .customer-detail-inline-loading,
  .customer-detail-empty {
    font-size: 16px;
  }

  .customer-order-chart__body {
    min-height: 220px;
    gap: 26px;
    padding: 0 30px 28px;
  }

  .customer-order-legend > p:not(.customer-detail-empty) {
    grid-template-columns: 10px minmax(0, 1fr) 52px 60px;
    gap: 15px;
    min-height: 40px;
  }

  .customer-order-legend em {
    width: 60px;
  }

  .customer-order-metrics article {
    min-height: 0;
    padding: 30px 32px;
  }

  .customer-order-metrics strong {
    font-size: 44px;
  }

  .customer-detail-card h2 {
    font-size: 20px;
  }

  .customer-orders-pagination button {
    min-height: 42px;
    padding: 0 18px;
    font-size: 15px;
  }

  .customer-orders-pagination span {
    font-size: 15px;
  }
}
</style>
