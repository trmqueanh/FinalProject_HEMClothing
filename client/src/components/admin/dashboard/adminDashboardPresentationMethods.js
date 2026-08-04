import { EMPTY_CATEGORY_FORM, EMPTY_COLLECTION_FORM, EMPTY_VOUCHER_FORM, ORDER_ACTIONS, ORDER_STATE_COPY } from '../../../helpers/admin/adminDashboardConfig';
import { adminOrderStatusColor } from '../../../helpers/admin/adminChartPresentation';
import {
  adminOrderStatusClass,
  adminPaymentStatusClass,
  adminWorkflowStatusClass
} from '../../../helpers/admin/adminStatusPresentation';
import { itemPriceTone, orderItemComparePrice, orderItemHasComparePrice, orderItemPrice, priceLabel } from '../../../helpers/cart/cartItemHelpers';
import { formatVietnamDate, toVietnamDateTimeLocal } from '../../../helpers/dateTime';
import { formatCurrency } from '../../../utils/formatCurrency';

const formatCancellationReason = value => {
  const reason = String(value || '').trim();
  const normalized = reason.toLowerCase().replace(/\.$/, '');

  if (normalized === 'delivery_failed' || normalized === 'package returned to warehouse after failed delivery') {
    return 'Delivery failed';
  }

  return reason;
};

// Display formatters, labels, form preparation, and order state helpers.
export const adminDashboardPresentationMethods = {
formatCurrency,
dashboardMetric(value, type = 'number') {
      if (this.isSectionLoading('dashboard') && !this.hasLoadedDashboard) {
        return 'Loading';
      }

      if (type === 'currency') {
        return this.formatCurrency(value || 0);
      }

      return Number(value || 0).toLocaleString('en-US');
    },
formatDate(value) {
      return formatVietnamDate(value, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }, 'No date');
    },
formatShortDate(value) {
      return formatVietnamDate(value, {
        month: 'short',
        day: 'numeric'
      });
    },
formatOrderTableDate(value) {
      return formatVietnamDate(value, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }, 'No date');
    },
formatMonthLabel(value) {
      return formatVietnamDate(value, {
        month: 'short'
      });
    },
formatLabel(value) {
      if (String(value || '').toLowerCase() === 'cancelled') {
        return 'Canceled';
      }

      return String(value || '')
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    },
formatPaymentMethodLabel(value) {
      const paymentMethod = String(value || '').toLowerCase();

      if (paymentMethod === 'cod') {
        return 'Cash on Delivery';
      }

      if (paymentMethod === 'bank_transfer') {
        return 'Bank Transfer (QR Code)';
      }

      return this.formatLabel(value);
    },
formatOrderPaymentStatus(value) {
      const status = String(value || '').trim().toLowerCase();
      const labels = {
        pending_payment: 'Pending',
        payment_under_review: 'Under review',
        paid: 'Paid',
        payment_expired: 'Expired',
        payment_cancelled: 'Cancelled',
        payment_rejected: 'Rejected',
        partially_refunded: 'Partial refund',
        partial_refund: 'Partial refund',
        refund_pending: 'Refund pending',
        refunded: 'Refunded'
      };

      return labels[status] || this.formatLabel(value);
    },
formatFullShippingAddress(order) {
      return [
        order && order.shippingAddressLine,
        order && order.shippingWard,
        order && order.shippingDistrict,
        order && order.shippingCity
      ]
        .map(value => String(value || '').trim())
        .filter(Boolean)
        .join(', ') || '-';
    },
formatCategoryRowLabel(category) {
      return category.label || this.formatLabel(category.name);
    },
categoryOptionsForGender(gender) {
      const selectedGender = String(gender || '').trim().toLowerCase();

      if (!selectedGender) {
        return [];
      }

      return this.categoryFilterOptions.filter(category => {
        const department = String(
          category.departmentName ||
          category.department ||
          category.gender ||
          ''
        ).trim().toLowerCase();

        return department === selectedGender;
      });
    },
