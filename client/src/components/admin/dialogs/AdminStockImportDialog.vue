<template>
  <!-- AdminStockImportDialog: dialog UI được tách khỏi AdminDashboard.vue, logic vẫn proxy về view cha. -->
  <transition name="admin-confirm">
        <div v-if="selectedInventoryImportVariant" class="admin-confirm-backdrop" @click.self="closeInventoryImport">
          <section class="admin-confirm-dialog admin-stock-import-dialog" role="dialog" aria-modal="true" aria-labelledby="stock-import-title">
            <div class="admin-order-detail-dialog__head">
              <div>
                <p class="admin-panel__eyebrow">Stock Import</p>
                <h2 id="stock-import-title">{{ selectedInventoryImportVariant.productName }}</h2>
                <span class="admin-inventory-history-dialog__meta">
                  {{ selectedInventoryImportVariant.colorName }} / {{ selectedInventoryImportVariant.sizeLabel }} · Product code: {{ selectedInventoryImportVariant.productCode || '-' }}
                </span>
              </div>
              <button type="button" class="admin-confirm-dialog__ghost" @click="closeInventoryImport">Close</button>
            </div>
  
            <div class="admin-stock-import-summary">
              <div>
                <span>Current stock</span>
                <strong>{{ selectedInventoryImportVariant.stockQuantity }}</strong>
              </div>
              <div>
                <span>Reserved</span>
                <strong>{{ selectedInventoryImportVariant.reservedQuantity }}</strong>
              </div>
              <div>
                <span>Available</span>
                <strong>{{ selectedInventoryImportVariant.availableQuantity }}</strong>
              </div>
              <div>
                <span>Sold</span>
                <strong>{{ selectedInventoryImportVariant.soldQuantity }}</strong>
              </div>
            </div>
  
            <form class="admin-stock-import-form" @submit.prevent="importInventory">
              <label>
                <span>Import quantity</span>
                <input v-model.number="inventoryImport.quantity" type="number" min="1" step="1" required />
              </label>
              <label>
                <span>Note</span>
                <textarea v-model.trim="inventoryImport.note" rows="4" placeholder="Example: Restocked from supplier shipment."></textarea>
              </label>
              <div class="admin-confirm-dialog__actions">
                <button type="button" class="admin-confirm-dialog__ghost" :disabled="isImportingInventory" @click="closeInventoryImport">Cancel</button>
                <button type="submit" class="admin-confirm-dialog__danger" :disabled="isImportingInventory">
                  {{ isImportingInventory ? 'Importing...' : 'Import stock' }}
                </button>
              </div>
            </form>
          </section>
        </div>
      </transition>
</template>

<script>
import { createAdminSectionProxy } from '../sections/adminSectionProxy';

export default createAdminSectionProxy('AdminStockImportDialog');
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

/* AdminStockImportDialog: style nhập kho nằm cùng component. */
.admin-stock-import-dialog {
  width: min(100%, 560px);
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

.admin-stock-import-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.admin-stock-import-summary div {
  display: grid;
  gap: 4px;
  padding: 12px;
  border: 1px solid rgba(17,17,17,0.08);
  border-radius: 12px;
  background: #ffffff;
}

.admin-stock-import-summary span {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-stock-import-summary strong {
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 800;
}

.admin-stock-import-form {
  display: grid;
  gap: 12px;
}

.admin-stock-import-form label {
  display: grid;
  gap: 7px;
}

.admin-stock-import-form label > span {
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-stock-import-form input,
.admin-stock-import-form textarea {
  width: 100%;
  border: 1px solid var(--card-border);
  border-radius: var(--radius-sm);
  background: #ffffff;
  color: var(--text-primary);
  font: inherit;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.admin-stock-import-form input {
  height: 42px;
  padding: 0 12px;
}

.admin-stock-import-form textarea {
  min-height: 96px;
  resize: vertical;
  padding: 12px;
  line-height: 1.5;
}

.admin-stock-import-form input:focus,
.admin-stock-import-form textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(168, 139, 114, 0.12);
}

.admin-stock-import-form input:disabled,
.admin-stock-import-form textarea:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

@media (min-width: 1440px) {
  .admin-stock-import-dialog { width: min(100%, 700px); gap: 16px; padding: 36px; }
  .admin-stock-import-dialog .admin-panel__eyebrow,
  .admin-stock-import-form label > span { font-size: 13px; }
  .admin-stock-import-dialog h2 { font-size: 23px; }
  .admin-stock-import-dialog > p,
  .admin-stock-import-form input,
  .admin-stock-import-form textarea { font-size: 16px; }
  .admin-stock-import-form input { height: 48px; }
  .admin-stock-import-dialog .admin-confirm-dialog__ghost,
  .admin-stock-import-dialog .admin-confirm-dialog__danger { min-height: 48px; font-size: 15px; }
}

@media (min-width: 1920px) {
  .admin-stock-import-dialog { width: min(100%, 800px); padding: 42px; }
  .admin-stock-import-dialog h2 { font-size: 27px; }
  .admin-stock-import-dialog > p,
  .admin-stock-import-form input,
  .admin-stock-import-form textarea { font-size: 18px; }
}
</style>
