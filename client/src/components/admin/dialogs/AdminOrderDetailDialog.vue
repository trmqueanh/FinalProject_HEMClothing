<template>
  <!-- Nội dung Order Detail dùng trong route trang riêng; logic vẫn proxy về view cha. -->
  <section
    v-if="selectedAdminOrderDetail || isLoadingAdminOrderDetail"
    class="admin-order-detail-content"
    role="region"
    aria-label="Order detail"
  >
            <div class="admin-order-detail-dialog__body">
              <p v-if="isLoadingAdminOrderDetail" class="admin-empty">Loading order detail...</p>
  
            <template v-else-if="selectedAdminOrderDetail">
              <div class="admin-order-detail-dialog__grid">
                <section class="admin-order-detail-dialog__card admin-order-detail-dialog__card--summary">
                  <div class="admin-order-detail-dialog__summary-head">
                    <div>
                      <p class="admin-panel__eyebrow">Order Summary</p>
                      <h3>Order #{{ shortOrderId(selectedAdminOrderDetail.order.id) }}</h3>
                      <span>{{ formatDate(selectedAdminOrderDetail.order.createdAt) }}</span>
                    </div>
                    <div class="admin-order-detail-dialog__badges">
                      <span class="status" :class="orderStatusClass(selectedAdminOrderDetail.order.orderStatus)">
                        {{ formatLabel(selectedAdminOrderDetail.order.orderStatus) }}
                      </span>
                      <span class="status" :class="paymentStatusClass(selectedAdminOrderDetail.order.paymentStatus)">
                        {{ formatLabel(selectedAdminOrderDetail.order.paymentStatus) }}
                      </span>
                    </div>
                  </div>
  
                  <dl class="admin-order-detail-dialog__facts">
                    <div>
                      <dt>Payment method</dt>
                      <dd>{{ formatPaymentMethodLabel(selectedAdminOrderDetail.order.paymentMethod) }}</dd>
                    </div>
                    <div>
                      <dt>Total items</dt>
                      <dd>{{ totalAdminOrderItems(selectedAdminOrderDetail) }} item{{ totalAdminOrderItems(selectedAdminOrderDetail) === 1 ? '' : 's' }}</dd>
                    </div>
                    <div>
                      <dt>Subtotal</dt>
                      <dd>{{ formatCurrency(selectedAdminOrderDetail.order.subtotal) }}</dd>
                    </div>
                    <div>
                      <dt>Shipping fee</dt>
                      <dd>{{ Number(selectedAdminOrderDetail.order.shippingFee) === 0 ? 'Free' : formatCurrency(selectedAdminOrderDetail.order.shippingFee) }}</dd>
                    </div>
                    <div>
                      <dt>Discount<span v-if="selectedAdminOrderDetail.order.voucherCode"> ({{ selectedAdminOrderDetail.order.voucherCode }})</span></dt>
                      <dd class="admin-order-detail-dialog__discount">-{{ formatCurrency(selectedAdminOrderDetail.order.discountAmount) }}</dd>
                    </div>
                    <div>
                      <dt>Total amount</dt>
                      <dd>{{ formatCurrency(selectedAdminOrderDetail.order.totalAmount) }}</dd>
                    </div>
                  </dl>
  
                  <div class="admin-order-detail-dialog__actions" aria-label="Order actions">
                    <button
                      v-if="nextOrderAction(selectedAdminOrderDetail.order)"
                      type="button"
                      class="table-action table-action--order-primary"
                      :disabled="isOrderSaving(selectedAdminOrderDetail.order.id)"
                      @click="saveOrderChanges(selectedAdminOrderDetail.order)"
                    >
                      {{ isOrderSaving(selectedAdminOrderDetail.order.id) ? 'Updating...' : nextOrderAction(selectedAdminOrderDetail.order).label }}
                    </button>
                    <button
                      v-if="canCancelOrder(selectedAdminOrderDetail.order)"
                      type="button"
                      class="table-action table-action--danger"
                      :disabled="isOrderSaving(selectedAdminOrderDetail.order.id)"
                      @click="requestCancelOrder(selectedAdminOrderDetail.order)"
                    >
                      Cancel Order
                    </button>
                    <button
                      v-if="canMarkDeliveryFailed(selectedAdminOrderDetail.order)"
                      type="button"
                      class="table-action table-action--danger"
                      :disabled="isOrderSaving(selectedAdminOrderDetail.order.id)"
                      @click="requestDeliveryFailedOrder(selectedAdminOrderDetail.order)"
                    >
                      Mark Delivery Failed
                    </button>
                    <button
                      v-if="canMarkReturnedToWarehouse(selectedAdminOrderDetail.order)"
                      type="button"
                      class="table-action table-action--danger"
                      :disabled="isOrderSaving(selectedAdminOrderDetail.order.id)"
                      @click="requestReturnedToWarehouse(selectedAdminOrderDetail.order)"
                    >
                      Returned to Warehouse
                    </button>
                    <span
                      v-if="
                        !nextOrderAction(selectedAdminOrderDetail.order) &&
                        !canRefundOrder(selectedAdminOrderDetail.order) &&
                        !isAdminOrderTerminal(selectedAdminOrderDetail.order)
                      "
                      class="table-status-note table-status-note--action"
                    >
                      {{ orderStateNote(selectedAdminOrderDetail.order) }}
                    </span>
                  </div>

                  <div
                    v-if="selectedAdminOrderDetail.returnRequests && selectedAdminOrderDetail.returnRequests.length > 1"
                    class="admin-order-detail-dialog__return-history"
                  >
                    <div class="admin-order-detail-dialog__return-history-heading">
                      <p class="admin-panel__eyebrow">Return history</p>
                      <strong>{{ selectedAdminOrderDetail.returnRequests.length }} requests</strong>
                    </div>
                    <article
                      v-for="request in selectedAdminOrderDetail.returnRequests"
                      :key="request.id"
                      class="admin-order-detail-dialog__return-history-item"
                    >
                      <div>
                        <strong>{{ request.returnCode }}</strong>
                        <span>{{ formatDate(request.requestedAt) }}</span>
                      </div>
                      <span class="status" :class="workflowStatusClass(request.returnStatus)">
                        {{ formatLabel(request.returnStatus) }}
                      </span>
                      <button
                        type="button"
                        class="table-action"
                        @click="syncSelectedAdminOrderDetailReturnRequest(request)"
                      >
                        Open
                      </button>
                      <p>
                        {{ (request.items || []).map(item => `${item.productName} × ${item.requestedQuantity}`).join(' · ') }}
                      </p>
                    </article>
                  </div>

                  <div
                    v-if="selectedAdminOrderDetail.returnRequest"
                    class="admin-order-detail-dialog__return admin-order-detail-dialog__workflow-step"
                  >
                    <div class="admin-order-detail-dialog__return-heading">
                      <div class="admin-order-detail-dialog__workflow-title">
                        <span class="admin-order-detail-dialog__workflow-index">01</span>
                        <div>
                          <p class="admin-panel__eyebrow">Product return</p>
                          <span>
                            {{ formatLabel(selectedAdminOrderDetail.returnRequest.reason) }}
                            · {{ formatDate(selectedAdminOrderDetail.returnRequest.requestedAt) }}
                          </span>
                        </div>
                      </div>
                      <div class="admin-order-detail-dialog__workflow-badges">
                        <span
                          class="status"
                          :class="workflowStatusClass(selectedAdminOrderDetail.returnRequest.returnStatus)"
                        >
                          {{ formatLabel(selectedAdminOrderDetail.returnRequest.returnStatus) }}
                        </span>
                        <span class="admin-order-detail-dialog__return-quantity">
                          {{ returnRequestQuantitySummary(selectedAdminOrderDetail.returnRequest) }}
                        </span>
                      </div>
                    </div>
                    <p v-if="selectedAdminOrderDetail.returnRequest.note">{{ selectedAdminOrderDetail.returnRequest.note }}</p>
                    <div v-for="item in selectedAdminOrderDetail.returnRequest.items || []" :key="item.id" class="admin-order-detail-dialog__return-item">
                      <strong>{{ item.productName }}</strong>
                      <span>
                        {{ [item.colorName, item.sizeLabel].filter(Boolean).join(' / ') }}
                        · Requested {{ item.requestedQuantity }}
                        <template v-if="String(selectedAdminOrderDetail.returnRequest.returnStatus || '').toLowerCase() !== 'requested'">
                          → {{ formatLabel(returnQuantityStage(selectedAdminOrderDetail.returnRequest)) }}
                          {{ returnItemProcessedQuantity(item, selectedAdminOrderDetail.returnRequest) }}
                        </template>
                      </span>
                      <div v-if="item.evidenceUrls && item.evidenceUrls.length" class="admin-order-detail-dialog__evidence">
                        <a v-for="(url, evidenceIndex) in item.evidenceUrls" :key="url" :href="url" target="_blank" rel="noopener noreferrer">
                          <img :src="url" :alt="`Return evidence ${evidenceIndex + 1}`" />
                        </a>
                      </div>
                      <label v-if="canApproveReturnRequest(selectedAdminOrderDetail.returnRequest)">
                        <span>Approve quantity</span>
                        <input v-model.number="item.approvalDecisionQuantity" type="number" min="0" :max="item.requestedQuantity" :placeholder="String(item.requestedQuantity)" />
                      </label>
                      <label v-if="canReceiveReturnRequest(selectedAdminOrderDetail.returnRequest)">
                        <span>Received quantity</span>
                        <input v-model.number="item.receiptDecisionQuantity" type="number" min="0" :max="item.approvedQuantity" :placeholder="String(item.approvedQuantity)" />
                      </label>
                      <div v-if="canInspectReturnRequest(selectedAdminOrderDetail.returnRequest)" class="admin-order-detail-dialog__inspection-fields">
                        <label><span>Accepted</span><input v-model.number="item.inspectionAcceptedQuantity" type="number" min="0" :max="item.receivedQuantity" /></label>
                        <label><span>Rejected</span><input v-model.number="item.inspectionRejectedQuantity" type="number" min="0" :max="item.receivedQuantity" /></label>
                        <label class="admin-order-detail-dialog__checkbox"><input v-model="item.inspectionRestockable" type="checkbox" /><span>Accepted item is restockable</span></label>
                        <label><span>Condition</span><input v-model.trim="item.inspectionConditionCode" type="text" placeholder="new, opened, damaged..." /></label>
                        <label><span>Rejection reason</span><input v-model.trim="item.inspectionRejectionReason" type="text" /></label>
                        <label><span>Inspection note</span><input v-model.trim="item.inspectionNote" type="text" /></label>
                      </div>
                    </div>
                    <div class="admin-order-detail-dialog__return-actions">
                      <button
                        v-if="canApproveReturnRequest(selectedAdminOrderDetail.returnRequest)"
                        type="button"
                        class="table-action table-action--order-primary"
                        :disabled="isOrderSaving(selectedAdminOrderDetail.order.id)"
                        @click="requestApproveReturnRequest(selectedAdminOrderDetail.returnRequest)"
                      >
                        Approve Return
                      </button>
                      <button
                        v-if="canRejectReturnRequest(selectedAdminOrderDetail.returnRequest)"
                        type="button"
                        class="table-action table-action--danger"
                        :disabled="isOrderSaving(selectedAdminOrderDetail.order.id)"
                        @click="requestRejectReturnRequest(selectedAdminOrderDetail.returnRequest)"
                      >
                        Reject Return
                      </button>
                      <button
                        v-if="canReceiveReturnRequest(selectedAdminOrderDetail.returnRequest)"
                        type="button"
                        class="table-action"
                        :disabled="isOrderSaving(selectedAdminOrderDetail.order.id)"
                        @click="requestReceiveReturnRequest(selectedAdminOrderDetail.returnRequest)"
                      >
                        Confirm Received
                      </button>
                      <button v-if="canStartReturnInspection(selectedAdminOrderDetail.returnRequest)" type="button" class="table-action" @click="requestStartReturnInspection(selectedAdminOrderDetail.returnRequest)">Start Inspection</button>
                      <button v-if="canInspectReturnRequest(selectedAdminOrderDetail.returnRequest)" type="button" class="table-action table-action--order-primary" @click="requestInspectReturn(selectedAdminOrderDetail.returnRequest)">Submit Inspection</button>
                    </div>
                    <div
                      v-if="shouldShowReturnRefundAccount(
                        selectedAdminOrderDetail.returnRequest,
                        selectedAdminOrderDetail.refundRequest
                      )"
                      class="admin-order-detail-dialog__refund-account"
                    >
                      <div>
                        <p class="admin-panel__eyebrow">Refund destination</p>
                      </div>
                      <dl v-if="hasRefundAccount(selectedAdminOrderDetail.returnRequest)">
                        <div><dt>Bank</dt><dd>{{ selectedAdminOrderDetail.returnRequest.refundAccount.bankName || '-' }}</dd></div>
                        <div><dt>Account number</dt><dd>{{ selectedAdminOrderDetail.returnRequest.refundAccount.accountNumber || selectedAdminOrderDetail.returnRequest.refundAccount.maskedAccountNumber || '-' }}</dd></div>
                        <div><dt>Account holder</dt><dd>{{ selectedAdminOrderDetail.returnRequest.refundAccount.accountHolder || '-' }}</dd></div>
                      </dl>
                      <p v-else>Waiting for the customer to provide bank details.</p>
                    </div>
                  </div>

                  <div
                    v-if="selectedAdminOrderDetail.refundRequest"
                    class="admin-order-detail-dialog__return admin-order-detail-dialog__return--refund admin-order-detail-dialog__workflow-step"
                  >
                    <div class="admin-order-detail-dialog__return-heading">
                      <div class="admin-order-detail-dialog__workflow-title">
                        <span class="admin-order-detail-dialog__workflow-index">02</span>
                        <div>
                          <p class="admin-panel__eyebrow">Refund</p>
                          <span>Returned-item reimbursement</span>
                        </div>
                      </div>
                      <div class="admin-order-detail-dialog__workflow-badges">
                        <span
                          class="status"
                          :class="workflowStatusClass(selectedAdminOrderDetail.refundRequest.status)"
                        >
                          {{ formatLabel(selectedAdminOrderDetail.refundRequest.status) }}
                        </span>
                      </div>
                    </div>
                    <dl class="admin-order-detail-dialog__refund-summary">
                      <div class="admin-order-detail-dialog__refund-amount">
                        <dt>Refund amount</dt>
                        <dd>{{ formatCurrency(selectedAdminOrderDetail.refundRequest.approvedAmount || selectedAdminOrderDetail.refundRequest.requestedAmount) }}</dd>
                      </div>
                      <div>
                        <dt>Method</dt>
                        <dd>Bank transfer</dd>
                      </div>
                      <div>
                        <dt>{{ selectedAdminOrderDetail.refundRequest.completedAt ? 'Completed' : 'Created' }}</dt>
                        <dd>{{ formatDate(selectedAdminOrderDetail.refundRequest.completedAt || selectedAdminOrderDetail.refundRequest.createdAt) }}</dd>
                      </div>
                      <div>
                        <dt>Refund code</dt>
                        <dd>{{ selectedAdminOrderDetail.refundRequest.refundCode }}</dd>
                      </div>
                    </dl>
                    <p
                      v-if="meaningfulRefundAdminNote(selectedAdminOrderDetail.refundRequest)"
                      class="admin-order-detail-dialog__refund-note"
                    >
                      Admin note: {{ meaningfulRefundAdminNote(selectedAdminOrderDetail.refundRequest) }}
                    </p>
                    <div v-if="selectedAdminOrderDetail.refundRequest.refundAccount" class="admin-order-detail-dialog__refund-account">
                      <div><p class="admin-panel__eyebrow">Refund destination</p></div>
                      <dl v-if="hasRefundAccount(selectedAdminOrderDetail.refundRequest)">
                        <div><dt>Bank</dt><dd>{{ selectedAdminOrderDetail.refundRequest.refundAccount.bankName }}</dd></div>
                        <div><dt>Account number</dt><dd>{{ selectedAdminOrderDetail.refundRequest.refundAccount.accountNumber || selectedAdminOrderDetail.refundRequest.refundAccount.maskedAccountNumber }}</dd></div>
                        <div><dt>Account holder</dt><dd>{{ selectedAdminOrderDetail.refundRequest.refundAccount.accountHolder }}</dd></div>
                      </dl>
                    </div>
                    <p
                      v-if="!hasRefundAccount(selectedAdminOrderDetail.refundRequest)"
                      class="admin-order-detail-dialog__refund-account-error"
                    >Waiting for the customer to provide a refund bank account.</p>
                    <div class="admin-order-detail-dialog__return-actions">
                      <button
                        v-if="canApproveRefundRequest(selectedAdminOrderDetail.refundRequest)"
                        type="button"
                        class="table-action table-action--order-primary"
                        :disabled="isOrderSaving(selectedAdminOrderDetail.order.id)"
                        @click="requestApproveRefundRequest(selectedAdminOrderDetail.refundRequest)"
                      >
                        Start Processing
                      </button>
                      <button
                        v-if="canRejectRefundRequest(selectedAdminOrderDetail.refundRequest)"
                        type="button"
                        class="table-action table-action--danger"
                        :disabled="isOrderSaving(selectedAdminOrderDetail.order.id)"
                        @click="requestRejectRefundRequest(selectedAdminOrderDetail.refundRequest)"
                      >
                        Mark Failed
                      </button>
                      <button v-if="canCompleteRefund(selectedAdminOrderDetail.refundRequest)" type="button" class="table-action table-action--order-primary" @click="requestCompleteRefund(selectedAdminOrderDetail.refundRequest)">Complete Refund</button>
                      <button v-if="canRetryRefund(selectedAdminOrderDetail.refundRequest)" type="button" class="table-action" @click="requestRetryRefund(selectedAdminOrderDetail.refundRequest)">Retry Refund</button>
                    </div>
                  </div>
  
                  <div v-if="isAdminOrderCanceled(selectedAdminOrderDetail.order)" class="admin-order-detail-dialog__cancelled">
                    <strong>Canceled</strong>
                    <span>{{ formatAdminCancelActor(selectedAdminOrderDetail.order.cancelledBy) }} · {{ formatDate(selectedAdminOrderDetail.order.cancelledAt) }}</span>
                    <p v-if="selectedAdminOrderDetail.order.cancelReason">{{ formatAdminCancelReason(selectedAdminOrderDetail.order.cancelReason) }}</p>
                  </div>
                </section>
  
                <section class="admin-order-detail-dialog__card">
                  <p class="admin-panel__eyebrow admin-order-detail-dialog__shipping-title">Shipping Information</p>
                  <dl class="admin-order-detail-dialog__shipping">
                    <div>
                      <dt>Receiver</dt>
                      <dd>{{ selectedAdminOrderDetail.order.shippingFullName || '-' }}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{{ selectedAdminOrderDetail.order.shippingPhone || '-' }}</dd>
                    </div>
                    <div class="admin-order-detail-dialog__shipping-address">
                      <dt>Address</dt>
                      <dd>{{ formatFullShippingAddress(selectedAdminOrderDetail.order) }}</dd>
                    </div>
                    <div class="admin-order-detail-dialog__shipping-note">
                      <dt>Note</dt>
                      <dd>{{ selectedAdminOrderDetail.order.shippingNote || 'No delivery note' }}</dd>
                    </div>
                  </dl>
                </section>
              </div>
  
              <section class="admin-order-detail-dialog__card admin-order-detail-dialog__card--wide">
                <div>
                  <p class="admin-panel__eyebrow">Items ordered</p>
                  <h3>{{ totalAdminOrderItems(selectedAdminOrderDetail) }} item{{ totalAdminOrderItems(selectedAdminOrderDetail) === 1 ? '' : 's' }}</h3>
                </div>
                <div class="admin-order-detail-dialog__items">
                  <article v-for="item in selectedAdminOrderDetail.items" :key="item.id" class="admin-order-detail-dialog__item">
                    <div class="admin-order-detail-dialog__item-media">
                      <img v-if="item.productImage" :src="item.productImage" :alt="item.productName" loading="lazy" />
                      <span v-else>{{ item.productName.charAt(0) || 'H' }}</span>
                    </div>
                    <div class="admin-order-detail-dialog__item-info">
                      <strong>{{ item.productName }}</strong>
                      <span v-if="item.productCode">Product code {{ item.productCode }}</span>
                      <span>
                        Color {{ item.colorName || 'Default' }}<template v-if="item.sizeLabel && !['one size', 'free size', 'os', 'n/a'].includes(String(item.sizeLabel).trim().toLowerCase())"> · Size {{ item.sizeLabel }}</template>
                      </span>
                      <span class="admin-order-price">
                        <span>Quantity {{ item.quantity }}</span>
                        <span
                          v-if="priceLabel(item)"
                          class="admin-order-price__label"
                          :class="`price-label--${itemPriceTone(item)}`"
                        >{{ priceLabel(item) }}</span>
                        <span class="admin-order-price__line">
                          <strong class="price-current" :class="`price-current--${itemPriceTone(item)}`">
                            {{ formatCurrency(itemPrice(item)) }}
                          </strong>
                        </span>
                      </span>
                    </div>
                    <strong class="admin-order-detail-dialog__item-total">
                       <small>Item total</small>
                      <span>{{ formatCurrency(itemPrice(item) * item.quantity) }}</span>
                    </strong>
                  </article>
                </div>
              </section>
  
              <section class="admin-order-detail-dialog__card admin-order-detail-dialog__card--wide">
                <p class="admin-panel__eyebrow">Order Timeline</p>
                <div v-if="selectedAdminOrderDetail.timeline && selectedAdminOrderDetail.timeline.length" class="admin-order-timeline">
                  <div
                    v-for="(event, index) in selectedAdminOrderDetail.timeline.slice().reverse()"
                    :key="event.id"
                    class="admin-order-timeline__item"
                    :class="{
                      'admin-order-timeline__item--active': index === 0,
                      'admin-order-timeline__item--cancelled': isAdminTimelineCancellation(event),
                      'admin-order-timeline__item--failed': String(event.newStatus || '').toLowerCase() === 'delivery_failed',
                      'admin-order-timeline__item--success': ['delivered', 'completed'].includes(String(event.newStatus || '').toLowerCase())
                    }"
                    :aria-current="index === 0 ? 'step' : undefined"
                  >
                    <span></span>
                    <div>
                      <strong>{{ formatAdminOrderTimelineTitle(event) }}</strong>
                      <p>{{ formatAdminTimelineRole(event.changedByRole) }} · {{ formatDate(event.createdAt) }}</p>
                      <small v-if="formatAdminTimelineNote(event)">{{ formatAdminTimelineNote(event) }}</small>
                    </div>
                  </div>
                </div>
                <p v-else class="admin-empty">No status history yet.</p>
              </section>

              </template>
            </div>
  </section>