productGroupOptionsForGender(gender) {
      const selectedGender = String(gender || '').trim().toLowerCase();
      const sourceGroups = Array.isArray(this.productGroups) && this.productGroups.length
        ? this.productGroups
        : this.departments
          .filter(department => !selectedGender || String(department.name || '').toLowerCase() === selectedGender)
          .flatMap(department => Array.isArray(department.groups) ? department.groups : []);
      const groupsByValue = new Map();

      sourceGroups.forEach(group => {
        const value = String(group.slug || group.name || '').trim();

        if (!value || groupsByValue.has(value)) {
          return;
        }

        groupsByValue.set(value, {
          id: group.id || value,
          value,
          label: group.label || group.name || value
        });
      });

      return [...groupsByValue.values()].sort((left, right) => left.label.localeCompare(right.label));
    },
categoryOptionsForGenderAndGroup(gender, productGroup) {
      const selectedGender = String(gender || '').trim().toLowerCase();
      const selectedGroup = String(productGroup || '').trim().toLowerCase();

      if (!selectedGender) {
        return [];
      }

      return this.categoryFilterOptions.filter(category => {
        const department = String(
          category.departmentName ||
          category.department ||
          category.gender ||
          ''
        ).trim().toLowerCase();
        const groupValues = [
          category.productGroupSlug,
          category.productGroup,
          category.productGroupLabel
        ].map(value => String(value || '').trim().toLowerCase());

        return department === selectedGender && (!selectedGroup || groupValues.includes(selectedGroup));
      });
    },
formatPricing(product) {
      const pricingMode = String(product.pricingMode || product.pricing_mode || '').toLowerCase();
      const activePrice = Number(product.price || 0);
      const originalPrice = Number(product.originalPrice ?? product.original_price ?? activePrice);

      if (pricingMode === 'sale' || product.isSale) {
        return `Sale ${this.formatCurrency(activePrice)} / Original ${this.formatCurrency(originalPrice)}`;
      }

      return this.formatCurrency(activePrice);
    },
starRating(value) {
      const rating = Math.min(Math.max(Math.round(Number(value || 0)), 0), 5);
      return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
    },
statusColor(index, status) {
      return adminOrderStatusColor(status, index);
    },
onBarHover(event, label, type, value, color) {
      const rect = event.target.closest('.admin-chart__outer').getBoundingClientRect();
      const barRect = event.target.getBoundingClientRect();
      this.chartHover = {
        label,
        type,
        value,
        color,
        x: barRect.left - rect.left + barRect.width / 2,
        y: barRect.top - rect.top - 12
      };
    },
resetCategoryForm() {
      this.categoryForm = EMPTY_CATEGORY_FORM();
    },
resetCollectionForm() {
      this.collectionForm = EMPTY_COLLECTION_FORM();
    },
resetVoucherForm() {
      this.voucherForm = EMPTY_VOUCHER_FORM();
    },
editCategory(category) {
      this.categoryForm = {
        id: category.id,
        name: category.name,
        label: category.label,
        slug: category.slug,
        departmentId: category.departmentId || '',
        productGroupId: category.productGroupId || '',
        status: category.status || 'active'
      };
    },
editCollection(collection) {
      this.collectionForm = {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        bannerImage: collection.bannerImage || '',
        status: collection.status || 'active'
      };
    },
editVoucher(voucher) {
      this.voucherForm = {
        id: voucher.id,
        code: voucher.code,
        discountType: voucher.discountType || 'percent',
        discountValue: voucher.discountValue || 0,
        minOrderAmount: voucher.minOrderAmount || 0,
        maxDiscountAmount: voucher.maxDiscountAmount === null ? '' : voucher.maxDiscountAmount,
        startDate: toVietnamDateTimeLocal(voucher.startDate),
        endDate: toVietnamDateTimeLocal(voucher.endDate),
        usageLimit: voucher.usageLimit === null ? '' : voucher.usageLimit,
        status: voucher.status || 'active'
      };
    },
shortOrderId(value) {
      return String(value || '').slice(0, 8).toUpperCase();
    },
orderTableItems(order) {
      const itemCollections = [
        order && order.items,
        order && order.orderItems,
        order && order.products
      ];

      return itemCollections.find(collection => Array.isArray(collection)) || [];
    },
