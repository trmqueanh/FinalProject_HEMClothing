<template>
  <!-- AdminConfirmDialogs: dialog UI được tách khỏi AdminDashboard.vue, logic vẫn proxy về view cha. -->
  <transition name="admin-confirm">
        <div v-if="pendingProductDelete" class="admin-confirm-backdrop" @click.self="closeDeleteProductConfirm">
          <section class="admin-confirm-dialog admin-confirm-dialog--action" role="dialog" aria-modal="true" aria-labelledby="admin-delete-product-title">
            <p class="admin-panel__eyebrow">Product Management</p>
            <h2 id="admin-delete-product-title">Delete {{ pendingProductDelete.name }} from the storefront?</h2>
            <p>This action cannot be undone. This will permanently delete the selected item.</p>
            <div class="admin-confirm-dialog__actions">
              <button type="button" class="admin-confirm-dialog__ghost" @click="closeDeleteProductConfirm">Cancel</button>
              <button type="button" class="admin-confirm-dialog__danger" @click="confirmDeleteProduct">
                Confirm
              </button>
            </div>
          </section>
        </div>
      </transition>
  
      <transition name="admin-confirm">
        <div v-if="pendingOrderSave" class="admin-confirm-backdrop" @click.self="closeOrderSaveConfirm">
          <section class="admin-confirm-dialog admin-confirm-dialog--action" role="dialog" aria-modal="true" aria-labelledby="admin-save-order-title">
            <p class="admin-panel__eyebrow">Order Management</p>
            <h2 id="admin-save-order-title">{{ orderConfirmTitle(pendingOrderSave) }}</h2>
            <p>{{ orderConfirmMessage(pendingOrderSave) }}</p>
            <div class="admin-confirm-dialog__actions">
              <button type="button" class="admin-confirm-dialog__ghost" @click="closeOrderSaveConfirm">Cancel</button>
              <button type="button" class="admin-confirm-dialog__danger" @click="confirmOrderChanges">
                {{ orderConfirmLabel(pendingOrderSave) }}
              </button>
            </div>
          </section>
        </div>
      </transition>
  
      <transition name="admin-confirm">
        <div v-if="pendingOrderCancel" class="admin-confirm-backdrop" @click.self="closeOrderCancelConfirm">
          <section class="admin-confirm-dialog admin-confirm-dialog--action" role="dialog" aria-modal="true" aria-labelledby="admin-cancel-order-title">
            <p class="admin-panel__eyebrow">Order Management</p>
            <h2 id="admin-cancel-order-title">Cancel order?</h2>
            <p>Cancel this order and release its reserved inventory. Paid bank transfer orders will move to refund pending.</p>
            <label class="admin-confirm-dialog__field">
              <span>Cancellation reason</span>
              <textarea
                v-model.trim="pendingOrderCancelReason"
                rows="4"
                placeholder="Write the reason this order is being canceled."
              ></textarea>
            </label>
            <div class="admin-confirm-dialog__actions">
              <button type="button" class="admin-confirm-dialog__ghost" @click="closeOrderCancelConfirm">Back</button>
              <button type="button" class="admin-confirm-dialog__danger" :disabled="!pendingOrderCancelReason.trim()" @click="confirmCancelOrder">
                Cancel order
              </button>
            </div>
          </section>
        </div>
      </transition>
  
      <transition name="admin-confirm">
        <div v-if="pendingActionConfirm" class="admin-confirm-backdrop" @click.self="closeActionConfirm">
          <section class="admin-confirm-dialog admin-confirm-dialog--action" role="dialog" aria-modal="true" aria-labelledby="admin-action-confirm-title">
            <p class="admin-panel__eyebrow">Confirm Action</p>
            <h2 id="admin-action-confirm-title">{{ pendingActionConfirm.title }}</h2>
            <label
              v-for="field in pendingActionConfirm.fieldConfig || []"
              :key="field.key"
              class="admin-confirm-dialog__field"
            >
              <span>{{ field.label }}</span>
              <textarea
                v-if="field.multiline"
                v-model.trim="pendingActionConfirm.fields[field.key]"
                :placeholder="field.placeholder || ''"
                rows="3"
              ></textarea>
              <input
                v-else
                v-model.trim="pendingActionConfirm.fields[field.key]"
                :placeholder="field.placeholder || ''"
                type="text"
              />
            </label>
            <div class="admin-confirm-dialog__actions">
              <button type="button" class="admin-confirm-dialog__ghost" :disabled="isAdminActionConfirmSaving" @click="closeActionConfirm">Cancel</button>
              <button type="button" class="admin-confirm-dialog__danger" :disabled="isAdminActionConfirmSaving || actionConfirmFieldsInvalid" @click="confirmAction">
                {{ isAdminActionConfirmSaving ? 'Working...' : pendingActionConfirm.confirmLabel }}
              </button>
            </div>
          </section>
        </div>
      </transition>
</template>

<script>
import { createAdminSectionProxy } from '../sections/adminSectionProxy';

const proxy = createAdminSectionProxy('AdminConfirmDialogs');

export default {
  ...proxy,
  computed: {
    ...proxy.computed,
    actionConfirmFieldsInvalid() {
      const action = this.pendingActionConfirm;
      if (!action) return false;
      return (action.fieldConfig || []).some(field => field.required && !String(action.fields && action.fields[field.key] || '').trim());
    }
  }
};
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