</template>

<script>
import { createAdminSectionProxy } from '../sections/adminSectionProxy';

export default createAdminSectionProxy('AdminOrderDetailDialog');
</script>

<style scoped>
/* Full-screen workspace: không làm mờ trang và không giới hạn chi tiết đơn trong modal nhỏ. */
.admin-confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: block;
  padding: 0;
  overflow: hidden;
  background: #f7f8f7;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
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

/* Các lớp modal cũ được giữ cho style action dùng chung; trang mới chỉ dùng content bên dưới. */
.admin-order-detail-content {
  width: 100%;
  min-width: 0;
}

.admin-order-detail-dialog {
  display: block;
  width: 100vw;
  max-width: none;
  height: 100vh;
  height: 100dvh;
  max-height: none;
  padding: 0;
  overflow-y: auto;
  border: 0;
  border-radius: 0;
  background: #f7f8f7;
  box-shadow: none;
}

.admin-order-detail-dialog__head {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  min-height: 88px;
  padding: 16px clamp(24px, 3vw, 56px);
  border-bottom: 1px solid rgba(17,17,17,0.09);
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 5px 18px rgba(17, 17, 17, 0.045);
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

.admin-order-detail-dialog__back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.admin-order-detail-dialog__back span {
  font-size: 18px;
  line-height: 1;
}

.admin-order-detail-dialog__body {
  display: grid;
  gap: 18px;
  width: 100%;
  margin: 0;
  padding: 0;
}

.admin-inventory-history-dialog__meta {
  display: inline-block;
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 700;
}

.admin-order-detail-dialog__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.admin-order-detail-dialog__card {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgba(17,17,17,0.08);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(17,17,17,0.04);
}

.admin-order-detail-dialog__card--wide {
  grid-column: 1 / -1;
}

.admin-order-detail-dialog__card--summary {
  border-top: 3px solid var(--accent);
}

.admin-order-detail-dialog__summary-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.admin-order-detail-dialog__summary-head h3,
.admin-order-detail-dialog__summary-head p,
.admin-order-detail-dialog__summary-head span,
.admin-order-detail-dialog__card h3,
.admin-order-detail-dialog__card p {
  margin: 0;
}

.admin-order-detail-dialog__summary-head h3 {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.admin-order-detail-dialog__card h3 {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary);
  margin-bottom: -4px;
}

.admin-order-detail-dialog__summary-head > div:first-child > span {
  color: var(--text-secondary);
  font-size: 11.5px;
}

.admin-order-detail-dialog__badges {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.admin-order-detail-dialog__facts {
  display: grid;
  gap: 0;
  margin: 0;
  border: 1px solid rgba(17,17,17,0.07);
  border-radius: 10px;
  overflow: hidden;
}

.admin-order-detail-dialog__facts div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding: 9px 13px;
  border-bottom: 1px solid rgba(17,17,17,0.055);
}

.admin-order-detail-dialog__facts div:last-child {
  border-bottom: none;
  background: rgba(17,17,17,0.025);
  font-weight: 700;
}

.admin-order-detail-dialog__facts dt {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}

.admin-order-detail-dialog__facts dd {
  margin: 0;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.admin-order-detail-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.admin-order-detail-dialog__actions .table-action {
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
}

.admin-order-detail-dialog__actions .table-status-note--action {
  max-width: none;
}

.admin-order-detail-dialog__return-history {
  display: grid;
  gap: 10px;
  padding: 18px 20px;
  border: 1px solid rgba(17, 17, 17, 0.1);
  border-radius: 12px;
  background: #fff;
}

.admin-order-detail-dialog__return-history-heading,
.admin-order-detail-dialog__return-history-item > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.admin-order-detail-dialog__return-history-heading p,
.admin-order-detail-dialog__return-history-item p {
  margin: 0;
}

.admin-order-detail-dialog__return-history-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px 14px;
  padding: 12px 0;
  border-top: 1px solid rgba(17, 17, 17, 0.08);
}

.admin-order-detail-dialog__return-history-item > div {
  justify-content: flex-start;
}

.admin-order-detail-dialog__return-history-item > div span,
.admin-order-detail-dialog__return-history-item p {
  color: var(--text-secondary);
  font-size: 13px;
}

.admin-order-detail-dialog__return-history-item p {
  grid-column: 1 / -1;
}

.admin-order-detail-dialog__return {
  display: grid;
  gap: 12px;
  padding: 18px 20px;
  border: 1px solid rgba(17, 17, 17, 0.1);
  border-radius: 12px;
  background: #faf9f7;
}

.admin-order-detail-dialog__return strong {
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.35;
}

.admin-order-detail-dialog__return span,
.admin-order-detail-dialog__return p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.55;
}