orderTableProductSummary(order) {
      const items = this.orderTableItems(order);

      if (!items.length) {
        return '';
      }

      const firstItem = items.find(item => item && (item.productName || item.name || item.title));

      if (!firstItem) {
        return '';
      }

      const firstName = firstItem.productName || firstItem.name || firstItem.title;
      const moreCount = Math.max(0, items.length - 1);
      return moreCount > 0 ? `${firstName} +${moreCount} more` : firstName;
    },
syncOrderEdits() {
      this.orderEdits = this.orders.reduce((accumulator, order) => {
        accumulator[order.id] = {
          orderStatus: order.orderStatus
        };
        return accumulator;
      }, {});
    },
normalizeAdminReturnRequest(returnRequest) {
      if (!returnRequest) return null;
      return {
        ...returnRequest,
        items: (returnRequest.items || []).map(item => ({
          ...item,
          approvalDecisionQuantity: item.approvalDecisionQuantity ?? item.requestedQuantity,
          receiptDecisionQuantity: item.receiptDecisionQuantity ?? item.approvedQuantity,
          inspectionAcceptedQuantity: item.inspectionAcceptedQuantity ?? item.receivedQuantity,
          inspectionRejectedQuantity: item.inspectionRejectedQuantity ?? 0,
          inspectionRestockable: item.inspectionRestockable ?? true,
          inspectionConditionCode: item.inspectionConditionCode || '',
          inspectionRejectionReason: item.inspectionRejectionReason || '',
          inspectionNote: item.inspectionNote || ''
        }))
      };
    },
syncSelectedAdminOrderDetailOrder(updatedOrder) {
      if (
        !updatedOrder ||
        !this.selectedAdminOrderDetail ||
        String(this.selectedAdminOrderDetail.order.id) !== String(updatedOrder.id)
      ) {
        return;
      }

      this.selectedAdminOrderDetail = {
        ...this.selectedAdminOrderDetail,
        order: {
          ...this.selectedAdminOrderDetail.order,
          ...updatedOrder
        }
      };
    },
syncSelectedAdminOrderDetailReturnRequest(returnRequest) {
      if (!this.selectedAdminOrderDetail || !returnRequest) {
        return;
      }

      const normalizedReturn = this.normalizeAdminReturnRequest(returnRequest);
      const returnHistory = this.selectedAdminOrderDetail.returnRequests || [];
      const hasHistoryEntry = returnHistory.some(request => String(request.id) === String(returnRequest.id));
      const refunds = Array.isArray(normalizedReturn.refunds) ? normalizedReturn.refunds : [];
      this.selectedAdminOrderDetail = {
        ...this.selectedAdminOrderDetail,
        returnRequest: normalizedReturn,
        returnRequests: hasHistoryEntry
          ? returnHistory.map(request =>
          String(request.id) === String(returnRequest.id)
            ? normalizedReturn
            : request
          )
          : [normalizedReturn, ...returnHistory],
        refundRequest: refunds.length ? refunds[refunds.length - 1] : null
      };
    },
syncSelectedAdminOrderDetailRefundRequest(refundRequest) {
      if (!this.selectedAdminOrderDetail || !refundRequest) {
        return;
      }

      this.selectedAdminOrderDetail = {
        ...this.selectedAdminOrderDetail,
        refundRequest
      };
    },
isOrderDirty(order) {
      const edit = this.orderEdits[order.id];

      if (!edit) {
        return false;
      }

      return edit.orderStatus !== order.orderStatus;
    },
isOrderSaving(orderId) {
      return Boolean(this.savingOrders[orderId]);
    },
paymentStatusClass(value) {
      return adminPaymentStatusClass(value);
    },
orderStatusClass(value) {
      return adminOrderStatusClass(value);
    },
workflowStatusClass(value) {
      return adminWorkflowStatusClass(value);
    },
