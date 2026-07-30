<template>
  <!-- AdminInventoryHistoryDialog: dialog UI được tách khỏi AdminDashboard.vue, logic vẫn proxy về view cha. -->
  <transition name="admin-confirm">
        <div v-if="selectedInventoryHistory || isLoadingInventoryHistory" class="admin-confirm-backdrop" @click.self="closeInventoryHistory">
          <section class="admin-confirm-dialog admin-inventory-history-dialog" role="dialog" aria-modal="true" aria-labelledby="inventory-history-title">
            <div class="admin-order-detail-dialog__head">
              <div>
                <p class="admin-panel__eyebrow">Stock History</p>
                <h2 id="inventory-history-title">
                  {{ selectedInventoryHistory && selectedInventoryHistory.variant ? selectedInventoryHistory.variant.productName : 'Loading history...' }}
                </h2>
                <span v-if="selectedInventoryHistory && selectedInventoryHistory.variant" class="admin-inventory-history-dialog__meta">
                  {{ selectedInventoryHistory.variant.colorName }} / {{ selectedInventoryHistory.variant.sizeLabel }} · Product code: {{ selectedInventoryHistory.variant.productCode || '-' }}
                </span>
              </div>
              <button type="button" class="admin-confirm-dialog__ghost" @click="closeInventoryHistory">Close</button>
            </div>
  
            <p v-if="isLoadingInventoryHistory" class="admin-empty">Loading stock history...</p>
            <div v-else class="dashboard-table">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Movement Type</th>
                    <th>Quantity change</th>
                    <th>Old stock</th>
                    <th>New stock</th>
                    <th>Note</th>
                    <th>Created by</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in selectedInventoryHistory.items" :key="entry.id">
                    <td>{{ formatDate(entry.createdAt) }}</td>
                    <td>{{ formatInventoryMovementType(entry.movementType) }}</td>
                    <td>
                      <span class="stock-change" :class="inventoryChangeClass(entry)">
                        {{ formatInventoryQuantityChange(entry) }}
                      </span>
                    </td>
                    <td>{{ entry.oldStock === null ? '-' : entry.oldStock }}</td>
                    <td>{{ entry.newStock === null ? '-' : entry.newStock }}</td>
                    <td>{{ entry.note || '-' }}</td>
                    <td>{{ entry.createdBy || '-' }}</td>
                  </tr>
                </tbody>
              </table>
              <p v-if="!selectedInventoryHistory.items.length" class="admin-empty">No stock movement history for this variant yet.</p>
            </div>
          </section>
        </div>
      </transition>
</template>

<script>
import { createAdminSectionProxy } from '../sections/adminSectionProxy';

export default createAdminSectionProxy('AdminInventoryHistoryDialog');
</script>

<style scoped>
/* Admin dialog shell: CSS của lớp modal chung cho các dialog trong component này. */
.admin-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(17, 17, 17, 0.36);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.admin-confirm-dialog {
  width: min(100%, 420px);
  padding: 28px;
  border: 1px solid rgba(17,17,17,0.10);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 32px 90px rgba(17, 17, 17, 0.22);
  color: #111111;
  font-family: var(--font);
  display: grid;
  gap: 12px;
}

.admin-confirm-dialog h2,
.admin-confirm-dialog p {
  margin: 0;
}

.admin-confirm-dialog h2 {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.admin-confirm-dialog > p:not(.admin-panel__eyebrow) {
  color: var(--text-secondary);
  line-height: 1.6;
  font-size: 14px;
}

.admin-confirm-dialog__field {
  display: grid;
  gap: 8px;
}

.admin-confirm-dialog__field span {
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-confirm-dialog__field textarea {
  width: 100%;
  min-height: 96px;
  resize: vertical;
  padding: 12px;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--text-primary);
  font-family: var(--font);
  line-height: 1.5;
  outline: none;
}

.admin-confirm-dialog__field textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(168, 139, 114, 0.18);
}

.admin-confirm-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
  margin-top: 8px;
}

.admin-confirm-dialog__ghost,
.admin-confirm-dialog__danger {
  min-width: 140px;
  min-height: 44px;
  height: auto;
  padding: 0 18px;
  border-radius: 8px !important;
  font-family: var(--font);
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 220ms ease,
    border-color 220ms ease,
    color 220ms ease,
    transform 220ms ease;
}

.admin-confirm-dialog__ghost:disabled,
.admin-confirm-dialog__danger:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.admin-confirm-dialog__ghost {
  border: 1px solid var(--card-border);
  background: transparent;
  color: var(--text-primary);
}

