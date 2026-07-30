<template>
  <!-- AdminAccountsSection: section UI được tách khỏi AdminDashboard.vue, logic dùng adminSectionProxy để giữ hành vi cũ. -->
  <section class="admin-accounts-space">
            <div class="admin-panel__top">
              <div>
                <p class="admin-panel__eyebrow">Account Management</p>
                <h2>{{ accountSummary.total }} accounts</h2>
              </div>
            </div>
  
            <section class="admin-stats admin-stats--small">
              <article class="admin-stat-card">
                <p>Total Accounts</p>
                <strong>{{ accountSummary.total }}</strong>
              </article>
  
              <article class="admin-stat-card">
                <p>Admins</p>
                <strong>{{ accountSummary.admins }}</strong>
              </article>
  
              <article class="admin-stat-card">
                <p>Customers</p>
                <strong>{{ accountSummary.users }}</strong>
              </article>
            </section>
  
            <div class="admin-toolbar">
              <input v-model="accountSearch" type="text" placeholder="Search accounts..." />
              <select v-model="accountDateRange" aria-label="Filter account date">
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
  
            <section class="admin-panel">
              <div class="admin-panel__top">
                <div>
                  <p class="admin-panel__eyebrow">Admin</p>
                </div>
              </div>
              <div class="dashboard-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="account in adminAccounts" :key="account.id">
                      <td>#{{ shortOrderId(account.id) }}</td>
                      <td>{{ account.name }}</td>
                      <td>{{ account.email }}</td>
                      <td><span class="status status--danger">Master Admin</span></td>
                      <td>{{ formatDate(account.createdAt) }}</td>
                      <td>
                        <span class="status" :class="account.status === 'inactive' ? 'status--pending' : 'status--completed'">
                          {{ account.status === 'inactive' ? 'Inactive' : 'Active' }}
                        </span>
                      </td>
                      <td class="table-actions">
                        <button
                          type="button"
                          class="table-icon-btn table-icon-btn--status"
                          :class="{ 'is-active': account.status !== 'inactive' }"
                          :disabled="String(currentUser.id) === String(account.id)"
                          :title="String(currentUser.id) === String(account.id) ? 'You cannot change your own status' : account.status === 'inactive' ? 'Activate account' : 'Deactivate account'"
                          @click="requestToggleAccountStatus(account)"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v10"/><path d="M6.4 5.6a8 8 0 1011.2 0"/></svg>
                        </button>
                        <button
                          type="button"
                          class="table-icon-btn table-icon-btn--danger"
                          :disabled="String(currentUser.id) === String(account.id)"
                          :title="String(currentUser.id) === String(account.id) ? 'You cannot delete your own account' : 'Delete account'"
                          @click="requestDeleteAccount(account)"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p v-if="isSectionLoading('accounts')" class="admin-empty">Loading admin accounts...</p>
                <p v-else-if="!adminAccounts.length" class="admin-empty">No admin accounts matched your search.</p>
              </div>
              <nav v-if="adminAccountPagination.totalPages > 1" class="admin-pagination" aria-label="Admin account pagination">
                <button type="button" :disabled="adminAccountPagination.page <= 1" @click="setAdminAccountPage(adminAccountPagination.page - 1)">Previous</button>
                <span>Page {{ adminAccountPagination.page }} of {{ adminAccountPagination.totalPages }}</span>
                <button type="button" :disabled="adminAccountPagination.page >= adminAccountPagination.totalPages" @click="setAdminAccountPage(adminAccountPagination.page + 1)">Next</button>
              </nav>
            </section>
  
            <section class="admin-panel">
              <div class="admin-panel__top">
                <div>
                  <p class="admin-panel__eyebrow">Customer</p>
                </div>
              </div>
              <div class="dashboard-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Users</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="account in customerAccounts"
                      :key="account.id"
                      :class="{ 'admin-return-focus': isAdminListFocus('accounts', account.id) }"
                      :data-admin-focus-id="account.id"
                    >
                      <td>#{{ shortOrderId(account.id) }}</td>
                      <td>{{ account.name }}</td>
                      <td>{{ account.email }}</td>
                      <td>
                        <span class="status" :class="account.status === 'inactive' ? 'status--pending' : 'status--completed'">
                          {{ account.status === 'inactive' ? 'Inactive' : 'Active' }}
                        </span>
                      </td>
                      <td>{{ formatDate(account.createdAt) }}</td>
                      <td class="table-actions">
                        <router-link
                          :to="{
                            name: 'studio-customer-detail',
                            params: { customerId: account.id },
                            query: { from: 'customers', returnFocus: account.id }
                          }"
                          class="table-icon-btn table-icon-btn--view"
                          title="View customer details"
                          :aria-label="`View details for ${account.name || account.email}`"
                          @mouseenter="prefetchAdminCustomerDetail(account)"
                          @focus="prefetchAdminCustomerDetail(account)"
                          @click="saveAdminListViewState('accounts')"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </router-link>
                        <button
                          type="button"
                          class="table-icon-btn table-icon-btn--status"
                          :class="{ 'is-active': account.status !== 'inactive' }"
                          :title="account.status === 'inactive' ? 'Activate account' : 'Deactivate account'"
                          @click="requestToggleAccountStatus(account)"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v10"/><path d="M6.4 5.6a8 8 0 1011.2 0"/></svg>
                        </button>
                        <button type="button" class="table-icon-btn table-icon-btn--danger" title="Delete account" @click="requestDeleteAccount(account)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p v-if="isSectionLoading('accounts')" class="admin-empty">Loading customer accounts...</p>
                <p v-else-if="!customerAccounts.length" class="admin-empty">No customer accounts matched your search.</p>
              </div>
              <nav v-if="customerAccountPagination.totalPages > 1" class="admin-pagination" aria-label="Customer account pagination">
                <button type="button" :disabled="customerAccountPagination.page <= 1" @click="setCustomerAccountPage(customerAccountPagination.page - 1)">Previous</button>
                <span>Page {{ customerAccountPagination.page }} of {{ customerAccountPagination.totalPages }}</span>
                <button type="button" :disabled="customerAccountPagination.page >= customerAccountPagination.totalPages" @click="setCustomerAccountPage(customerAccountPagination.page + 1)">Next</button>
              </nav>
            </section>
          </section>
</template>

<script>
import { createAdminSectionProxy } from '../adminSectionProxy';

export default createAdminSectionProxy('AdminAccountsSection');
</script>
<style scoped src="../adminSectionShared.css"></style>