.admin-order-detail-dialog__return .admin-panel__eyebrow {
  font-size: 13px;
}

.admin-order-detail-dialog__return-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.admin-order-detail-dialog__return-heading > div:not(.admin-order-detail-dialog__workflow-title):not(.admin-order-detail-dialog__workflow-badges) {
  display: grid;
  gap: 5px;
}

.admin-order-detail-dialog__workflow-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.admin-order-detail-dialog__workflow-title > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.admin-order-detail-dialog__workflow-index {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  border-radius: 50%;
  background: #0d1f1e;
  color: #fff !important;
  font-size: 12px !important;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1 !important;
}

.admin-order-detail-dialog__workflow-badges {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-order-detail-dialog__workflow-badges .status {
  flex-shrink: 0;
  min-height: 32px;
  height: 32px;
  font-size: 12px;
  line-height: 1;
}

.admin-order-detail-dialog__workflow-badges .status.status--pending { color: #92400e; }
.admin-order-detail-dialog__workflow-badges .status.status--processing { color: #1e40af; }
.admin-order-detail-dialog__workflow-badges .status.status--completed { color: #065f46; }
.admin-order-detail-dialog__workflow-badges .status.status--danger { color: #991b1b; }

.admin-order-detail-dialog__return-quantity {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: #efe5d8;
  color: #68482f !important;
  font-size: 13px !important;
  font-weight: 800;
  white-space: nowrap;
}

.admin-order-detail-dialog__return-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.admin-order-detail-dialog__return-actions .table-action {
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
}

.admin-order-detail-dialog__refund-account {
  display: grid;
  gap: 12px;
  margin-top: 4px;
  padding-top: 16px;
  border-top: 1px solid rgba(17, 17, 17, 0.1);
}

.admin-order-detail-dialog__refund-account dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.admin-order-detail-dialog__refund-account dl div {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid rgba(17, 17, 17, 0.08);
  border-radius: 8px;
  background: #fff;
}

.admin-order-detail-dialog__refund-account dt {
  color: var(--text-secondary);
  font-size: 13px;
}

.admin-order-detail-dialog__refund-account dd {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  text-align: left;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.admin-order-detail-dialog__refund-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  overflow: hidden;
  border: 1px solid rgba(17, 17, 17, 0.09);
  border-radius: 10px;
  background: rgba(17, 17, 17, 0.09);
}

.admin-order-detail-dialog__refund-summary div {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 14px 16px;
  background: #fff;
}

.admin-order-detail-dialog__refund-summary dt {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.admin-order-detail-dialog__refund-summary dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 800;
}

.admin-order-detail-dialog__refund-summary .admin-order-detail-dialog__refund-amount dd {
  color: #065f46;
  font-size: 18px;
}

.admin-order-detail-dialog__refund-note {
  padding: 12px 14px;
  border-radius: 8px;
  background: #fff;
}

.admin-order-detail-dialog__refund-account-error {
  color: #b42318 !important;
  font-weight: 700;
}

.admin-order-detail-dialog__shipping-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-secondary) !important;
  margin-bottom: -4px;
}

.admin-order-detail-dialog__shipping {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  border: 1px solid rgba(17,17,17,0.07);
  border-radius: 10px;
  overflow: hidden;
}

.admin-order-detail-dialog__shipping-address,
.admin-order-detail-dialog__shipping-note {
  grid-column: 1 / -1;
}

.admin-order-detail-dialog__shipping div {
  display: grid;
  gap: 3px;
  padding: 9px 13px;
  border-bottom: 1px solid rgba(17,17,17,0.055);
}

.admin-order-detail-dialog__shipping div:last-child {
  border-bottom: none;
}

.admin-order-detail-dialog__shipping dt {
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.admin-order-detail-dialog__shipping dd {
  margin: 0;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.45;
}

.admin-order-detail-dialog__cancelled {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  background: rgba(254, 242, 242, 0.8);
  color: var(--danger);
}

.admin-order-detail-dialog__cancelled strong {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-order-detail-dialog__cancelled span,
.admin-order-detail-dialog__cancelled p {
  margin: 0;
  color: #991b1b;
  font-size: 12px;
  line-height: 1.5;
}

.admin-order-detail-dialog__items {
  display: grid;
  gap: 0;
}

.admin-order-detail-dialog__item {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(17,17,17,0.06);
}

.admin-order-detail-dialog__item:last-child {
  border-bottom: none;
}

.admin-order-detail-dialog__item-media {
  display: grid;
  place-items: center;
  width: 78px;
  height: 98px;
  overflow: hidden;
  border-radius: 10px;
  background: rgba(15, 22, 35, 0.04);
  flex-shrink: 0;
}

.admin-order-detail-dialog__item-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.admin-order-detail-dialog__item-media span {
  color: var(--text-secondary);
  font-size: 22px;
  font-weight: 800;
  opacity: 0.3;
}

.admin-order-detail-dialog__item-info {
  display: grid;
  gap: 5px;
}

.admin-order-detail-dialog__item-info strong {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}

.admin-order-detail-dialog__item-info span {
  color: var(--text-secondary);
  font-size: 12px;
}

.admin-order-price {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
}

.admin-order-price__label {
  color: #9a6a13;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-order-price__line {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
}

.admin-order-detail-dialog__item-total {
  display: grid;
  justify-items: end;
  gap: 2px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.admin-order-timeline {
  display: grid;
  gap: 0;
  padding-left: 2px;
}

.admin-order-timeline__item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: 20px;
  position: relative;
}

.admin-order-timeline__item::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 16px;
  bottom: 0;
  width: 1.5px;
  background: linear-gradient(to bottom, rgba(13,59,56,0.09), rgba(13,59,56,0.025));
}

.admin-order-timeline__item:last-child {
  padding-bottom: 0;
}
.admin-order-timeline__item:last-child::before { display: none; }

.admin-order-timeline__item > span {
  width: 14px;
  height: 14px;
  margin-top: 2px;
  border: 2px solid rgba(13,59,56,0.11);
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(13,59,56,0.025);
  z-index: 1;
  flex-shrink: 0;
}

.admin-order-timeline__item--active > span {
  border-color: var(--accent);
  background: var(--accent);
  box-shadow: 0 0 0 4px rgba(168, 139, 114, 0.20);
}

.admin-order-timeline__item--active.admin-order-timeline__item--cancelled > span,
.admin-order-timeline__item--active.admin-order-timeline__item--failed > span {
  border-color: #dc2626;
  background: #fee2e2;
  box-shadow: 0 0 0 4px rgba(220,38,38,0.08);
}

.admin-order-timeline__item--active.admin-order-timeline__item--success > span {
  border-color: #15803d;
  background: #dcfce7;
  box-shadow: 0 0 0 4px rgba(21,128,61,0.10);
}

.admin-order-timeline__item div strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-tertiary);
  line-height: 1.35;
}

.admin-order-timeline__item--active div strong {
  color: var(--text-primary);
}

.admin-order-timeline__item--active.admin-order-timeline__item--cancelled div strong,
.admin-order-timeline__item--active.admin-order-timeline__item--failed div strong {
  color: #dc2626;
}

.admin-order-timeline__item--active.admin-order-timeline__item--success div strong {
  color: #15803d;
}

.admin-order-timeline__item div p {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: rgba(92,116,114,0.58);
}

.admin-order-timeline__item div small {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: rgba(92,116,114,0.58);
  font-style: italic;
}

.admin-order-timeline__item--active div p,
.admin-order-timeline__item--active div small {
  color: var(--text-secondary);
}

@media (max-width: 1180px) {
  .admin-order-detail-dialog__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .admin-order-detail-dialog__grid {
    grid-template-columns: 1fr;
  }
  .admin-order-detail-dialog__refund-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .admin-order-detail-dialog__return-heading {
    flex-direction: column;
  }
  .admin-order-detail-dialog__workflow-badges {
    justify-content: flex-start;
  }
  .admin-order-detail-dialog__refund-summary {
    grid-template-columns: 1fr;
  }
  .admin-order-detail-dialog__refund-account dl {
    grid-template-columns: 1fr;
  }
  .admin-order-detail-dialog__actions {
    align-items: stretch;
    flex-direction: column;
  }
  .admin-order-detail-dialog__actions .table-action {
    width: 100%;
  }
  .admin-order-detail-dialog__item {
    grid-template-columns: 1fr;
  }
  .admin-order-detail-dialog__summary-head {
    flex-direction: column;
  }
  .admin-order-detail-dialog__summary-head,
  .admin-order-detail-dialog__badges {
    justify-content: flex-start;
  }
  .admin-order-detail-dialog__shipping {
    grid-template-columns: 1fr;
  }
  .admin-order-detail-dialog__item-total {
    justify-self: start;
  }
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

.admin-order-detail-dialog__return-item { display: grid; gap: 9px; padding: 16px; border: 1px solid var(--card-border); border-radius: 10px; background: #fff; }
.admin-order-detail-dialog__evidence { display: grid; grid-template-columns: repeat(4, minmax(0, 88px)); gap: 8px; }
.admin-order-detail-dialog__evidence a { overflow: hidden; border: 1px solid var(--card-border); border-radius: 8px; background: #f4f1ed; }
.admin-order-detail-dialog__evidence img { display: block; width: 100%; aspect-ratio: 1; object-fit: cover; }
.admin-order-detail-dialog__return-item label { display: grid; gap: 5px; font-size: 13px; font-weight: 700; }
.admin-order-detail-dialog__return-item input[type='number'],
.admin-order-detail-dialog__return-item input[type='text'] { min-height: 38px; padding: 8px 10px; border: 1px solid var(--card-border); border-radius: 7px; font: inherit; }
.admin-order-detail-dialog__inspection-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.admin-order-detail-dialog__checkbox { display: flex !important; align-items: center; gap: 8px !important; grid-column: 1 / -1; }

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

@media (min-width: 1440px) {
  .admin-order-detail-dialog__body {
    gap: 22px;
  }

  .admin-order-detail-dialog__grid {
    gap: 18px;
  }

  .admin-order-detail-dialog__card {
    gap: 19px;
    padding: 24px;
  }

  .admin-panel__eyebrow,
  .admin-order-detail-dialog__shipping-title,
  .admin-order-detail-dialog__card h3 {
    font-size: 15px;
  }

  .admin-order-detail-dialog__summary-head h3 {
    font-size: 21px;
  }

  .admin-order-detail-dialog__summary-head > div:first-child > span {
    font-size: 14px;
  }

  .admin-order-detail-dialog__facts div,
  .admin-order-detail-dialog__shipping div {
    padding: 12px 16px;
  }

  .admin-order-detail-dialog__facts dt,
  .admin-order-detail-dialog__return span,
  .admin-order-detail-dialog__return p,
  .admin-order-detail-dialog__cancelled span,
  .admin-order-detail-dialog__cancelled p,
  .admin-order-detail-dialog__item-info span,
  .admin-order-timeline__item div p,
  .admin-order-timeline__item div small,
  .table-status-note {
    font-size: 14px;
  }

  .admin-order-detail-dialog__facts dd,
  .admin-order-detail-dialog__return strong,
  .admin-order-detail-dialog__shipping dd,
  .admin-order-detail-dialog__item-info strong,
  .admin-order-detail-dialog__item-total,
  .admin-order-timeline__item div strong {
    font-size: 16px;
  }

  .admin-order-detail-dialog__shipping dt,
  .admin-order-price__label,
  .admin-order-detail-dialog__return-item label,
  .admin-order-detail-dialog__refund-summary dt,
  .admin-order-detail-dialog__refund-account dt {
    font-size: 13px;
  }

  .admin-order-detail-dialog__refund-summary dd,
  .admin-order-detail-dialog__refund-account dd {
    font-size: 16px;
  }

  .admin-order-detail-dialog__refund-summary .admin-order-detail-dialog__refund-amount dd {
    font-size: 20px;
  }

  .admin-order-detail-dialog__workflow-index {
    width: 40px;
    height: 40px;
    flex-basis: 40px;
    font-size: 14px !important;
  }

  .admin-order-detail-dialog__cancelled {
    gap: 7px;
    padding: 18px 20px;
  }

  .admin-order-detail-dialog__cancelled strong {
    font-size: 15px;
  }

  .admin-order-detail-dialog__item {
    grid-template-columns: 88px minmax(0, 1fr) auto;
    gap: 20px;
    padding: 18px 0;
  }

  .admin-order-detail-dialog__item-media {
    width: 88px;
    height: 112px;
  }
}

@media (min-width: 1920px) {
  .admin-order-detail-dialog__body {
    gap: 28px;
  }

  .admin-order-detail-dialog__grid {
    gap: 22px;
  }

  .admin-order-detail-dialog__card {
    gap: 24px;
    padding: 30px;
  }

  .admin-panel__eyebrow,
  .admin-order-detail-dialog__shipping-title,
  .admin-order-detail-dialog__card h3 {
    font-size: 18px;
  }

  .admin-order-detail-dialog__summary-head h3 {
    font-size: 25px;
  }

  .admin-order-detail-dialog__summary-head > div:first-child > span {
    font-size: 17px;
  }

  .admin-order-detail-dialog__facts div,
  .admin-order-detail-dialog__shipping div {
    padding: 15px 19px;
  }

  .admin-order-detail-dialog__facts dt,
  .admin-order-detail-dialog__return span,
  .admin-order-detail-dialog__return p,
  .admin-order-detail-dialog__cancelled span,
  .admin-order-detail-dialog__cancelled p,
  .admin-order-detail-dialog__item-info span,
  .admin-order-timeline__item div p,
  .admin-order-timeline__item div small,
  .table-status-note {
    font-size: 17px;
  }

  .admin-order-detail-dialog__facts dd,
  .admin-order-detail-dialog__return strong,
  .admin-order-detail-dialog__shipping dd,
  .admin-order-detail-dialog__item-info strong,
  .admin-order-detail-dialog__item-total,
  .admin-order-timeline__item div strong {
    font-size: 19px;
  }

  .admin-order-detail-dialog__shipping dt,
  .admin-order-price__label,
  .admin-order-detail-dialog__return-item label,
  .admin-order-detail-dialog__refund-summary dt,
  .admin-order-detail-dialog__refund-account dt {
    font-size: 15px;
  }

  .admin-order-detail-dialog__refund-summary dd,
  .admin-order-detail-dialog__refund-account dd {
    font-size: 18px;
  }

  .admin-order-detail-dialog__refund-summary .admin-order-detail-dialog__refund-amount dd {
    font-size: 23px;
  }

  .admin-order-detail-dialog__workflow-index {
    width: 46px;
    height: 46px;
    flex-basis: 46px;
    font-size: 16px !important;
  }

  .admin-order-detail-dialog__cancelled {
    gap: 9px;
    padding: 22px 24px;
  }

  .admin-order-detail-dialog__cancelled strong {
    font-size: 18px;
  }

  .admin-order-detail-dialog__item {
    grid-template-columns: 102px minmax(0, 1fr) auto;
    gap: 24px;
    padding: 22px 0;
  }

  .admin-order-detail-dialog__item-media {
    width: 102px;
    height: 130px;
  }

  .table-action {
    height: 44px;
    padding: 0 19px;
    font-size: 16px;
  }

  .status,
  .stock-change {
    min-height: 32px;
    height: 32px;
    font-size: 15px;
  }
}

@media (min-width: 2560px) {
  .admin-order-detail-dialog__body {
    gap: 34px;
  }

  .admin-order-detail-dialog__grid {
    gap: 28px;
  }

  .admin-order-detail-dialog__card {
    gap: 30px;
    padding: 38px;
  }

  .admin-panel__eyebrow,
  .admin-order-detail-dialog__shipping-title,
  .admin-order-detail-dialog__card h3 {
    font-size: 21px;
  }

  .admin-order-detail-dialog__summary-head h3 {
    font-size: 30px;
  }

  .admin-order-detail-dialog__summary-head > div:first-child > span {
    font-size: 20px;
  }

  .admin-order-detail-dialog__facts div,
  .admin-order-detail-dialog__shipping div {
    padding: 18px 23px;
  }

  .admin-order-detail-dialog__facts dt,
  .admin-order-detail-dialog__return span,
  .admin-order-detail-dialog__return p,
  .admin-order-detail-dialog__cancelled span,
  .admin-order-detail-dialog__cancelled p,
  .admin-order-detail-dialog__item-info span,
  .admin-order-timeline__item div p,
  .admin-order-timeline__item div small,
  .table-status-note {
    font-size: 20px;
  }

  .admin-order-detail-dialog__facts dd,
  .admin-order-detail-dialog__return strong,
  .admin-order-detail-dialog__shipping dd,
  .admin-order-detail-dialog__item-info strong,
  .admin-order-detail-dialog__item-total,
  .admin-order-timeline__item div strong {
    font-size: 22px;
  }

  .admin-order-detail-dialog__shipping dt,
  .admin-order-price__label,
  .admin-order-detail-dialog__return-item label,
  .admin-order-detail-dialog__refund-summary dt,
  .admin-order-detail-dialog__refund-account dt {
    font-size: 18px;
  }

  .admin-order-detail-dialog__refund-summary dd,
  .admin-order-detail-dialog__refund-account dd {
    font-size: 21px;
  }

  .admin-order-detail-dialog__refund-summary .admin-order-detail-dialog__refund-amount dd {
    font-size: 26px;
  }

  .admin-order-detail-dialog__workflow-index {
    width: 54px;
    height: 54px;
    flex-basis: 54px;
    font-size: 18px !important;
  }

  .admin-order-detail-dialog__cancelled {
    gap: 11px;
    padding: 27px 30px;
  }

  .admin-order-detail-dialog__cancelled strong {
    font-size: 21px;
  }

  .admin-order-detail-dialog__item {
    grid-template-columns: 120px minmax(0, 1fr) auto;
    gap: 30px;
    padding: 28px 0;
  }

  .admin-order-detail-dialog__item-media {
    width: 120px;
    height: 152px;
  }

  .table-action {
    height: 52px;
    padding: 0 24px;
    font-size: 18px;
  }

  .status,
  .stock-change {
    min-height: 38px;
    height: 38px;
    padding: 0 14px;
    font-size: 17px;
  }
}

</style>