.admin-confirm-dialog__ghost:hover:not(:disabled) {
  border-color: rgba(17, 17, 17, 0.22);
  background: rgba(17, 17, 17, 0.06);
  color: #111111;
  transform: translateY(-1px);
}

.admin-confirm-dialog__danger {
  border: 1px solid #111111;
  background: #111111;
  color: #ffffff;
}

.admin-confirm-dialog__danger:hover:not(:disabled) {
  border-color: #2f2f2f;
  background: #2f2f2f;
  transform: translateY(-1px);
}

.admin-confirm-enter-active,
.admin-confirm-leave-active {
  transition: opacity 180ms ease;
}

.admin-confirm-enter-from,
.admin-confirm-leave-to {
  opacity: 0;
}

/* AdminInventoryHistoryDialog: style lịch sử tồn kho nằm cùng component. */
.admin-inventory-history-dialog {
  width: min(100%, 980px);
  max-height: min(86vh, 760px);
  overflow: auto;
}

.admin-order-detail-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(17,17,17,0.07);
  margin-bottom: 4px;
}

.admin-order-detail-dialog__head .admin-panel__eyebrow {
  font-size: 10px;
  color: var(--accent);
}

.admin-order-detail-dialog__head h2 {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 2px 0 0;
}

.admin-inventory-history-dialog__meta {
  display: inline-block;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 700;
}


/* Admin dialog shared pieces: table/status/action styles used inside this dialog. */
.admin-empty {
  margin: 0;
  padding: 24px 0;
  color: var(--text-tertiary);
  font-size: 13.5px;
  text-align: center;
}

.dashboard-table {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow-x: auto;
  border-radius: var(--radius-md);
  border: 1px solid var(--card-border);
}

.dashboard-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.35;
}

.dashboard-table thead tr {
  background: #f8fafa;
  border-bottom: 1px solid var(--card-border);
}

.dashboard-table th {
  padding: 13px 16px;
  text-align: left;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
  line-height: 1.25;
  white-space: nowrap;
}

.dashboard-table td {
  padding: 14px 16px;
  vertical-align: middle;
  color: var(--text-primary);
  font-size: inherit;
  line-height: inherit;
  border-bottom: 1px solid rgba(13,59,56,0.05);
}

.dashboard-table tbody tr:last-child td {
  border-bottom: none;
}

.dashboard-table tbody tr {
  transition: background 0.12s;
}

.dashboard-table tbody tr:hover {
  background: rgba(26,158,143,0.04);
}

.table-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(168, 139, 114, 0.18);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.85);
  color: #6b5643;
  font-family: var(--font);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.table-action:hover {
  border-color: #a88b72;
  background: rgba(168, 139, 114, 0.08);
  color: #7c634f;
}

.table-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.table-action--order-primary {
  border-color: #a88b72;
  background: #a88b72;
  color: #ffffff;
}

.table-action--order-primary:hover:not(:disabled) {
  border-color: #987c64;
  background: #987c64;
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(168, 139, 114, 0.28);
}

.table-action--danger {
  color: #a53f3f;
  border-color: rgba(165, 63, 63, 0.18);
  background: rgba(165, 63, 63, 0.06);
}

.table-action--danger:hover {
  background: #a53f3f;
  border-color: #a53f3f;
  color: #ffffff;
}

.table-status-note {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.table-status-note--action {
  max-width: 150px;
}

.status {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status--pending {
  background: #fef3c7;
  color: #92400e;
}

.status--processing {
  background: #dbeafe;
  color: #1e40af;
}

.status--completed {
  background: #d1fae5;
  color: #065f46;
}

.status--danger {
  background: #fee2e2;
  color: #991b1b;
}

.stock-change {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.stock-change--positive {
  background: #d1fae5;
  color: #065f46;
}

.stock-change--negative {
  background: #fee2e2;
  color: #991b1b;
}

@media (min-width: 1440px) {
  .dashboard-table table {
    font-size: 15px;
  }

  .dashboard-table th {
    font-size: 13px;
  }

  .dashboard-table td {
    padding: 18px 20px;
  }

  .table-action {
    height: 36px;
    padding: 0 14px;
    font-size: 13px;
  }

  .status,
  .stock-change {
    min-height: 26px;
    height: 26px;
    padding: 0 10px;
    font-size: 12px;
  }
}

@media (min-width: 1920px) {
  .dashboard-table table {
    font-size: 16px;
  }

  .dashboard-table th {
    font-size: 14px;
  }

  .dashboard-table td {
    padding: 20px 24px;
  }

  .table-action {
    height: 38px;
    padding: 0 16px;
    font-size: 14px;
  }

  .status,
  .stock-change {
    min-height: 28px;
    height: 28px;
    padding: 0 11px;
    font-size: 13px;
  }
}

</style>
