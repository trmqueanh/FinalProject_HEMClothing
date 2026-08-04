<template>
  <section class="admin-panel admin-payments-section">
    <div class="admin-panel__top">
      <div>
        <p class="admin-panel__eyebrow">Payment Verification</p>
        <h2>Bank Transfer Payments</h2>
      </div>
    </div>

    <div class="admin-toolbar">
      <input
        v-model="bankTransferPaymentSearch"
        type="search"
        placeholder="Search order code or customer..."
        aria-label="Search bank transfer payments"
      />
      <select v-model="bankTransferPaymentStatusFilter" aria-label="Filter bank transfer payment status">
        <option value="">All bank transfers</option>
        <option value="payment_under_review">Under review</option>
        <option value="pending_payment">Pending payment</option>
        <option value="payment_expired">Payment expired</option>
        <option value="payment_cancelled">Payment cancelled</option>
        <option value="payment_rejected">Payment rejected</option>
      </select>
    </div>

    <div class="dashboard-table admin-payments-table">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Transfer Description</th>
            <th>Payment</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="payment in bankTransferPayments"
            :key="payment.id"
            :class="{ 'admin-return-focus': isAdminListFocus('payments', payment.id) }"
            :data-admin-focus-id="payment.id"
          >
            <td>#{{ shortOrderId(payment.id) }}</td>
            <td>{{ payment.customerName || 'Customer' }}</td>
            <td>{{ formatCurrency(payment.totalAmount) }}</td>
            <td class="admin-payments-table__reference">{{ payment.bankTransfer && payment.bankTransfer.description }}</td>
            <td class="admin-payments-table__status-cell">
              <span class="status admin-payments-table__status" :class="paymentStatusClass(payment.paymentStatus)">
                {{ formatLabel(payment.paymentStatus) }}
              </span>
            </td>
            <td>{{ formatDate(payment.updatedAt || payment.createdAt) }}</td>
            <td class="admin-payments-table__actions-cell">
              <div
                v-if="payment.paymentStatus === 'payment_under_review'"
                class="payment-review-controls"
              >
                <div v-if="isPaymentProcessing(payment)" class="payment-review-controls__processing" aria-live="polite">
                  <span class="payment-review-controls__spinner" aria-hidden="true"></span>
                  <strong>{{ processingLabel(payment) }}</strong>
                </div>

                <template v-else>
                  <div class="payment-review-controls__actions">
                    <button type="button" class="table-action table-action--approve" @click="confirmPayment(payment)">
                      Confirm
                    </button>
                    <button
                      type="button"
                      class="table-action table-action--danger"
                      @click="openPaymentAction(payment)"
                    >
                      Reject Payment
                    </button>
                  </div>

                  <div v-if="paymentAction(payment)" class="payment-review-controls__form">
                    <p class="payment-review-controls__form-title">Reject payment</p>
                    <label>
                      <span>Rejection reason</span>
                      <textarea
                        v-model.trim="reviewReasons[payment.id]"
                        rows="3"
                        maxlength="500"
                        placeholder="Example: No matching bank transaction was found"
                      ></textarea>
                    </label>
                    <div class="payment-review-controls__form-actions">
                      <button type="button" class="table-action" @click="closePaymentAction(payment)">
                        Back
                      </button>
                      <button
                        type="button"
                        class="table-action table-action--danger"
                        :disabled="!String(reviewReasons[payment.id] || '').trim()"
                        @click="submitPaymentAction(payment)"
                      >
                        Reject Payment
                      </button>
                    </div>
                  </div>
                </template>
              </div>

              <button
                v-else
                type="button"
                class="table-action admin-payments-table__view-action"
                @click="viewOrderDetail(payment)"
              >
                View Order Detail
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="isSectionLoading('payments')" class="admin-empty">Loading payments...</p>
      <p v-else-if="!bankTransferPayments.length" class="admin-empty">No bank transfer payments matched this filter.</p>
    </div>
  </section>
</template>

<script>
import { createAdminSectionProxy } from '../adminSectionProxy';

