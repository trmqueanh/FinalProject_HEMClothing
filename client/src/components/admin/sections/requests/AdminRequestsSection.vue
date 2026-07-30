<template>
  <section class="admin-panel admin-requests-section">
    <div class="admin-panel__top">
      <div>
        <p class="admin-panel__eyebrow">Workflow Inbox</p>
        <h2>Returns & System Refunds</h2>
      </div>
    </div>

    <div class="admin-requests-section__controls">
      <div class="admin-requests-tabs" role="tablist" aria-label="Request type">
        <button
          type="button"
          class="admin-requests-tabs__button"
          :class="{ 'admin-requests-tabs__button--active': requestPanelMode === 'returns' }"
          :aria-selected="requestPanelMode === 'returns'"
          role="tab"
          @click="setRequestPanelMode('returns')"
        >
          <span class="admin-requests-tabs__label">Returns</span>
          <span class="admin-requests-tabs__count">{{ returnRequests.length }}</span>
        </button>
        <button
          type="button"
          class="admin-requests-tabs__button"
          :class="{ 'admin-requests-tabs__button--active': requestPanelMode === 'refunds' }"
          :aria-selected="requestPanelMode === 'refunds'"
          role="tab"
          @click="setRequestPanelMode('refunds')"
        >
          <span class="admin-requests-tabs__label">Refunds</span>
          <span class="admin-requests-tabs__count">{{ refundRequests.length }}</span>
        </button>
      </div>

      <div class="admin-toolbar admin-requests-section__toolbar">
        <input
          v-model="requestSearch"
          type="search"
          placeholder="Search request, order code, or customer..."
          aria-label="Search return and refund requests"
        />
        <select
          v-if="requestPanelMode === 'returns'"
          v-model="returnRequestStatusFilter"
          aria-label="Filter return request status"
        >
          <option value="">All return requests</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="awaiting_return">Awaiting Return</option>
          <option value="rejected">Rejected</option>
          <option value="received">Received</option>
          <option value="inspecting">Inspecting</option>
          <option value="inspection_rejected">Inspection Rejected</option>
          <option value="refund_pending">Refund Pending</option>
          <option value="completed">Completed</option>
        </select>
        <select
          v-else
          v-model="refundRequestStatusFilter"
          aria-label="Filter refund request status"
        >
          <option value="">All system refunds</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="failed">Failed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>

    <template v-if="requestPanelMode === 'returns'">
      <div class="dashboard-table admin-requests-table">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Request</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="request in returnRequests"
              :key="request.id"
              :class="{ 'admin-return-focus': isAdminListFocus('requests', request.orderId) }"
              :data-admin-focus-id="request.orderId"
            >
              <td class="admin-requests-table__order">#{{ shortOrderId(request.orderId) }}</td>
              <td class="admin-requests-table__text">{{ request.customerName || 'Customer' }}</td>
              <td>
                <span class="admin-requests-table__line">{{ formatLabel(request.reason) }}</span>
              </td>
              <td>
                <span class="status" :class="requestStatusClass(request.returnStatus)">
                  {{ formatLabel(request.returnStatus) }}
                </span>
              </td>
              <td>{{ formatDate(request.requestedAt || request.createdAt) }}</td>
              <td class="table-actions">
                <button type="button" class="table-action" @click="openRequestOrderDetail(request)">
                  View Order Detail
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <p v-if="isSectionLoading('requests')" class="admin-empty">Loading requests...</p>
        <p v-else-if="!returnRequests.length" class="admin-empty">No return requests matched this filter.</p>
      </div>
    </template>

    <template v-else>
      <div class="dashboard-table admin-requests-table">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Source</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="request in refundRequests"
              :key="request.id"
              :class="{ 'admin-return-focus': isAdminListFocus('requests', request.orderId) }"
              :data-admin-focus-id="request.orderId"
            >
              <td class="admin-requests-table__order">#{{ shortOrderId(request.orderId) }}</td>
              <td class="admin-requests-table__text">{{ request.customerName || 'Customer' }}</td>
              <td>
                <span class="admin-requests-table__line admin-requests-table__line--reason">{{ formatLabel(request.refundType) }} · {{ request.refundCode }}</span>
              </td>
              <td class="admin-requests-table__amount">{{ formatCurrency(request.approvedAmount || request.requestedAmount) }}</td>
              <td>
                <span class="status" :class="requestStatusClass(request.status)">
                  {{ formatLabel(request.status) }}
                </span>
              </td>
              <td>{{ formatDate(request.createdAt) }}</td>
              <td class="table-actions">
                <button type="button" class="table-action" @click="openRequestOrderDetail(request)">
                  View Order Detail
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <p v-if="isSectionLoading('requests')" class="admin-empty">Loading requests...</p>
        <p v-else-if="!refundRequests.length" class="admin-empty">No system refunds matched this filter.</p>
      </div>
    </template>
  </section>
