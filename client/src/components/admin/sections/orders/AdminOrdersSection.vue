<template>
  <!-- AdminOrdersSection: section UI được tách khỏi AdminDashboard.vue, logic dùng adminSectionProxy để giữ hành vi cũ. -->
  <section class="admin-panel">
            <div class="admin-panel__top">
              <div>
                <p class="admin-panel__eyebrow">Order Management</p>
              </div>
            </div>
  
            <section class="admin-stats admin-section-stats admin-section-stats--orders">
              <article
                v-for="card in orderStatCards"
                :key="card.key"
                class="admin-stat-card"
              >
                <p>{{ card.label }}</p>
                <strong>{{ card.value }}</strong>
              </article>
            </section>
  
            <div class="admin-toolbar">
              <input v-model="orderSearch" type="text" placeholder="Search by order id, customer, status, or payment..." />
              <select v-model="orderPaymentFilter" aria-label="Filter payment status">
                <option value="">Payment status</option>
                <option value="pending_payment">Pending payment</option>
                <option value="payment_under_review">Under review</option>
                <option value="paid">Paid</option>
                <option value="payment_expired">Payment expired</option>
                <option value="payment_cancelled">Payment cancelled</option>
                <option value="payment_rejected">Payment rejected</option>
                <option value="refund_pending">Refund pending</option>
                <option value="refunded">Refunded</option>
              </select>
              <select v-model="orderStatusFilter" aria-label="Filter order status">
                <option value="">Order status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipping">Shipping</option>
                <option value="delivery_failed">Delivery Failed</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Canceled</option>
              </select>
              <select v-model="orderDateRange" aria-label="Filter order date">
                <option value="">All time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
  
            <div class="dashboard-table admin-orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Order</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Order Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
  
                <tbody>
                  <tr
                    v-for="order in filteredOrders"
                    :key="order.id"
                    :class="{ 'admin-return-focus': isAdminListFocus('orders', order.id) }"
                    :data-admin-focus-id="order.id"
                  >
                    <td class="admin-orders-table__id" data-label="Order ID">#{{ shortOrderId(order.id) }}</td>
                    <td class="admin-orders-table__customer" data-label="Customer">
                      <strong>{{ order.customerName || 'Customer' }}</strong>
                    </td>
                    <td class="admin-orders-table__order" data-label="Order">
                      <div class="admin-order-summary">
                        <strong>{{ order.itemCount }} item{{ order.itemCount === 1 ? '' : 's' }}</strong>
                        <span v-if="orderTableProductSummary(order)">{{ orderTableProductSummary(order) }}</span>
                      </div>
                    </td>
                    <td class="admin-orders-table__total" data-label="Total">{{ formatCurrency(order.totalAmount) }}</td>
                    <td class="admin-orders-table__payment" data-label="Payment">
                      <span class="status" :class="paymentStatusClass(order.paymentStatus)">
                        {{ formatOrderPaymentStatus(order.paymentStatus) }}
                      </span>
                    </td>
                    <td class="admin-orders-table__status" data-label="Status">
                      <span class="status" :class="orderStatusClass(order.orderStatus)">
                        {{ formatLabel(order.orderStatus) }}
                      </span>
                    </td>
                    <td class="admin-orders-table__date" data-label="Date">{{ formatOrderTableDate(order.createdAt) }}</td>
                    <td class="table-actions admin-orders-table__actions" data-label="Actions">
                      <button
                        type="button"
                        class="table-action"
                        :disabled="isLoadingAdminOrderDetail"
                        @mouseenter="prefetchAdminOrderDetail(order)"
                        @focus="prefetchAdminOrderDetail(order)"
                        @click="openAdminOrderDetail(order)"
                      >
                        View Detail
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
  
              <p v-if="isSectionLoading('orders')" class="admin-empty">Loading orders...</p>
              <p v-else-if="!filteredOrders.length" class="admin-empty">No orders matched your search.</p>
            </div>
  
            <nav v-if="orderPagination.totalPages > 1" class="admin-pagination" aria-label="Admin order pagination">
              <button type="button" :disabled="orderPagination.page <= 1" @click="setOrderPage(orderPagination.page - 1)">
                Previous
              </button>
              <span>Page {{ orderPagination.page }} of {{ orderPagination.totalPages }}</span>
              <button
                type="button"
                :disabled="orderPagination.page >= orderPagination.totalPages"
                @click="setOrderPage(orderPagination.page + 1)"
              >
                Next
              </button>
            </nav>
          </section>
</template>

<script>
import { createAdminSectionProxy } from '../adminSectionProxy';

export default createAdminSectionProxy('AdminOrdersSection');
</script>
<style scoped src="../adminSectionShared.css"></style>