export default {
  ...createAdminSectionProxy('AdminPaymentsSection'),
  data() {
    return {
      reviewReasons: {},
      paymentActions: {},
      processingPayments: {}
    };
  },
  methods: {
    paymentAction(payment) {
      return this.paymentActions[payment.id] || '';
    },
    openPaymentAction(payment) {
      this.paymentActions = {
        ...this.paymentActions,
        [payment.id]: 'reject'
      };
    },
    closePaymentAction(payment) {
      const nextActions = { ...this.paymentActions };
      delete nextActions[payment.id];
      this.paymentActions = nextActions;
    },
    isPaymentProcessing(payment) {
      return Boolean(this.processingPayments[payment.id]);
    },
    processingLabel(payment) {
      const action = this.processingPayments[payment.id];
      if (action === 'confirm') return 'Confirming payment...';
      if (action === 'reject') return 'Rejecting payment...';
      return 'Saving...';
    },
    setPaymentProcessing(payment, action = '') {
      const next = { ...this.processingPayments };
      if (action) next[payment.id] = action;
      else delete next[payment.id];
      this.processingPayments = next;
    },
    viewOrderDetail(payment) {
      return this.openAdminOrderDetail({ id: payment.id }, 'payments');
    },
    async confirmPayment(payment) {
      if (this.isPaymentProcessing(payment)) return;
      this.setPaymentProcessing(payment, 'confirm');
      try {
        const updated = await this.confirmBankTransferPayment(payment);
        if (updated) await this.viewOrderDetail(updated);
      } finally {
        this.setPaymentProcessing(payment);
      }
    },
    async submitPaymentAction(payment) {
      if (this.isPaymentProcessing(payment)) return;
      const reason = String(this.reviewReasons[payment.id] || '').trim();
      if (!reason) return;
      this.setPaymentProcessing(payment, 'reject');
      try {
        const updated = await this.rejectBankTransferPayment(payment, { reason });
        if (updated) {
          this.closePaymentAction(payment);
          await this.viewOrderDetail(updated);
        }
      } finally {
        this.setPaymentProcessing(payment);
      }
    }
  }
};
</script>

<style scoped src="../adminSectionShared.css"></style>
<style scoped>
.admin-payments-table__reference {
  font-weight: 750;
  letter-spacing: 0;
  white-space: nowrap;
}

.admin-payments-table table {
  min-width: 1260px;
}

.admin-payments-table__status-cell {
  min-width: 170px;
}

.admin-payments-table__status {
  white-space: nowrap;
}

.admin-payments-table__actions-cell {
  width: 340px;
  min-width: 340px;
}

.admin-payments-table__view-action {
  min-width: 150px;
}

.table-action--approve {
  color: #087443;
}

.table-action--danger {
  color: #b42318;
}

.payment-review-controls {
  display: grid;
  width: 100%;
  gap: 12px;
}

.payment-review-controls label {
  display: grid;
  gap: 4px;
  color: var(--admin-muted, #61706d);
  font-size: 12px;
  font-weight: 700;
}

.payment-review-controls input,
.payment-review-controls textarea {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid #d9dfdd;
  border-radius: 4px;
  background: #ffffff;
  color: #10201d;
  font: inherit;
  resize: vertical;
}

.payment-review-controls__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.payment-review-controls__actions .table-action,
.payment-review-controls__form-actions .table-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  margin: 0;
  text-align: center;
  white-space: nowrap;
}

.payment-review-controls__form {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e3e7e5;
  border-radius: 6px;
  background: #f8faf9;
}

.payment-review-controls__form-title {
  margin: 0;
  color: #10201d;
  font-size: 13px;
  font-weight: 800;
}

.payment-review-controls__form-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.payment-review-controls__processing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 84px;
  color: #53635f;
  font-size: 13px;
}

.payment-review-controls__spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #d8e1de;
  border-top-color: #087443;
  border-radius: 50%;
  animation: payment-control-spin 0.75s linear infinite;
}

@keyframes payment-control-spin {
  to { transform: rotate(360deg); }
}
</style>
