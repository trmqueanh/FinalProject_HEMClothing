// Các action của Profile.vue được tách khỏi view để dễ theo dõi và debug.
import { authStore } from '../../stores/authStore';
import { cartStore } from '../../stores/cartStore';
import {
  orderItemComparePrice,
  orderItemHasComparePrice,
  orderItemPrice,
  orderItemProductLink,
  priceLabel
} from '../../helpers/cart/cartItemHelpers';
import { formatCurrency } from '../../utils/formatCurrency';
import { prepareReturnEvidenceForSave } from '../../helpers/cloudinary';
import {
  CARD_NUMBER_MIN_DIGITS,
  DEFAULT_ADDRESS_FORM,
  DEFAULT_PROFILE_FORM,
  displayDate,
  formatAddress,
  formatCancelActor,
  formatCancelReason,
  formatCardNumber,
  formatDate,
  formatFullShippingAddress,
  formatLabel,
  formatOrderTimelineTitle,
  formatPaymentLabel,
  formatPaymentMethod,
  formatShippingAddress,
  formatTimelineNote,
  formatTimelineRole,
  getDigits,
  isMaskedSavedCard,
  isOrderCanceled,
  isTimelineCancellation,
  isValidCardHolderName,
  normalizeProfileSection,
  orderStatusBadgeClass,
  reviewVariantLabel
} from '../../helpers/profile/profilePageHelpers';
import { profileApi } from '../../services/profileApi';
import {
  buildVietnamPhone,
  isValidVietnamPhone,
  isValidVietnamPhoneParts,
  loadVietnamLocations,
  normalizeVietnamPhone,
  splitVietnamPhone
} from '../../utils/vietnamLocations';

