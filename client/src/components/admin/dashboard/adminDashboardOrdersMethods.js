import { catalogStore } from '../../../stores/catalogStore';
import {
  fetchAdminOrderDetail,
  primeAdminOrderDetail,
  readAdminOrderDetail
} from '../../../stores/adminOrderDetailStore';
import { flash } from '../../../helpers/flash';
import { adminApi } from '../../../services/adminApi';

// Product deletion and admin order workflow actions.
export const adminDashboardOrderMethods = {
closeDeleteProductConfirm() {
      this.pendingProductDelete = null;
    },
async confirmDeleteProduct() {
      const product = this.pendingProductDelete;

      if (!product) {
        return;
      }

      const response = await adminApi.deleteProduct(product.id);

      if (!response) {
        return;
      }

      catalogStore.removeProduct(product.id);
      this.pendingProductDelete = null;
      await Promise.all([
        this.loadProducts(),
        this.loadCategories(),
        this.loadDashboard()
      ]);

      flash(response.message || 'Product archived successfully.', 'success');
    },
async saveOrderChanges(order) {
      const action = this.nextOrderAction(order);

      if (!action || this.isOrderSaving(order.id)) {
        return;
      }

      this.pendingOrderSave = order;
    },
closeOrderSaveConfirm() {
      this.pendingOrderSave = null;
    },
requestCancelOrder(order) {
      if (!this.canCancelOrder(order) || this.isOrderSaving(order.id)) {
        return;
      }

      this.pendingOrderCancel = order;
      this.pendingOrderCancelReason = '';
    },
closeOrderCancelConfirm() {
      this.pendingOrderCancel = null;
      this.pendingOrderCancelReason = '';
    },
async confirmOrderChanges() {
      const order = this.pendingOrderSave;

      if (!order || this.isOrderSaving(order.id)) {
        return;
      }

      const action = this.nextOrderAction(order);
      this.pendingOrderSave = null;

      if (!action) {
        return;
      }

      this.savingOrders = {
        ...this.savingOrders,
        [order.id]: true
      };

      let updatedOrder;
      try {
        updatedOrder = await adminApi.updateAdminOrder(order.id, {
          orderStatus: action.nextStatus
        });
      } finally {
        this.savingOrders = {
          ...this.savingOrders,
          [order.id]: false
        };
      }

      if (!updatedOrder) {
        this.syncOrderEdits();
        return;
      }

      this.orders = this.orders.map(existingOrder => (existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder));
      this.syncSelectedAdminOrderDetailOrder(updatedOrder);
      this.syncOrderEdits();

      this.recentOrders = this.recentOrders.map(existingOrder =>
        existingOrder.id === updatedOrder.id ? { ...existingOrder, ...updatedOrder } : existingOrder
      );

      flash('Order status updated successfully.', 'success');
      this.loadDashboard();
    },
async confirmCancelOrder() {
      const order = this.pendingOrderCancel;
      const reason = this.pendingOrderCancelReason.trim();

      if (!order || !reason || this.isOrderSaving(order.id)) {
        return;
      }

      this.pendingOrderCancel = null;
      this.pendingOrderCancelReason = '';
      this.savingOrders = {
        ...this.savingOrders,
        [order.id]: true
      };

      let response;
      try {
        response = await adminApi.cancelAdminOrder(order.id, { reason });
      } finally {
        this.savingOrders = {
          ...this.savingOrders,
          [order.id]: false
        };
      }
      const updatedOrder = response && response.order ? response.order : response;

      if (!updatedOrder) {
        return;
      }

      this.orders = this.orders.map(existingOrder => (existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder));
      this.syncSelectedAdminOrderDetailOrder(updatedOrder);
      this.syncOrderEdits();
      flash(
        response && response.voucherReleased
          ? 'Order cancelled and the customer coupon was restored.'
          : 'Order cancelled successfully.',
        'success'
      );
      this.loadDashboard();
    },
async openAdminOrderDetail(order, sourceSection = '') {
      if (!order || !order.id) {
        return;
      }

      const from = ['orders', 'payments', 'requests'].includes(sourceSection)
        ? sourceSection
        : (['orders', 'payments', 'requests'].includes(this.currentSection) ? this.currentSection : 'orders');
      this.saveAdminListViewState(from);
      this.prefetchAdminOrderDetail(order);

      await this.$router.push({
        name: 'studio-order-detail',
        params: { orderId: String(order.id) },
        query: {
          from,
          returnFocus: String(order.id)
        }
      });
    },
prefetchAdminOrderDetail(order) {
      const orderId = String(order && (order.id || order.orderId) || '').trim();
      if (!orderId) return;

      import('../../../views/admin/orders/AdminOrderDetail.vue');
      fetchAdminOrderDetail(orderId);
    },
async loadAdminOrderDetail(orderId) {
      const normalizedOrderId = String(orderId || '').trim();

      if (!normalizedOrderId) {
        return;
      }

      const cached = readAdminOrderDetail(normalizedOrderId);
      if (cached && cached.order) {
        this.selectedAdminOrderDetail = {
          ...cached,
          returnRequest: this.normalizeAdminReturnRequest(cached.returnRequest || null)
        };
      } else {
        this.selectedAdminOrderDetail = null;
      }
      this.isLoadingAdminOrderDetail = !cached;
      this.updateAdminTitle();
      const response = await fetchAdminOrderDetail(normalizedOrderId);

      if (!response || !response.order) {
        this.isLoadingAdminOrderDetail = false;
        this.updateAdminTitle();
        flash('Unable to load order detail.', 'error');
        if (this.$route.name === 'studio-order-detail') {
          await this.$router.replace(this.orderDetailBackTarget || { name: 'studio-orders' });
        }
        return;
      }

      const needsFullReturn = response.returnRequest &&
        response.returnRequest.id &&
        !Array.isArray(response.returnRequest.items);
      const returnResponse = needsFullReturn
        ? await adminApi.getAdminReturnRequest(response.returnRequest.id)
        : null;

      const detail = {
        order: response.order,
        items: Array.isArray(response.items) ? response.items : [],
        timeline: Array.isArray(response.timeline) ? response.timeline : [],
        returnRequest: this.normalizeAdminReturnRequest(returnResponse && returnResponse.returnRequest
          ? returnResponse.returnRequest
          : (response.returnRequest || null)),
        refundRequest: response.refundRequest || null
      };
      primeAdminOrderDetail(detail);
      this.selectedAdminOrderDetail = detail;
      this.isLoadingAdminOrderDetail = false;
      this.updateAdminTitle();
    },
closeAdminOrderDetail() {
      if (this.isLoadingAdminOrderDetail) {
        return;
      }

      this.selectedAdminOrderDetail = null;
      this.updateAdminTitle();
      if (this.$route.name === 'studio-order-detail') {
        this.$router.push(this.orderDetailBackTarget || { name: 'studio-orders' });
      }
    },
async openAdminOrderFromLink(orderId) {
      const normalizedOrderId = String(orderId || '').trim();

      if (!normalizedOrderId) {
        return;
      }

      await this.openAdminOrderDetail({ id: normalizedOrderId });
    },
async openRequestOrderDetail(request) {
      const orderId = request && request.orderId;

      if (!orderId) {
        return;
      }

      await this.openAdminOrderDetail({ id: orderId }, this.currentSection);
    },
async refreshSelectedAdminOrderDetail(orderId) {
      if (!this.selectedAdminOrderDetail || String(this.selectedAdminOrderDetail.order.id) !== String(orderId)) {
        return;
      }

      const response = await fetchAdminOrderDetail(orderId, { force: true });

      if (!response || !response.order) {
        return;
      }

      const needsFullReturn = response.returnRequest &&
        response.returnRequest.id &&
        !Array.isArray(response.returnRequest.items);
      const returnResponse = needsFullReturn
        ? await adminApi.getAdminReturnRequest(response.returnRequest.id)
        : null;

      const detail = {
        order: response.order,
        items: Array.isArray(response.items) ? response.items : [],
        timeline: Array.isArray(response.timeline) ? response.timeline : [],
        returnRequest: this.normalizeAdminReturnRequest(returnResponse && returnResponse.returnRequest
          ? returnResponse.returnRequest
          : (response.returnRequest || null)),
        refundRequest: response.refundRequest || null
      };
      primeAdminOrderDetail(detail);
      this.selectedAdminOrderDetail = detail;
      this.updateAdminTitle();
    },
requestApproveRefundRequest(refundRequest) {
      if (!this.canApproveRefundRequest(refundRequest)) {
        return;
      }

      this.openConfirm({
        title: 'Start manual refund?',
        message: 'This records that an admin has started the manual QR bank-transfer refund. It does not transfer money.',
        confirmLabel: 'Start processing',
        onConfirm: async () => {
          const response = await adminApi.startAdminRefund(refundRequest.id);
          if (!response || !response.refund) return;
          this.syncSelectedAdminOrderDetailRefundRequest(response.refund);
          this.loadRequests();
          flash('Refund processing started.', 'success');
        }
      });
    },
requestRejectRefundRequest(refundRequest) {
      if (!this.canRejectRefundRequest(refundRequest)) {
        return;
      }

      this.openConfirm({
        title: 'Mark refund failed?',
        message: 'Record why the manual transfer failed. The same refund can be retried without creating a duplicate.',
        confirmLabel: 'Mark failed',
        fields: { failureReason: '' },
        fieldConfig: [{ key: 'failureReason', label: 'Failure reason', multiline: true, required: true }],
        onConfirm: async fields => {
          const response = await adminApi.failAdminRefund(refundRequest.id, fields);
          if (!response || !response.refund) return;
          this.syncSelectedAdminOrderDetailRefundRequest(response.refund);
          this.loadRequests();
          flash('Refund failure recorded.', 'success');
        }
      });
    },
requestCompleteRefund(refundRequest) {
      if (!this.canCompleteRefund(refundRequest)) return;
      this.openConfirm({
        title: 'Confirm manual refund completed?',
        message: `Confirm that ${refundRequest.requestedAmount || 0} VND was transferred manually. The amount cannot be edited here.`,
        confirmLabel: 'Complete refund',
        fields: { transactionReference: '', adminNote: '' },
        fieldConfig: [
          { key: 'transactionReference', label: 'Bank transaction reference', required: true },
          { key: 'adminNote', label: 'Admin note', multiline: true }
        ],
        onConfirm: async fields => {
          const response = await adminApi.completeAdminRefund(refundRequest.id, fields);
          if (!response || !response.refund) return;
          this.syncSelectedAdminOrderDetailRefundRequest(response.refund);
          this.loadRequests();
          this.loadOrders();
          this.loadDashboard();
          flash('Refund completed.', 'success');
        }
      });
    },
requestRetryRefund(refundRequest) {
      if (!this.canRetryRefund(refundRequest)) return;
      this.openConfirm({
        title: 'Retry this refund?',
        message: 'The existing failed refund will return to processing; no duplicate refund is created.',
        confirmLabel: 'Retry refund',
        onConfirm: async () => {
          const response = await adminApi.retryAdminRefund(refundRequest.id);
          if (!response || !response.refund) return;
          this.syncSelectedAdminOrderDetailRefundRequest(response.refund);
          this.loadRequests();
          flash('Refund returned to processing.', 'success');
        }
      });
    },
requestDeliveryFailedOrder(order) {
      if (!this.canMarkDeliveryFailed(order) || this.isOrderSaving(order.id)) {
        return;
      }

      this.openConfirm({
        title: 'Mark delivery failed?',
        message: Number(order.deliveryRetryCount || 0) >= 1
          ? 'The delivery retry has also failed. No retries remain; return the package to the warehouse.'
          : 'This keeps inventory reserved. The order can be retried for delivery one more time.',
        confirmLabel: 'Mark failed',
        onConfirm: async () => {
          this.savingOrders = {
            ...this.savingOrders,
            [order.id]: true
          };
          const updatedOrder = await adminApi.markAdminDeliveryFailed(order.id);
          this.savingOrders = {
            ...this.savingOrders,
            [order.id]: false
          };

          if (!updatedOrder) return;
          this.orders = this.orders.map(existingOrder => (existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder));
          this.syncSelectedAdminOrderDetailOrder(updatedOrder);
          this.syncOrderEdits();
          await this.refreshSelectedAdminOrderDetail(updatedOrder.id);
          flash('Delivery marked as failed.', 'success');
          this.loadDashboard();
        }
      });
    },
requestReturnedToWarehouse(order) {
      if (!this.canMarkReturnedToWarehouse(order) || this.isOrderSaving(order.id)) {
        return;
      }

      this.openConfirm({
        title: 'Package returned to warehouse?',
        message: 'This releases reserved inventory and cancels the order. Paid bank transfer orders will move to refund pending.',
        confirmLabel: 'Release inventory',
        onConfirm: async () => {
          this.savingOrders = {
            ...this.savingOrders,
            [order.id]: true
          };
          const updatedOrder = await adminApi.markAdminReturnedToWarehouse(order.id);
          this.savingOrders = {
            ...this.savingOrders,
            [order.id]: false
          };

          if (!updatedOrder) return;
          this.orders = this.orders.map(existingOrder => (existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder));
          this.syncSelectedAdminOrderDetailOrder(updatedOrder);
          this.syncOrderEdits();
          await this.refreshSelectedAdminOrderDetail(updatedOrder.id);
          flash('Package returned and inventory released.', 'success');
          this.loadDashboard();
        }
      });
    },
requestApproveReturnRequest(returnRequest) {
      if (!this.canApproveReturnRequest(returnRequest)) {
        return;
      }

      this.openConfirm({
        title: 'Approve return?',
        message: 'The customer can send the item back after approval. Inventory will not change yet.',
        confirmLabel: 'Approve return',
        onConfirm: async () => {
          const response = await adminApi.approveAdminReturnRequest(returnRequest.id, {
            items: (returnRequest.items || []).map(item => ({
              returnItemId: item.id,
              approvedQuantity: Number(item.approvalDecisionQuantity ?? item.requestedQuantity ?? 0)
            }))
          });
          if (!response || !response.returnRequest) return;
          this.syncSelectedAdminOrderDetailReturnRequest(response.returnRequest);
          await this.loadRequests();
          flash('Return request approved.', 'success');
        }
      });
    },
requestRejectReturnRequest(returnRequest) {
      if (!this.canRejectReturnRequest(returnRequest)) {
        return;
      }

      this.openConfirm({
        title: 'Reject return?',
        message: 'The order and inventory will stay unchanged.',
        confirmLabel: 'Reject return',
        fields: { rejectionReason: '' },
        fieldConfig: [{ key: 'rejectionReason', label: 'Rejection reason', multiline: true, required: true }],
        onConfirm: async fields => {
          const response = await adminApi.rejectAdminReturnRequest(returnRequest.id, fields);
          if (!response || !response.returnRequest) return;
          this.syncSelectedAdminOrderDetailReturnRequest(response.returnRequest);
          await this.loadRequests();
          flash('Return request rejected.', 'success');
        }
      });
    },
requestReceiveReturnRequest(returnRequest) {
      if (!this.canReceiveReturnRequest(returnRequest)) {
        return;
      }

      this.openConfirm({
        title: 'Confirm products received?',
        message: 'This records received quantities only. Inventory and refunds remain unchanged until inspection.',
        confirmLabel: 'Confirm received',
        onConfirm: async () => {
          const response = await adminApi.receiveAdminReturnRequest(returnRequest.id, {
            items: (returnRequest.items || []).map(item => ({
              returnItemId: item.id,
              receivedQuantity: Number(item.receiptDecisionQuantity ?? item.approvedQuantity ?? 0)
            }))
          });
          if (!response || !response.returnRequest) return;
          this.syncSelectedAdminOrderDetailReturnRequest(response.returnRequest);
          await this.loadRequests();
          flash('Returned products received; inventory is unchanged pending inspection.', 'success');
        }
      });
    },
requestStartReturnInspection(returnRequest) {
      if (!this.canStartReturnInspection(returnRequest)) return;
      this.openConfirm({
        title: 'Start product inspection?',
        message: 'Inspection decisions will determine refund quantities and whether accepted products are restockable.',
        confirmLabel: 'Start inspection',
        onConfirm: async () => {
          const response = await adminApi.startAdminReturnInspection(returnRequest.id);
          if (!response || !response.returnRequest) return;
          const next = {
            ...response.returnRequest,
            items: (response.returnRequest.items || []).map(item => ({
              ...item,
              inspectionAcceptedQuantity: item.receivedQuantity,
              inspectionRejectedQuantity: 0,
              inspectionRestockable: true,
              inspectionRejectionReason: ''
            }))
          };
          this.syncSelectedAdminOrderDetailReturnRequest(next);
          await this.loadRequests();
        }
      });
    },
requestInspectReturn(returnRequest) {
      if (!this.canInspectReturnRequest(returnRequest)) return;
      this.openConfirm({
        title: 'Submit inspection result?',
        message: 'Accepted quantities create one pending refund. Only accepted restockable quantities restore inventory.',
        confirmLabel: 'Submit inspection',
        onConfirm: async () => {
          const response = await adminApi.inspectAdminReturnRequest(returnRequest.id, {
            items: (returnRequest.items || []).map(item => ({
              returnItemId: item.id,
              acceptedQuantity: Number(item.inspectionAcceptedQuantity || 0),
              rejectedQuantity: Number(item.inspectionRejectedQuantity || 0),
              restockable: Boolean(item.inspectionRestockable),
              conditionCode: item.inspectionConditionCode || '',
              inspectionNote: item.inspectionNote || '',
              rejectionReason: item.inspectionRejectionReason || ''
            }))
          });
          if (!response || !response.returnRequest) return;
          this.syncSelectedAdminOrderDetailReturnRequest(response.returnRequest);
          if (response.refund) this.syncSelectedAdminOrderDetailRefundRequest(response.refund);
          await Promise.all([this.loadRequests(), this.loadOrders(), this.loadDashboard()]);
          flash(response.refund ? 'Inspection accepted; refund created.' : 'Inspection rejected; no refund created.', 'success');
        }
      });
    }
};