nextOrderAction(order) {
      const status = String(order && order.orderStatus || '').toLowerCase();
      const paymentMethod = String(order && order.paymentMethod || '').toLowerCase();
      const paymentStatus = String(order && order.paymentStatus || '').toLowerCase();

      if (status === 'pending' && paymentMethod === 'bank_transfer' && paymentStatus !== 'paid') {
        return null;
      }

      if (status === 'delivery_failed' && Number(order && order.deliveryRetryCount || 0) >= 1) {
        return null;
      }

      return ORDER_ACTIONS[status] || null;
    },
canCancelOrder(order) {
      const orderStatus = String(order && order.orderStatus || '').toLowerCase();
      const paymentStatus = String(order && order.paymentStatus || '').toLowerCase();
      return paymentStatus !== 'payment_under_review' &&
        ['pending', 'confirmed', 'processing'].includes(orderStatus);
    },
canRefundOrder() {
      return false;
    },
canMarkDeliveryFailed(order) {
      return String(order && order.orderStatus || '').toLowerCase() === 'shipping';
    },
canMarkReturnedToWarehouse(order) {
      return String(order && order.orderStatus || '').toLowerCase() === 'delivery_failed';
    },
canApproveReturnRequest(returnRequest) {
      return String(returnRequest && returnRequest.returnStatus || '').toLowerCase() === 'requested';
    },
canRejectReturnRequest(returnRequest) {
      return ['requested', 'approved'].includes(String(returnRequest && returnRequest.returnStatus || '').toLowerCase());
    },
canReceiveReturnRequest(returnRequest) {
      return String(returnRequest && returnRequest.returnStatus || '').toLowerCase() === 'awaiting_return';
    },
canStartReturnInspection(returnRequest) {
      return String(returnRequest && returnRequest.returnStatus || '').toLowerCase() === 'received';
    },
canInspectReturnRequest(returnRequest) {
      return String(returnRequest && returnRequest.returnStatus || '').toLowerCase() === 'inspecting';
    },
returnQuantityStage(returnRequest) {
      const status = String(returnRequest && returnRequest.returnStatus || '').toLowerCase();
      if (['inspection_approved', 'refund_pending', 'completed'].includes(status)) return 'returned';
      if (status === 'inspection_rejected') return 'accepted';
      if (['received', 'inspecting'].includes(status)) return 'received';
      if (['approved', 'awaiting_return'].includes(status)) return 'approved for return';
      return 'requested';
    },
returnItemProcessedQuantity(item, returnRequest) {
      const status = String(returnRequest && returnRequest.returnStatus || '').toLowerCase();
      if (['inspection_approved', 'inspection_rejected', 'refund_pending', 'completed'].includes(status)) {
        return Math.max(0, Number(item && item.acceptedQuantity || 0));
      }
      if (['received', 'inspecting'].includes(status)) {
        return Math.max(0, Number(item && item.receivedQuantity || 0));
      }
      if (['approved', 'awaiting_return'].includes(status)) {
        return Math.max(0, Number(item && (item.approvedQuantity || item.requestedQuantity) || 0));
      }
      return Math.max(0, Number(item && item.requestedQuantity || 0));
    },
returnRequestQuantitySummary(returnRequest) {
      const items = returnRequest && Array.isArray(returnRequest.items) ? returnRequest.items : [];
      const total = items.reduce((sum, item) => sum + this.returnItemProcessedQuantity(item, returnRequest), 0);
      return `${total} item${total === 1 ? '' : 's'} ${this.returnQuantityStage(returnRequest)}`;
    },
canApproveRefundRequest(refundRequest) {
      if (String(refundRequest && refundRequest.status || '').toLowerCase() !== 'pending') return false;
      return this.hasRefundAccount(refundRequest);
    },
hasRefundAccount(returnRequest) {
      const account = returnRequest && returnRequest.refundAccount;
      const status = String(account && account.status || '').toLowerCase();
      return Boolean(
        account &&
        !['', 'not_provided', 'rejected'].includes(status) &&
        account.bankName &&
        (account.accountNumber || account.maskedAccountNumber) &&
        account.accountHolder
      );
    },