export const profileMethods = {
    formatCurrency,
    async loadLocations() {
      this.isLoadingLocations = true;
      this.locations = await loadVietnamLocations();
      this.isLoadingLocations = false;
    },
    displayDate,
    formatDate,
    reviewVariantLabel,
    formatFullShippingAddress,
    formatLabel,
    isOrderCanceled,
    orderStatusBadgeClass,
    formatCancelActor,
    formatCancelReason,
    isTimelineCancellation,
    formatOrderTimelineTitle,
    formatTimelineNote,
    formatTimelineRole,
    formatPaymentLabel,
    formatPaymentMethod,
    formatAddress,
    isWithinDeliveryWindow(order) {
      const deadline = new Date(order && order.returnDeadlineAt || 0).getTime();
      return Number.isFinite(deadline) && deadline > Date.now();
    },
    productLink: orderItemProductLink,
    itemPrice: orderItemPrice,
    itemComparePrice: orderItemComparePrice,
    hasComparePrice: orderItemHasComparePrice,
    priceLabel,
    canConfirmReceived(order) {
      return String(order && order.orderStatus || '').toLowerCase() === 'delivered' &&
        this.isWithinDeliveryWindow(order);
    },
    canCancelOrder(order) {
      const orderStatus = String(order && order.orderStatus || '').toLowerCase();
      const paymentStatus = String(order && order.paymentStatus || '').toLowerCase();
      return paymentStatus !== 'payment_under_review' &&
        ['pending', 'confirmed', 'processing'].includes(orderStatus);
    },
    canRequestReturn(order) {
      const status = String(order && order.orderStatus || '').toLowerCase();
      return ['delivered', 'completed'].includes(status) &&
        this.isWithinDeliveryWindow(order);
    },
    canReviewOrderItem(order, item) {
      return String(order && order.orderStatus || '').toLowerCase() === 'completed' && !item.reviewId && !item.hasReview;
    },
    isReviewedOrderItem(order, item) {
      return String(order && order.orderStatus || '').toLowerCase() === 'completed' && Boolean(item.reviewId || item.hasReview);
    },
    canBuyAgainOrder(order) {
      const status = String(order && order.orderStatus || '').toLowerCase();
      return ['completed', 'cancelled'].includes(status) && Boolean(order && Array.isArray(order.items) && order.items.length);
    },
    buyAgainUnavailableText(item) {
      if (!item || !item.productAvailable || !item.variantAvailable) {
        return 'No longer available';
      }

      if (Number(item.availableQuantity || 0) <= 0) {
        return 'Out of stock';
      }

      return 'No longer available';
    },
    openBuyAgainDialog(order) {
      if (!this.canBuyAgainOrder(order)) return;
      const items = Array.isArray(order.items) ? order.items : [];
      if (items.length === 1) {
        const item = items[0];
        const availableQuantity = Math.max(1, Number(item.availableQuantity || 0));
        const quantity = Math.min(99, Math.max(1, Number(item.quantity || 1)), availableQuantity);
        return this.submitBuyAgain({
          items: [{ orderItemId: item.id, quantity }]
        }, order);
      }

      this.buyAgainResults = [];
      this.buyAgainDialogOrder = order;
    },
    closeBuyAgainDialog() {
      if (this.isBuyingAgain) return;
      this.buyAgainDialogOrder = null;
      this.buyAgainResults = [];
    },
    async submitBuyAgain(payload, directOrder = null) {
      const order = directOrder || this.buyAgainDialogOrder;
      if (!order || this.isBuyingAgain) return;

      this.isBuyingAgain = true;
      try {
        const response = await cartStore.buyAgainOrderItems(order.id, payload.items || []);
        if (!response) return;
        if (response.error) {
          this.flash(response.message || 'Unable to add the selected products.', 'error');
          return;
        }
        this.buyAgainResults = Array.isArray(response.results) ? response.results : [];
        if (Number(response.addedItemCount || 0) <= 0) {
          this.flash(response.message || 'None of the selected products could be added.', 'error');
          return;
        }

        const failedCount = this.buyAgainResults.filter(result => Number(result.addedQuantity || 0) <= 0).length;
        this.buyAgainDialogOrder = null;
        this.buyAgainResults = [];
        this.flash(
          failedCount > 0
            ? `${response.message} ${failedCount} selected product${failedCount === 1 ? '' : 's'} could not be added.`
            : response.message || 'Products added to your shopping bag.',
          'success'
        );
        await this.$router.push('/cart');
      } finally {
        this.isBuyingAgain = false;
      }
    },
    openConfirmReceivedConfirm(order) {
      if (!this.canConfirmReceived(order)) {
        return;
      }

      this.pendingProfileConfirm = {
        type: 'confirm-received',
        order,
        eyebrow: 'Orders',
        title: 'Confirm Received',
        message: 'Are you sure you have received this order? After confirming, the order will be completed and you can review the products.',
        confirmLabel: 'Confirm',
        savingLabel: 'Confirming...'
      };
    },
    openCancelOrderConfirm(order) {
      if (!this.canCancelOrder(order)) {
        return;
      }

      this.pendingProfileConfirm = {
        type: 'cancel-order',
        order,
        eyebrow: 'Orders',
        title: 'Cancel order?',
        requiresReason: true,
        reason: '',
        confirmLabel: 'Cancel order',
        savingLabel: 'Cancelling...'
      };
    },
    openReturnRequestConfirm(order) {
      if (!this.canRequestReturn(order)) {
        return;
      }

      this.pendingProfileConfirm = {
        type: 'request-return',
        order,
        eyebrow: 'Orders',
        title: 'Request return?',
        message: 'Select the exact products and quantities you are returning.',
        items: Array.isArray(order.items) ? order.items : this.selectedOrderItems,
        confirmLabel: 'Request return',
        savingLabel: 'Submitting...'
      };
    },
    updateOrderFromResponse(orderId, response) {
      if (!response || !response.order) {
        return false;
      }

      this.orders = this.orders.map(existingOrder =>
        existingOrder.id === orderId
          ? {
              ...existingOrder,
              ...response.order,
              returnRequest: response.returnRequest || existingOrder.returnRequest || null,
              items: Array.isArray(response.items) ? response.items : existingOrder.items
            }
          : existingOrder
      );

      if (this.selectedOrder && this.selectedOrder.id === orderId) {
        this.selectedOrder = {
          ...this.selectedOrder,
          ...response.order,
          returnRequest: response.returnRequest || this.selectedOrder.returnRequest || null,
          items: Array.isArray(response.items) ? response.items : this.selectedOrder.items
        };
      }

      return true;
    },
    async confirmReceived(order) {
      if (this.isSaving || !this.canConfirmReceived(order)) {
        return;
      }

      this.isSaving = true;
      try {
        const response = await profileApi.confirmOrderReceived(order.id);
        if (!this.updateOrderFromResponse(order.id, response)) {
          return;
        }
        this.flash('Order marked as received.', 'success');
      } finally {
        this.isSaving = false;
      }
    },
    async cancelOrder(order, reason = '') {
      if (this.isSaving || !this.canCancelOrder(order)) {
        return;
      }

      this.isSaving = true;
      try {
        const response = await profileApi.cancelOrder(order.id, { reason });
        if (!this.updateOrderFromResponse(order.id, response)) {
          return;
        }
        this.flash(
          response && response.voucherReleased
            ? 'Order cancelled. Your coupon is available to use again.'
            : 'Order cancelled successfully.',
          'success'
        );
      } finally {
        this.isSaving = false;
      }
    },
    async requestReturn(order, payload) {
      if (this.isSaving || !this.canRequestReturn(order)) {
        return;
      }

      this.isSaving = true;
      try {
        const items = await Promise.all((payload.items || []).map(async item => {
          const uploaded = await prepareReturnEvidenceForSave(item.evidenceFiles || []);
          const { evidenceFiles: _evidenceFiles, ...returnItem } = item;
          return {
            ...returnItem,
            evidenceUrls: uploaded.map(asset => asset.imageUrl)
          };
        }));
        const response = await profileApi.requestReturn(order.id, { ...payload, items });
        if (!response || !response.returnRequest) {
          return;
        }

        const returnRequest = response.returnRequest;
        this.orders = this.orders.map(existingOrder =>
          existingOrder.id === order.id
            ? { ...existingOrder, returnRequest }
            : existingOrder
        );
        if (this.selectedOrder && this.selectedOrder.id === order.id) {
          this.selectedOrder = { ...this.selectedOrder, returnRequest };
        }
        this.flash('Return request submitted.', 'success');
        return true;
      } catch (error) {
        this.flash(error && error.message ? error.message : 'Could not upload return evidence.', 'error');
        return false;
      } finally {
        this.isSaving = false;
      }
    },
    async confirmReturnRequest(payload) {
      const action = this.pendingProfileConfirm;
      if (!action || action.type !== 'request-return') return;
      const submitted = await this.requestReturn(action.order, payload);
      if (submitted) this.pendingProfileConfirm = null;
    },
    openOrderReviewForm(order, item) {
      if (!this.canReviewOrderItem(order, item)) {
        return;
      }

      this.orderReviewTarget = {
        order,
        item
      };
      this.reviewDraft = {
        rating: 5,
        comment: ''
      };
    },
    closeOrderReviewForm() {
      if (this.isSaving) {
        return;
      }

      this.orderReviewTarget = null;
      this.reviewDraft = {
        rating: 5,
        comment: ''
      };
    },
    async submitOrderReview() {
      if (!this.orderReviewTarget || this.isSaving) {
        return;
      }

      const { order, item } = this.orderReviewTarget;
      this.isSaving = true;
      const response = await profileApi.createProductReview(item.productId, {
        orderId: order.id,
        rating: Number(this.reviewDraft.rating || 0),
        comment: String(this.reviewDraft.comment || '').trim()
      });
      this.isSaving = false;

      if (!response) {
        return;
      }

      this.orders = this.orders.map(existingOrder => {
        if (existingOrder.id !== order.id) {
          return existingOrder;
        }

        return {
          ...existingOrder,
          items: (existingOrder.items || []).map(existingItem =>
            existingItem.id === item.id
              ? {
                  ...existingItem,
                  reviewId: response.item && response.item.id ? response.item.id : 'created',
                  hasReview: true
                }
              : existingItem
          )
        };
      });

      if (this.selectedOrder && this.selectedOrder.id === order.id) {
        this.selectedOrder = {
          ...this.selectedOrder,
          items: (this.selectedOrder.items || []).map(existingItem =>
            existingItem.id === item.id
              ? {
                  ...existingItem,
                  reviewId: response.item && response.item.id ? response.item.id : 'created',
                  hasReview: true
                }
              : existingItem
          )
        };
      }

      this.closeOrderReviewForm();
      await this.loadReviews();
      this.flash('Review submitted successfully.', 'success');
    },
    formatShippingAddress,
    shortId(value) {
      return String(value || '').slice(0, 8).toUpperCase();
    },
    scrollProfilePanelToTop() {
      this.$nextTick(() => {
        if (typeof window === 'undefined') {
          return;
        }

        const target = this.$el && this.$el.querySelector('.profile-content');
        if (!target) {
          return;
        }

        const headerOffset = Number.parseInt(
          window.getComputedStyle(document.documentElement).getPropertyValue('--store-header-height'),
          10
        ) || 0;
        const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset - 18);

        window.scrollTo({
          top,
          behavior: 'smooth'
        });
      });
    },
    setSection(section, extraQuery = {}) {
      this.activeSection = normalizeProfileSection(section);
      this.editingSection = '';

      if (this.activeSection === 'orders') {
        this.$router.replace('/profile/orders');
        return;
      }

      this.$router.replace({
        path: '/profile',
        query: {
          section: this.activeSection,
          ...extraQuery
        }
      });
    },
    isSectionActive(section) {
      if (section === 'settings') {
        return ['settings', 'edit-information', 'add-address', 'edit-address', 'change-password'].includes(this.activeSection);
      }

      return this.activeSection === section;
    },
    openEditor(section) {
      this.setSection(section);
    },
    normalizeAddressForForm(address = null) {
      const nextAddress = address || DEFAULT_ADDRESS_FORM();
      const nextAddressId = String(nextAddress.id || nextAddress.addressId || nextAddress.address_id || '').trim();

      return {
        ...DEFAULT_ADDRESS_FORM(),
        ...nextAddress,
        id: nextAddressId,
        receiverName: String(nextAddress.receiverName || nextAddress.receiver_name || '').trim(),
        receiverPhone: String(nextAddress.receiverPhone || nextAddress.receiver_phone || '').trim(),
        country: String(nextAddress.country || 'Vietnam').trim() || 'Vietnam',
        city: String(nextAddress.city || '').trim(),
        district: String(nextAddress.district || '').trim(),
        ward: String(nextAddress.ward || '').trim(),
        addressLine: String(nextAddress.addressLine || nextAddress.address_line || '').trim(),
        addressLabel: String(nextAddress.addressLabel || nextAddress.address_label || '').trim(),
        isDefault: Boolean(nextAddress.isDefault ?? nextAddress.is_default)
      };
    },
    resetAddressForm(address = null, mode = '') {
      const nextAddress = this.normalizeAddressForForm(address);
      const phone = splitVietnamPhone(nextAddress.receiverPhone || '');

      this.editingAddressId = nextAddress.id;
      this.addressFormMode = mode || (nextAddress.id ? 'edit' : 'add');
      this.addressForm = nextAddress;
      this.addressPhoneCountryCode = phone.code;
      this.addressPhoneLocalNumber = phone.local;
    },
    startAddAddress() {
      this.resetAddressForm({
        ...DEFAULT_ADDRESS_FORM(),
        receiverName: this.form.fullName || this.form.name || this.currentUser.name || '',
        receiverPhone: this.form.phone || '',
        isDefault: !this.addresses.length
      }, 'add');
      this.setSection('add-address');
    },
    findAddressById(addressId) {
      const normalizedAddressId = String(addressId || '').trim();

      if (!normalizedAddressId) {
        return null;
      }

      return this.addresses.find(item => String(item.id || item.addressId || item.address_id || '') === normalizedAddressId) || null;
    },
    async refreshProfileForAddressEdit(addressId) {
      const payload = await profileApi.getProfile();

      if (payload) {
        this.applyProfile(payload);
      }

      return this.findAddressById(addressId);
    },
    async syncAddressEditFromRoute() {
      if (this.activeSection !== 'edit-address') {
        return;
      }

      const addressId = String(this.$route.query.addressId || this.$route.query.address_id || '').trim();

      if (!addressId) {
        return;
      }

      const savedAddress = this.findAddressById(addressId) || await this.refreshProfileForAddressEdit(addressId);

      if (savedAddress) {
        this.resetAddressForm(savedAddress, 'edit');
      }
    },
    async startEditAddress(address) {
      const addressId = String(address && (address.id || address.addressId || address.address_id) || '').trim();
      let savedAddress = this.findAddressById(addressId);

      if (!savedAddress && addressId) {
        savedAddress = await this.refreshProfileForAddressEdit(addressId);
      }

      if (!savedAddress) {
        this.flash('Unable to load this shipping address. Please refresh and try again.', 'error');
        return;
      }

      this.resetAddressForm(savedAddress, 'edit');
      this.setSection('edit-address', { addressId });
    },
    applyProfile(payload) {
      const profile = payload && payload.profile ? payload.profile : {};
      const user = payload && payload.user ? payload.user : this.currentUser;

      this.form = {
        ...DEFAULT_PROFILE_FORM(),
        ...profile,
        name: user.name || this.currentUser.name || '',
        cardNumber: profile.cardLast4 ? `•••• •••• •••• ${profile.cardLast4}` : ''
      };
      this.paymentTouched = {};
      this.paymentErrors = {};
      this.addresses = Array.isArray(payload && payload.addresses)
        ? payload.addresses.map(address => this.normalizeAddressForForm(address))
        : [];

      if (payload && payload.user) {
        authStore.syncUser(payload.user);
        this.session = authStore.getSession();
      }
    },
    async loadProfile() {
      const payload = await profileApi.getProfile();
      this.applyProfile(payload);
    },
    async loadOrders() {
      this.isLoadingOrders = true;
      const response = await profileApi.getMyOrders({
        page: this.currentOrderPage,
        limit: this.ordersPagination.limit,
        search: this.orderSearch || undefined,
        statuses: this.selectedOrderStatuses.join(',') || undefined,
        requests: this.isOrderRequestFilter
          ? 'active'
          : (this.orderStatusFilter === 'all' ? undefined : 'exclude_active')
      });
      this.orders = Array.isArray(response) ? response : response.items || [];
      if (response && !Array.isArray(response) && response.summary) {
        this.orderSummary = {
          totalOrders: Number(response.summary.totalOrders || 0),
          totalSpent: Number(response.summary.totalSpent || 0)
        };
      }
      const nextPagination = response && response.pagination
        ? response.pagination
        : {
            ...this.ordersPagination,
            page: this.currentOrderPage,
            totalItems: this.orders.length,
            totalPages: 1
          };

      if (this.currentOrderPage > nextPagination.totalPages) {
        this.currentOrderPage = Math.max(1, nextPagination.totalPages);
        return this.loadOrders();
      }

      this.ordersPagination = nextPagination;
      this.isLoadingOrders = false;
    },
    async loadOrderDetail() {
      if (!this.orderDetailId) {
        this.selectedOrder = null;
        this.orderTimeline = [];
        return;
      }

      this.isLoadingOrderDetail = true;
      const response = await profileApi.getMyOrder(this.orderDetailId);
      const latestReturnId = String(response && response.returnRequest && response.returnRequest.id || '').trim();
      const requestedReturnId = String(this.$route.query.return || '').trim();
      const selectedReturnId = requestedReturnId || latestReturnId;
      let returnResponse = selectedReturnId
        ? await profileApi.getMyReturn(selectedReturnId)
        : null;
      const selectedReturnOrderId = String(returnResponse && returnResponse.returnRequest && returnResponse.returnRequest.orderId || '').trim();
      if (
        (!returnResponse || !returnResponse.returnRequest || selectedReturnOrderId !== String(this.orderDetailId)) &&
        latestReturnId &&
        selectedReturnId !== latestReturnId
      ) {
        returnResponse = await profileApi.getMyReturn(latestReturnId);
      }
      this.selectedOrder = response && response.order
        ? {
            ...response.order,
            bankTransfer: response.bankTransfer || null,
            returnRequest: returnResponse && returnResponse.returnRequest
              ? returnResponse.returnRequest
              : (response.returnRequest || null),
            refundRequest: response.refundRequest || null,
            items: Array.isArray(response.items) ? response.items : []
          }
        : null;
      this.orderTimeline = Array.isArray(response && response.timeline) ? response.timeline : [];
      this.isLoadingOrderDetail = false;
    },
    async redirectLegacyReturnDetail() {
      const returnRequestId = this.returnDetailId;
      if (!returnRequestId) return;

      const response = await profileApi.getMyReturn(returnRequestId);
      const orderId = String(response && response.returnRequest && response.returnRequest.orderId || '').trim();
      if (!orderId) {
        this.flash('Return request could not be found.', 'error');
        await this.$router.replace('/profile/orders');
        return;
      }

      await this.$router.replace({
        path: `/profile/orders/${orderId}`,
        query: { focus: 'refund-account', return: returnRequestId }
      });
    },
    async saveReturnRefundAccount(payload) {
      const returnRequest = this.selectedOrder && this.selectedOrder.returnRequest;
      if (!returnRequest || this.isSaving) return;
      this.isSaving = true;
      try {
        const response = await profileApi.saveRefundAccount(returnRequest.id, payload);
        if (!response || !response.returnRequest) return;
        const updatedReturn = response.returnRequest;
        const currentRefund = this.selectedOrder.refundRequest;
        const refunds = Array.isArray(updatedReturn.refunds) ? updatedReturn.refunds : [];
        const updatedRefund = currentRefund
          ? refunds.find(refund => String(refund.id) === String(currentRefund.id))
          : null;
        this.selectedOrder = {
          ...this.selectedOrder,
          returnRequest: updatedReturn,
          refundRequest: updatedRefund ? { ...currentRefund, ...updatedRefund } : currentRefund
        };
        this.flash('Refund account saved.', 'success');
      } finally {
        this.isSaving = false;
      }
    },
    async saveOrderRefundAccount(payload) {
      const refund = this.selectedOrder && this.selectedOrder.refundRequest;
      if (!refund || this.isSaving) return;
      this.isSaving = true;
      try {
        const response = await profileApi.saveOrderRefundAccount(refund.id, payload);
        if (!response || !response.refund) return;
        this.selectedOrder = { ...this.selectedOrder, refundRequest: response.refund };
        this.flash('Refund account saved.', 'success');
      } finally {
        this.isSaving = false;
      }
    },
    scheduleOrderSearch() {
      window.clearTimeout(this.orderSearchTimer);
      this.orderSearchTimer = window.setTimeout(async () => {
        this.currentOrderPage = 1;
        await this.loadOrders();
        this.scrollProfilePanelToTop();
      }, 260);
    },
    async selectOrderStatusTab(value) {
      if (value === this.orderStatusFilter) {
        return;
      }

      this.orderStatusFilter = value;
      this.currentOrderPage = 1;
      await this.loadOrders();
      this.scrollProfilePanelToTop();
    },
    async setOrderPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.ordersPagination.totalPages || 1);

      if (nextPage === this.currentOrderPage) {
        return;
      }

      this.currentOrderPage = nextPage;
      await this.loadOrders();
      this.scrollProfilePanelToTop();
    },
    async loadReviews() {
      this.isLoadingReviews = true;
      const response = await profileApi.getMyReviews();
      this.reviews = Array.isArray(response && response.items) ? response.items : [];
      this.isLoadingReviews = false;
    },
    async loadCoupons() {
      this.isLoadingCoupons = true;
      const response = await profileApi.getMyVouchers();
      this.coupons = Array.isArray(response && response.items) ? response.items : [];
      this.isLoadingCoupons = false;
    },
    startReviewEdit(review) {
      this.editingReviewId = review.id;
      this.reviewDraft = {
        rating: Number(review.rating || 5),
        comment: String(review.comment || review.body || '')
      };
    },
    cancelReviewEdit() {
      this.editingReviewId = '';
      this.reviewDraft = {
        rating: 5,
        comment: ''
      };
    },
    async saveReviewEdit(review) {
      this.isSaving = true;
      const response = await profileApi.updateReview(review.id, {
        rating: Number(this.reviewDraft.rating || 0),
        comment: String(this.reviewDraft.comment || '').trim()
      });
      this.isSaving = false;

      if (!response) {
        return;
      }

      this.cancelReviewEdit();
      await this.loadReviews();
      this.flash('Review updated.', 'success');
    },
    openDeleteReviewConfirm(review) {
      this.pendingProfileConfirm = {
        type: 'delete-review',
        review,
        eyebrow: 'My reviews',
        title: 'Delete review?',
        message: `Delete your review for "${review.productName || 'this product'}"?`,
        confirmLabel: 'Delete review'
      };
    },
    async deleteReview(review) {
      this.isSaving = true;
      const response = await profileApi.deleteReview(review.id);
      this.isSaving = false;

      if (!response) {
        return;
      }

      await this.loadReviews();
      this.flash('Review deleted.', 'success');
    },
    openDeleteAddressConfirm(address) {
      this.pendingProfileConfirm = {
        type: 'delete-address',
        addressId: address.id,
        eyebrow: 'Shipping address',
        title: 'Delete address?',
        message: `Delete ${address.addressLabel || address.receiverName || 'this shipping address'}?`,
        confirmLabel: 'Delete address'
      };
    },
    closeProfileConfirm() {
      if (this.isSaving) {
        return;
      }

      this.pendingProfileConfirm = null;
    },
    async confirmProfileAction() {
      const action = this.pendingProfileConfirm;

      if (!action || this.isSaving) {
        return;
      }

      if (action.type === 'delete-review') {
        await this.deleteReview(action.review);
      } else if (action.type === 'delete-address') {
        await this.deleteAddress(action.addressId);
      } else if (action.type === 'confirm-received') {
        await this.confirmReceived(action.order);
      } else if (action.type === 'cancel-order') {
        await this.cancelOrder(action.order, action.reason);
      }

      this.pendingProfileConfirm = null;
    },
    touchPaymentField(field) {
      this.paymentTouched = {
        ...this.paymentTouched,
        [field]: true
      };
      this.validatePaymentField(field);
    },
    clearPaymentFieldError(field) {
      if (!this.paymentErrors[field]) {
        return;
      }

      this.paymentErrors = {
        ...this.paymentErrors,
        [field]: ''
      };
    },
    paymentFieldError(field) {
      return this.paymentTouched[field] && this.paymentErrors[field] ? this.paymentErrors[field] : '';
    },
    paymentFieldStatusClass(field) {
      if (!this.paymentTouched[field]) {
        return '';
      }

      return this.paymentErrors[field] ? 'profile-field--invalid' : 'profile-field--valid';
    },
    validatePaymentField(field) {
      let message = '';

      if (this.form.paymentProvider === 'card') {
        if (field === 'cardHolderName' && !isValidCardHolderName(this.form.cardHolderName)) {
          message = 'Card holder name must contain letters only.';
        }

        if (field === 'cardNumber') {
          const cardDigits = getDigits(this.form.cardNumber);
          const isSavedCard = isMaskedSavedCard(this.form.cardNumber) && this.form.cardLast4 && cardDigits === this.form.cardLast4;

          if (!isSavedCard && cardDigits.length < CARD_NUMBER_MIN_DIGITS) {
            message = 'Please enter a valid card number.';
          }
        }
      }

      this.paymentErrors = {
        ...this.paymentErrors,
        [field]: message
      };

      return !message;
    },
    validatePaymentForm() {
      if (this.form.paymentProvider !== 'card') {
        return true;
      }

      const fields = ['cardHolderName', 'cardNumber'];
      this.paymentTouched = fields.reduce((state, field) => ({ ...state, [field]: true }), this.paymentTouched);

      return fields.map(field => this.validatePaymentField(field)).every(Boolean);
    },
    async saveProfile(section) {
      if (section === 'payment' && !this.validatePaymentForm()) {
        return;
      }

      if (section === 'personal' && !isValidVietnamPhone(this.form.phone)) {
        this.flash('Enter a valid Vietnamese mobile number, for example 0912345678.', 'error');
        return;
      }

      const cardDigits = getDigits(this.form.cardNumber);
      const nextCardLast4 = isMaskedSavedCard(this.form.cardNumber) ? this.form.cardLast4 : cardDigits.slice(-4);

      this.isSaving = true;
      const profilePayload = { ...this.form };
      if (section === 'personal') {
        profilePayload.phone = normalizeVietnamPhone(this.form.phone);
      }
      delete profilePayload.cardNumber;
      const payload = await profileApi.updateProfile({
        ...profilePayload,
        cardHolderName: this.form.paymentProvider === 'card' ? this.form.cardHolderName : '',
        cardLast4: this.form.paymentProvider === 'card' ? nextCardLast4 : ''
      });
      this.isSaving = false;

      if (!payload) {
        return;
      }

      this.applyProfile(payload);
      this.setSection('settings');
      this.flash(`${this.formatLabel(section)} updated successfully.`, 'success');
    },
    handleProfileCardNumberInput(event) {
      this.form.cardNumber = formatCardNumber(event && event.target ? event.target.value : this.form.cardNumber);
      this.form.cardLast4 = getDigits(this.form.cardNumber).slice(-4);
      this.clearPaymentFieldError('cardNumber');
    },
    openPaymentRemoveConfirm() {
      this.isPaymentRemoveConfirmOpen = true;
    },
    closePaymentRemoveConfirm() {
      if (this.isSaving) {
        return;
      }

      this.isPaymentRemoveConfirmOpen = false;
    },
    async confirmRemoveSavedPayment() {
      await this.removeSavedPayment();
    },
    async removeSavedPayment() {
      this.isSaving = true;
      const payload = await profileApi.updateProfile({
        ...this.form,
        paymentProvider: 'cod',
        cardHolderName: '',
        cardLast4: '',
        cardBrand: ''
      });
      this.isSaving = false;

      if (!payload) {
        return;
      }

      this.isPaymentRemoveConfirmOpen = false;
      this.applyProfile(payload);
      this.flash('Saved payment method removed.', 'success');
    },
    async saveAddress() {
      const isEditingAddress = this.addressFormMode === 'edit';

      if (isEditingAddress && !this.editingAddressId) {
        this.flash('Unable to update this shipping address. Please go back and choose the address again.', 'error');
        return;
      }

      if (!isValidVietnamPhoneParts(this.addressPhoneCountryCode, this.addressPhoneLocalNumber)) {
        this.flash('Enter a valid Vietnamese mobile number, for example 0912345678.', 'error');
        return;
      }

      const payload = {
        ...this.addressForm,
        receiverPhone: buildVietnamPhone(this.addressPhoneCountryCode, this.addressPhoneLocalNumber)
      };

      this.isSaving = true;
      const response = isEditingAddress
        ? await profileApi.updateAddress(this.editingAddressId, payload)
        : await profileApi.createAddress(payload);
      this.isSaving = false;

      if (!response) {
        return;
      }

      this.applyProfile(response);
      this.setSection('settings');
      this.flash(isEditingAddress ? 'Shipping address updated successfully.' : 'Shipping address added successfully.', 'success');
    },
    async setAddressDefault(addressId) {
      const previousAddresses = this.addresses.map(address => ({ ...address }));
      this.addresses = this.addresses.map(address => ({
        ...address,
        isDefault: String(address.id) === String(addressId)
      }));

      const response = await profileApi.setDefaultAddress(addressId);

      if (!response) {
        this.addresses = previousAddresses;
        return;
      }

      this.applyProfile(response);
    },
    async deleteAddress(addressId) {
      const response = await profileApi.deleteAddress(addressId);

      if (!response) {
        return;
      }

      this.applyProfile(response);
    },
    clearPasswordServerError() {
      this.passwordServerError = null;
      this.passwordSuccessMessage = '';
    },
    passwordErrorField(message = '') {
      const normalizedMessage = String(message).toLowerCase();

      if (
        normalizedMessage.includes('new password') ||
        normalizedMessage.includes('8-25') ||
        normalizedMessage.includes('uppercase') ||
        normalizedMessage.includes('spaces') ||
        normalizedMessage.includes('different')
      ) {
        return 'newPassword';
      }

      return 'currentPassword';
    },
    async changePassword(payload) {
      this.passwordServerError = null;
      this.passwordSuccessMessage = '';
      this.isChangingPassword = true;
      const response = await profileApi.changePassword(payload);
      this.isChangingPassword = false;

      if (response && response.error) {
        const message = response.message || 'Unable to update password.';
        this.passwordServerError = {
          field: this.passwordErrorField(message),
          message
        };
        return;
      }

      if (!response) {
        return;
      }

      this.passwordSuccessMessage = response.message || 'Password updated successfully.';
    },
    requestLogout() {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('request-logout-confirm'));
      }
    }
  };