</template>

<script>
import { createAdminSectionProxy } from '../adminSectionProxy';

const proxy = createAdminSectionProxy('AdminRequestsSection');

export default {
  ...proxy,
  methods: {
    requestStatusClass(status) {
      const normalized = String(status || '').toLowerCase();

      if (['completed', 'received'].includes(normalized)) {
        return 'status--completed';
      }

      if (['approved', 'awaiting_return', 'inspecting', 'processing', 'refund_pending'].includes(normalized)) {
        return 'status--processing';
      }

      if (['rejected', 'failed'].includes(normalized)) {
        return 'status--danger';
      }

      return 'status--pending';
    }
  }
};
</script>

<style scoped src="../adminSectionShared.css"></style>
<style scoped>
.admin-requests-section__controls {
  display: grid;
  grid-template-columns: auto minmax(520px, 720px);
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
}

.admin-requests-tabs {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-md);
  background: #f8fafa;
}

.admin-requests-tabs__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-width: 126px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font);
  cursor: pointer;
  transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.admin-requests-tabs__button:hover {
  border-color: rgba(168, 139, 114, 0.16);
  background: rgba(168, 139, 114, 0.08);
  color: #7c634f;
}

.admin-requests-tabs__button--active {
  border-color: rgba(168, 139, 114, 0.32);
  background: #a88b72;
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(168, 139, 114, 0.22);
}

.admin-requests-tabs__label {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.admin-requests-tabs__count {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(168, 139, 114, 0.12);
  color: #6b5643;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
}

.admin-requests-tabs__button--active .admin-requests-tabs__count {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
}

.admin-requests-section__toolbar {
  display: grid;
  grid-template-columns: minmax(300px, 1fr) 260px;
  gap: 12px;
  width: 100%;
  margin: 0;
}

.admin-requests-section__toolbar input,
.admin-requests-section__toolbar select {
  width: 100%;
  min-width: 0;
}

.admin-requests-table table {
  min-width: 980px;
}

.admin-requests-table td {
  font-size: inherit;
  font-weight: 400;
  line-height: inherit;
}

.admin-requests-table__order {
  color: var(--text-primary);
  font-size: inherit;
  font-weight: inherit;
  white-space: nowrap;
}

.admin-requests-table__text,
.admin-requests-table__line {
  display: block;
  max-width: 280px;
  overflow: hidden;
  color: var(--text-primary);
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-requests-table__line--reason {
  max-width: 380px;
}

.admin-requests-table__amount {
  color: var(--text-primary);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.admin-requests-table .table-actions {
  justify-content: flex-start;
}

.admin-requests-table .table-action {
  min-width: 128px;
  border-radius: 999px;
}

@media (min-width: 1440px) {
  .admin-requests-section__controls {
    grid-template-columns: auto minmax(620px, 820px);
  }

  .admin-requests-section__toolbar {
    grid-template-columns: minmax(340px, 1fr) 280px;
  }

  .admin-requests-tabs__button {
    min-width: 138px;
    min-height: 44px;
    padding: 0 16px;
  }

  .admin-requests-tabs__label {
    font-size: 14px;
  }

  .admin-requests-tabs__count {
    min-width: 26px;
    height: 24px;
    font-size: 12px;
  }

  .admin-requests-section__toolbar select {
    min-width: 0;
    height: 44px;
    font-size: 15px;
  }

  .admin-requests-table__text,
  .admin-requests-table__line {
    max-width: 340px;
  }

  .admin-requests-table__line--reason {
    max-width: 460px;
  }

  .admin-requests-table .table-action {
    min-width: 146px;
    height: 36px;
    font-size: 13px;
  }
}

@media (min-width: 1920px) {
  .admin-requests-section__controls {
    grid-template-columns: auto minmax(720px, 940px);
    gap: 32px;
  }

  .admin-requests-section__toolbar {
    grid-template-columns: minmax(400px, 1fr) 320px;
    gap: 16px;
  }

  .admin-requests-table__text,
  .admin-requests-table__line {
    max-width: 380px;
  }

  .admin-requests-table__line--reason {
    max-width: 540px;
  }
}

@media (max-width: 1180px) {
  .admin-requests-section__controls {
    grid-template-columns: 1fr;
  }

  .admin-requests-section__toolbar {
    grid-template-columns: minmax(260px, 1fr) 260px;
  }
}

@media (max-width: 760px) {
  .admin-requests-section__controls,
  .admin-requests-section__toolbar,
  .admin-requests-section__toolbar select,
  .admin-requests-tabs {
    width: 100%;
  }

  .admin-requests-tabs__button {
    flex: 1;
    min-width: 0;
  }

  .admin-requests-section__toolbar {
    grid-template-columns: 1fr;
  }
}
</style>