shouldShowReturnRefundAccount(returnRequest, refundRequest) {
      const status = String(returnRequest && returnRequest.returnStatus || '').toLowerCase();
      return !refundRequest && [
        'awaiting_return',
        'received',
        'inspecting',
        'inspection_approved',
        'refund_pending'
      ].includes(status);
    },
canRejectRefundRequest(refundRequest) {
      return ['pending', 'processing'].includes(String(refundRequest && refundRequest.status || '').toLowerCase());
    },
canCompleteRefund(refundRequest) {
      return String(refundRequest && refundRequest.status || '').toLowerCase() === 'processing';
    },
canRetryRefund(refundRequest) {
      return String(refundRequest && refundRequest.status || '').toLowerCase() === 'failed';
    },
meaningfulRefundAdminNote(refundRequest) {
      const note = String(refundRequest && refundRequest.adminNote || '').trim();
      if (!note) return '';

      const normalizedNote = note.toLowerCase().replace(/[.!]+$/, '').trim();
      const status = String(refundRequest && refundRequest.status || '')
        .toLowerCase()
        .replace(/_/g, ' ')
        .trim();
      if (['completed', 'complete', 'refund completed', status].includes(normalizedNote)) {
        return '';
      }

      return note;
    },
orderStateNote(order) {
      const status = String(order && order.orderStatus || '').toLowerCase();
      const paymentMethod = String(order && order.paymentMethod || '').toLowerCase();
      const paymentStatus = String(order && order.paymentStatus || '').toLowerCase();

      if (status === 'pending' && paymentMethod === 'bank_transfer' && paymentStatus !== 'paid') {
        return 'Waiting for bank transfer payment confirmation';
      }

      return ORDER_STATE_COPY[status] || 'No admin action available';
    },
orderConfirmTitle(order) {
      const action = this.nextOrderAction(order);
      return action ? action.title : 'Update order?';
    },
orderConfirmMessage(order) {
      const action = this.nextOrderAction(order);
      return action ? action.message : 'No order status change is available for this order.';
    },
orderConfirmLabel(order) {
      const action = this.nextOrderAction(order);
      return action ? action.label : 'Update order';
    },
isAdminOrderCanceled(order) {
      return String(order && order.orderStatus || '').toLowerCase() === 'cancelled';
    },
isAdminOrderTerminal(order) {
      return ['completed', 'cancelled'].includes(
        String(order && order.orderStatus || '').toLowerCase()
      );
    },
totalAdminOrderItems(detail) {
      const items = detail && Array.isArray(detail.items) ? detail.items : [];
      return items.reduce((total, item) => total + Number(item.quantity || 0), 0);
    },
itemPrice: orderItemPrice,
itemComparePrice: orderItemComparePrice,
hasComparePrice: orderItemHasComparePrice,
itemPriceTone,
priceLabel,
formatAdminCancelActor(value) {
      const role = String(value || '').toLowerCase();

      if (role === 'admin') return 'Canceled by admin';
      if (role === 'user') return 'Canceled by customer';
      return 'Canceled';
    },
formatAdminCancelReason(value) {
      return formatCancellationReason(value);
    },
isAdminTimelineCancellation(event) {
      return String(event && event.newStatus || '').toLowerCase() === 'cancelled';
    },
formatAdminOrderTimelineTitle(event) {
      const status = String(event && event.newStatus || '').toLowerCase();
      const labels = {
        pending: 'Order pending',
        confirmed: 'Order confirmed',
        processing: 'Order is being processed',
        shipping: 'Order has been shipped',
        delivery_failed: 'Delivery failed',
        delivered: 'Order has been delivered',
        completed: 'Order completed',
        cancelled: 'Order cancelled'
      };

      return labels[status] || this.formatLabel(status || 'pending');
    },
formatAdminTimelineNote(event) {
      const note = String(event && event.note || '').trim();

      if (!note) return '';
      return this.isAdminTimelineCancellation(event) ? `Reason: ${formatCancellationReason(note)}` : note;
    },
formatAdminTimelineRole(value) {
      const role = String(value || '').toLowerCase();

      if (role === 'admin') return 'Admin action';
      if (role === 'user') return 'Customer action';
      return 'Order update';
    }
};
