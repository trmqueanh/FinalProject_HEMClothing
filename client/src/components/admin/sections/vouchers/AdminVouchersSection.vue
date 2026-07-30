<template>
  <!-- AdminVouchersSection: section UI được tách khỏi AdminDashboard.vue, logic dùng adminSectionProxy để giữ hành vi cũ. -->
  <section class="admin-panel">
            <div class="admin-panel__top">
              <div>
                <p class="admin-panel__eyebrow">Voucher Management</p>
                <h2>{{ voucherPagination.totalItems || filteredVouchers.length }} vouchers</h2>
              </div>

              <router-link to="/studio/vouchers/new" class="admin-hero__primary" @click="saveAdminListViewState('vouchers')">Create Voucher</router-link>
            </div>
  
            <div class="admin-toolbar">
              <input v-model="voucherSearch" type="text" placeholder="Search vouchers..." />
            </div>
  
            <div class="dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Minimum</th>
                    <th>Maximum</th>
                    <th>Validity</th>
                    <th>Usage</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="voucher in filteredVouchers"
                    :key="voucher.id"
                    :class="{ 'admin-return-focus': isAdminListFocus('vouchers', voucher.id) }"
                    :data-admin-focus-id="voucher.id"
                  >
                    <td>{{ voucher.code }}</td>
                    <td>{{ voucher.discountType === 'percent' ? `${voucher.discountValue}%` : formatCurrency(voucher.discountValue) }}</td>
                    <td>{{ formatCurrency(voucher.minOrderAmount) }}</td>
                    <td>{{ voucher.maxDiscountAmount === null ? 'No cap' : formatCurrency(voucher.maxDiscountAmount) }}</td>
                    <td>{{ formatDate(voucher.startDate) }} – {{ formatDate(voucher.endDate) }}</td>
                    <td>{{ voucher.usedCount }} / {{ voucher.usageLimit === null ? 'Unlimited' : voucher.usageLimit }}</td>
                    <td>
                      <span class="status" :class="voucher.status === 'active' ? 'status--completed' : 'status--pending'">
                        {{ formatLabel(voucher.status) }}
                      </span>
                    </td>
                    <td class="table-actions">
                      <button
                        type="button"
                        class="table-icon-btn table-icon-btn--status"
                        :class="{ 'is-active': voucher.status === 'active' }"
                        :title="voucher.status === 'active' ? 'Deactivate' : 'Activate'"
                        @click="toggleVoucherStatus(voucher)"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v10"/><path d="M6.4 5.6a8 8 0 1011.2 0"/></svg>
                      </button>
                      <router-link
                        :to="{ name: 'studio-voucher-edit', params: { id: voucher.id }, query: { returnFocus: voucher.id } }"
                        class="table-icon-btn table-icon-btn--edit"
                        title="Edit"
                        @click="saveAdminListViewState('vouchers')"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </router-link>
                      <button type="button" class="table-icon-btn table-icon-btn--danger" title="Archive" @click="archiveVoucher(voucher)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <p v-if="isSectionLoading('vouchers')" class="admin-empty">Loading vouchers...</p>
              <p v-else-if="!filteredVouchers.length" class="admin-empty">No vouchers matched your search.</p>
            </div>
  
            <nav v-if="voucherPagination.totalPages > 1" class="admin-pagination" aria-label="Admin voucher pagination">
              <button type="button" :disabled="voucherPagination.page <= 1" @click="setVoucherPage(voucherPagination.page - 1)">
                Previous
              </button>
              <span>Page {{ voucherPagination.page }} of {{ voucherPagination.totalPages }}</span>
              <button
                type="button"
                :disabled="voucherPagination.page >= voucherPagination.totalPages"
                @click="setVoucherPage(voucherPagination.page + 1)"
              >
                Next
              </button>
            </nav>
          </section>
</template>

<script>
import { createAdminSectionProxy } from '../adminSectionProxy';

export default createAdminSectionProxy('AdminVouchersSection');
</script>
<style scoped src="../adminSectionShared.css"></style>