.admin-confirm-dialog__field input {
  width: 100%; min-height: 44px; padding: 12px; border: 1px solid var(--card-border);
  border-radius: var(--radius-sm); background: #fff; color: var(--text-primary); font: inherit; outline: none;
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

/* AdminConfirmDialogs: style riêng cho các khung xác nhận xoá/lưu/hủy/refund. */
.admin-confirm-dialog--action {
  width: min(100%, 400px);
  gap: 12px;
  padding: 26px;
  border: 0.5px solid rgba(17, 17, 17, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.98);
  color: var(--color-text-primary, #141414);
  box-shadow: 0 24px 70px rgba(17, 17, 17, 0.18);
  font-family: var(
    --font-family-primary,
    'Helvetica Neue',
    Helvetica,
    Arial,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif
  );
}

.admin-confirm-dialog--action .admin-panel__eyebrow {
  color: var(--color-text-secondary, rgba(20, 20, 20, 0.62));
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.admin-confirm-dialog--action h2 {
  color: var(--color-text-primary, #141414);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.25;
}

.admin-confirm-dialog--action > p:not(.admin-panel__eyebrow) {
  color: var(--color-text-secondary, rgba(20, 20, 20, 0.62));
  font-size: 14px;
  line-height: 1.6;
}

.admin-confirm-dialog--action .admin-confirm-dialog__field span {
  color: var(--color-text-primary, #141414);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.admin-confirm-dialog--action .admin-confirm-dialog__field textarea {
  border: 1px solid rgba(17, 17, 17, 0.16);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--color-text-primary, #141414);
  font: inherit;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.admin-confirm-dialog--action .admin-confirm-dialog__field textarea:focus {
  border-color: rgba(17, 17, 17, 0.48);
  box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.06);
}

.admin-confirm-dialog--action .admin-confirm-dialog__actions {
  justify-content: center;
  gap: 10px;
  padding-top: 4px;
  margin-top: 8px;
}

.admin-confirm-dialog--action .admin-confirm-dialog__ghost,
.admin-confirm-dialog--action .admin-confirm-dialog__danger {
  min-width: 140px;
  min-height: 44px;
  height: auto;
  padding: 0 18px;
  border-radius: 8px !important;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  transition:
    background 220ms ease,
    border-color 220ms ease,
    color 220ms ease,
    transform 220ms ease;
}

.admin-confirm-dialog--action .admin-confirm-dialog__ghost {
  border-color: rgba(17, 17, 17, 0.16);
  background: transparent;
  color: var(--color-text-primary, #141414);
}

.admin-confirm-dialog--action .admin-confirm-dialog__danger {
  border-color: #111111;
  background: #111111;
  color: #ffffff;
}

.admin-confirm-dialog--action .admin-confirm-dialog__ghost:hover:not(:disabled),
.admin-confirm-dialog--action .admin-confirm-dialog__danger:hover:not(:disabled) {
  transform: translateY(-1px);
}

.admin-confirm-dialog--action .admin-confirm-dialog__ghost:hover:not(:disabled) {
  border-color: rgba(17, 17, 17, 0.22);
  background: rgba(17, 17, 17, 0.06);
  color: #111111;
}

.admin-confirm-dialog--action .admin-confirm-dialog__danger:hover:not(:disabled) {
  border-color: #2f2f2f;
  background: #2f2f2f;
}

.admin-confirm-dialog--action .admin-confirm-dialog__ghost:disabled,
.admin-confirm-dialog--action .admin-confirm-dialog__danger:disabled {
  cursor: wait;
  opacity: 0.62;
}

@media (min-width: 1440px) {
  .admin-confirm-dialog--action {
    width: min(100%, 560px);
    gap: 16px;
    padding: 36px;
  }

  .admin-confirm-dialog--action .admin-panel__eyebrow,
  .admin-confirm-dialog--action .admin-confirm-dialog__field span {
    font-size: 0.8125rem;
  }

  .admin-confirm-dialog--action h2 {
    font-size: 1.5rem;
  }

  .admin-confirm-dialog--action > p:not(.admin-panel__eyebrow),
  .admin-confirm-dialog--action .admin-confirm-dialog__field textarea,
  .admin-confirm-dialog--action .admin-confirm-dialog__field input {
    font-size: 1rem;
  }

  .admin-confirm-dialog--action .admin-confirm-dialog__ghost,
  .admin-confirm-dialog--action .admin-confirm-dialog__danger {
    min-height: 48px;
    font-size: 0.9375rem;
  }
}

@media (min-width: 1920px) {
  .admin-confirm-dialog--action {
    width: min(100%, 640px);
    padding: 42px;
  }

  .admin-confirm-dialog--action h2 {
    font-size: 1.75rem;
  }

  .admin-confirm-dialog--action > p:not(.admin-panel__eyebrow),
  .admin-confirm-dialog--action .admin-confirm-dialog__field textarea,
  .admin-confirm-dialog--action .admin-confirm-dialog__field input {
    font-size: 1.125rem;
  }

  .admin-confirm-dialog--action .admin-confirm-dialog__ghost,
  .admin-confirm-dialog--action .admin-confirm-dialog__danger {
    min-height: 52px;
    font-size: 1rem;
  }
}
</style>
