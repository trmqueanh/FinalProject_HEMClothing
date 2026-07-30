<template>
  <!-- AdminDashboardHome: màn tổng quan Studio, nhận data từ AdminDashboard.vue và chỉ render dashboard. -->
  <section class="admin-stats">
    <article class="admin-stat-card admin-stat-card--money">
      <p>Total Sales</p>
      <strong>{{ dashboardMetric(metrics.revenue, 'currency') }}</strong>
    </article>

    <article class="admin-stat-card">
      <p>Total Orders</p>
      <strong>{{ dashboardMetric(metrics.orders) }}</strong>
    </article>

    <article class="admin-stat-card">
      <p>Total Customers</p>
      <strong>{{ dashboardMetric(metrics.users) }}</strong>
    </article>
  </section>

  <div class="admin-dashboard-main">
    <div class="admin-dashboard-charts">
      <article class="admin-panel">
        <div class="admin-panel__top">
          <div>
            <p class="admin-panel__eyebrow">Order Status</p>
          </div>
        </div>

        <div class="admin-status-overview">
          <div class="admin-pie-wrap">
            <svg
              class="admin-pie-svg"
              viewBox="-1 -1 2 2"
              xmlns="http://www.w3.org/2000/svg"
              @mouseleave="$emit('update-hovered-status', null)"
            >
              <template v-if="orderStatusSummary.length">
                <path
                  v-for="(slice, index) in pieSlices"
                  :key="slice.status"
                  :d="slice.path"
                  :fill="statusColor(index, slice.status)"
                  :opacity="hoveredStatus === null || hoveredStatus === index ? 1 : 0.55"
                  class="admin-pie-slice"
                  @mouseenter="$emit('update-hovered-status', index)"
                />
              </template>
              <circle v-else cx="0" cy="0" r="1" fill="#e5e7eb"/>
            </svg>

            <div
              v-if="hoveredStatus !== null && pieSlices[hoveredStatus]"
              class="admin-pie-tooltip"
              :style="{
                left: `calc(${(pieSlices[hoveredStatus].midX + 1) / 2 * 100}% )`,
                top:  `calc(${(pieSlices[hoveredStatus].midY + 1) / 2 * 100}% )`
              }"
            >
              <i :style="{ background: statusColor(hoveredStatus, pieSlices[hoveredStatus].status) }"></i>
              {{ formatLabel(pieSlices[hoveredStatus].status) }}:
              <strong>{{ pieSlices[hoveredStatus].count }}</strong>
            </div>
          </div>

          <div class="admin-status-list">
            <div
              v-if="orderStatusSummary.length"
              class="admin-status-list__header"
            >
              <span role="columnheader">Orders</span>
            </div>
            <p
              v-for="(item, index) in orderStatusSummary"
              :key="item.status"
              class="admin-status-row"
              @mouseenter="$emit('update-hovered-status', index)"
              @mouseleave="$emit('update-hovered-status', null)"
            >
              <i :style="{ background: statusColor(index, item.status) }"></i>
              <span>{{ formatLabel(item.status) }}</span>
              <strong>{{ item.count }}</strong>
              <em class="admin-status-pct">
                {{ orderStatusTotal > 0 ? Math.round(item.count / orderStatusTotal * 100) : 0 }}%
              </em>
            </p>
            <p v-if="!orderStatusSummary.length" class="admin-empty">No orders yet.</p>
          </div>
        </div>
      </article>

      <article class="admin-panel">
        <div class="admin-panel__top">
          <div>
            <p class="admin-panel__eyebrow">Revenue and Orders</p>
          </div>
          <select :value="dashboardYear" class="admin-range-select" aria-label="Choose dashboard year" @change="$emit('set-dashboard-year', Number($event.target.value))">
            <option v-for="year in dashboardYearOptions" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>

        <div v-if="chartPoints.length" class="admin-chart">
          <div class="admin-chart__header">
            <div class="admin-chart__legend">
              <span><i class="admin-chart__swatch admin-chart__swatch--revenue"></i> Revenue</span>
              <span><i class="admin-chart__swatch admin-chart__swatch--orders"></i> Orders</span>
            </div>
          </div>

          <div class="admin-chart__outer">
            <div
              v-if="chartHover"
              class="admin-chart__float-tip"
              :style="{ left: chartHover.x + 'px', top: chartHover.y + 'px' }"
            >
              <span class="admin-chart__tooltip-label">{{ chartHover.label }}</span>
              <span class="admin-chart__tooltip-row">
                <i class="admin-chart__swatch" :style="{ background: chartHover.color }"></i>
                {{ chartHover.type }}: <strong>{{ chartHover.value }}</strong>
              </span>
            </div>

            <div class="admin-chart__plot">
              <article
                v-for="(point, idx) in chartPoints"
                :key="point.month || point.day"
                class="admin-chart__column"
                :style="{ '--delay': `${idx * 60}ms` }"
              >
                <div class="admin-chart__bars">
                  <span
                    class="admin-chart__bar admin-chart__bar--revenue"
                    :style="{ '--h': `${point.revenueHeight}%` }"
                    @mouseenter="onBarHover($event, point.label, 'Revenue', formatCurrency(point.revenue), 'var(--accent)')"
                    @mouseleave="$emit('clear-chart-hover')"
                  ></span>
                  <span
                    class="admin-chart__bar admin-chart__bar--orders"
                    :style="{ '--h': `${point.orderHeight}%` }"
                    @mouseenter="onBarHover($event, point.label, 'Orders', point.orderCount, '#f59e0b')"
                    @mouseleave="$emit('clear-chart-hover')"
                  ></span>
                </div>
                <small>{{ point.label }}</small>
              </article>
            </div>
          </div>
        </div>

        <p v-else class="admin-empty">No order trend data yet.</p>
      </article>
    </div>

    <article class="admin-panel admin-dashboard-products">
      <div class="admin-panel__top">
        <div>
          <p class="admin-panel__eyebrow">Top Products</p>
        </div>
      </div>

      <div class="admin-rank-split">
        <section v-for="group in topProductGroups" :key="group.key" class="admin-rank-group">
          <p class="admin-rank-group__label">{{ group.label }}</p>
          <div class="admin-rank-list">
            <p v-for="(product, index) in group.items" :key="`${group.key}-${product.productId || product.productName}`">
              <span>{{ index + 1 }}</span>
              <strong>{{ product.productName }}</strong>
              <small>{{ product.quantitySold }} sold · {{ formatCurrency(product.revenue) }}</small>
            </p>
            <p v-if="!group.items.length" class="admin-empty">No {{ group.label.toLowerCase() }} best sellers yet.</p>
          </div>
        </section>
      </div>
    </article>
  </div>

  <section class="admin-panel">
    <div class="admin-panel__top">
      <div>
        <p class="admin-panel__eyebrow">Most Buyers</p>
      </div>
    </div>

    <div class="dashboard-table">
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Email</th>
            <th>Orders</th>
            <th>Total Spent</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="buyer in topBuyers" :key="buyer.id">
            <td>{{ buyer.name }}</td>
            <td>{{ buyer.email }}</td>
            <td>{{ buyer.orderCount }}</td>
            <td>{{ formatCurrency(buyer.totalSpent) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="!topBuyers.length" class="admin-empty">No buyer ranking yet.</p>
    </div>

    <nav v-if="topBuyersPagination.totalPages > 1" class="admin-pagination" aria-label="Most buyers pagination">
      <button type="button" :disabled="topBuyersPagination.page <= 1" @click="$emit('set-buyer-page', topBuyersPagination.page - 1)">
        Previous
      </button>
      <span>Page {{ topBuyersPagination.page }} of {{ topBuyersPagination.totalPages }}</span>
      <button
        type="button"
        :disabled="topBuyersPagination.page >= topBuyersPagination.totalPages"
        @click="$emit('set-buyer-page', topBuyersPagination.page + 1)"
      >
        Next
      </button>
    </nav>
  </section>

  <section class="admin-panel">
    <div class="admin-panel__top">
      <div>
        <p class="admin-panel__eyebrow">Recent Orders</p>
      </div>
    </div>

    <div class="dashboard-table">
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="order in recentOrders" :key="order.id">
            <td>#{{ shortOrderId(order.id) }}</td>
            <td>{{ order.customerName }}</td>
            <td>{{ formatDate(order.createdAt) }}</td>
            <td>{{ formatCurrency(order.totalAmount) }}</td>
            <td>
              <span class="status" :class="paymentStatusClass(order.paymentStatus)">
                {{ order.paymentStatus }}
              </span>
            </td>
            <td>
              <span class="status" :class="orderStatusClass(order.orderStatus)">
                {{ order.orderStatus }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!recentOrders.length" class="admin-empty">No order records yet.</p>
    </div>

    <nav v-if="recentOrdersPagination.totalPages > 1" class="admin-pagination" aria-label="Recent orders pagination">
      <button type="button" :disabled="recentOrdersPagination.page <= 1" @click="$emit('set-order-page', recentOrdersPagination.page - 1)">
        Previous
      </button>
      <span>Page {{ recentOrdersPagination.page }} of {{ recentOrdersPagination.totalPages }}</span>
      <button
        type="button"
        :disabled="recentOrdersPagination.page >= recentOrdersPagination.totalPages"
        @click="$emit('set-order-page', recentOrdersPagination.page + 1)"
      >
        Next
      </button>
    </nav>
  </section>
</template>

<script>
export default {
  name: 'AdminDashboardHome',
  emits: [
    'clear-chart-hover',
    'set-buyer-page',
    'set-dashboard-year',
    'set-order-page',
    'update-hovered-status'
  ],
  props: {
    chartHover: { type: Object, default: null },
    chartPoints: { type: Array, required: true },
    dashboardMetric: { type: Function, required: true },
    dashboardYear: { type: Number, required: true },
    dashboardYearOptions: { type: Array, required: true },
    formatCurrency: { type: Function, required: true },
    formatDate: { type: Function, required: true },
    formatLabel: { type: Function, required: true },
    hoveredStatus: { type: Number, default: null },
    metrics: { type: Object, required: true },
    onBarHover: { type: Function, required: true },
    orderStatusClass: { type: Function, required: true },
    orderStatusSummary: { type: Array, required: true },
    paymentStatusClass: { type: Function, required: true },
    pieSlices: { type: Array, required: true },
    recentOrders: { type: Array, required: true },
    recentOrdersPagination: { type: Object, required: true },
    shortOrderId: { type: Function, required: true },
    statusColor: { type: Function, required: true },
    topBuyers: { type: Array, required: true },
    topBuyersPagination: { type: Object, required: true },
    topProductsByGender: {
      type: Object,
      default: () => ({ women: [], men: [] })
    }
  },
  computed: {
    topProductGroups() {
      const women = Array.isArray(this.topProductsByGender.women) ? this.topProductsByGender.women.slice(0, 5) : [];
      const men = Array.isArray(this.topProductsByGender.men) ? this.topProductsByGender.men.slice(0, 5) : [];

      return [
        { key: 'women', label: 'Women', items: women },
        { key: 'men', label: 'Men', items: men }
      ];
    },
    orderStatusTotal() {
      return this.orderStatusSummary.reduce((sum, item) => sum + Number(item.count || 0), 0);
    }
  }
};
</script>
<style scoped src="./AdminDashboardHome.css"></style>
