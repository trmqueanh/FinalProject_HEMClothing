// Checkout actions shared by Checkout.vue.
import { authStore } from '../../stores/authStore';
import { cartStore } from '../../stores/cartStore';
import {
  REQUIRED_CHECKOUT_FIELDS,
  createDefaultCheckoutForm
} from '../../helpers/checkout/checkoutForm';
import { formatCurrency } from '../../utils/formatCurrency';
import { checkoutApi } from '../../services/checkoutApi';
import { orderApi } from '../../api/domains/orderApi';
import {
  buildVietnamPhone,
  isValidVietnamPhoneParts,
  loadVietnamLocations,
  splitVietnamPhone
} from '../../utils/vietnamLocations';

export const checkoutMethods = {
  formatCurrency,
  async loadBankTransferOrder() {
    const orderId = String(this.paymentOrderId || '').trim();
    if (!orderId) return;

    this.isOrderResultLoading = true;
    try {
      const response = await orderApi.getMyOrder(orderId);
      const order = response && response.order ? response.order : null;

      if (!order) {
        this.flash('This payment order could not be found.', 'error');
        await this.$router.replace('/profile/orders');
        return;
      }

      if (order.paymentMethod !== 'bank_transfer') {
        this.flash('This order does not require QR payment.', 'error');
        await this.$router.replace(`/profile/orders/${order.id}`);
        return;
      }

      this.orderResult = {
        ...order,
        bankTransfer: response.bankTransfer || null,
        items: Array.isArray(response.items) ? response.items : []
      };
    } finally {
      this.isOrderResultLoading = false;
    }
  },
  cartItemId(item) {
    return String(item && (item.cartItemId || item.lineId || item.id) || '');
  },
  updateFormField({ field, value }) {
    this.form = {
      ...this.form,
      [field]: value
    };
  },
  async loadLocations() {
    this.isLoadingLocations = true;
    this.locations = await loadVietnamLocations();
    this.isLoadingLocations = false;
  },
  applyAddressToForm(address) {
    if (!address) return;

    const phoneParts = splitVietnamPhone(address.receiverPhone || '');

    this.form = {
      ...this.form,
      addressId: address.id || '',
      receiverName: address.receiverName || this.form.receiverName,
      receiverPhone: address.receiverPhone || this.form.receiverPhone,
      phoneCountryCode: phoneParts.code,
      phoneLocalNumber: phoneParts.local || this.form.phoneLocalNumber,
      country: address.country || 'Vietnam',
      city: address.city || this.form.city,
      district: address.district || this.form.district,
      ward: address.ward || this.form.ward,
      addressLine: address.addressLine || this.form.addressLine,
      addressLabel: address.addressLabel || this.form.addressLabel,
      saveAddress: false,
      updateSavedAddress: false,
      setDefaultAddress: false
    };
  },
  resetCheckoutAddressForNewAddress() {
    this.form = {
      ...this.form,
      addressId: '',
      receiverName: this.session.user && this.session.user.name ? this.session.user.name : '',
      receiverPhone: '',
      phoneCountryCode: '+84',
      phoneLocalNumber: '',
      country: 'Vietnam',
      city: '',
      district: '',
      ward: '',
      addressLine: '',
      addressLabel: '',
      saveAddress: false,
      updateSavedAddress: false,
      setDefaultAddress: false
    };
  },
  applySelectedAddress(addressId = this.form.addressId) {
    const selectedAddress = this.savedAddresses.find(address => address.id === addressId);

    if (selectedAddress) {
      this.applyAddressToForm(selectedAddress);
      return;
    }

    this.resetCheckoutAddressForNewAddress();
  },
  applyProfileToCheckout(payload) {
    const profile = payload && payload.profile ? payload.profile : {};
    const user = payload && payload.user ? payload.user : this.session.user;
    const defaultAddress = (payload && payload.defaultAddress) || null;
    const profilePhone = splitVietnamPhone(profile.phone || '');
    const paymentProvider = profile.paymentProvider === 'bank_transfer' ? 'bank_transfer' : 'cod';

    this.session = {
      ...this.session,
      user: user || this.session.user
    };

    if (user) {
      authStore.syncUser(user);
    }

    this.form = {
      ...this.form,
      receiverName: (defaultAddress && defaultAddress.receiverName) || profile.fullName || (user && user.name) || this.form.receiverName,
      phoneCountryCode: defaultAddress ? this.form.phoneCountryCode : profilePhone.code,
      phoneLocalNumber: defaultAddress ? this.form.phoneLocalNumber : profilePhone.local || this.form.phoneLocalNumber,
      paymentMethod: paymentProvider
    };
    this.selectedPaymentOption = paymentProvider === 'bank_transfer' ? 'bank_transfer' : '';
    this.savedAddresses = Array.isArray(payload && payload.addresses) ? payload.addresses : [];
    this.applyAddressToForm(defaultAddress);
  },
  async loadProfile() {
    const payload = await checkoutApi.getProfile();
    this.applyProfileToCheckout(payload);
    this.isProfileLoaded = true;
  },
  async loadCoupons() {
    if (!this.checkoutItems.length) {
      this.coupons = [];
      this.hasCheckedEligibleVouchers = true;
      return;
    }

    this.hasCheckedEligibleVouchers = false;
    const response = await checkoutApi.getEligibleVouchers({
      cart_item_ids: this.checkoutItems.map(item => this.cartItemId(item))
    });
    this.coupons = Array.isArray(response && response.items) ? response.items : [];
    this.hasCheckedEligibleVouchers = true;
  },
  couponMaximumDiscount(coupon) {
    if (coupon.discountType === 'fixed') {
      return this.formatCurrency(coupon.discountValue);
    }

    return coupon.maxDiscountAmount === null
      ? 'No maximum'
      : this.formatCurrency(coupon.maxDiscountAmount);
  },
  async syncCart() {
    if (!cartStore.isHydrated()) {
      this.isCartLoading = true;
    }

    try {
      await cartStore.sync();
      this.cartItems = cartStore.getItems();
      this.selectedCartItemIds = cartStore.getSelectedItemIds();
    } finally {
      this.isCartLoading = false;
    }
  },
  buildCheckoutPayload() {
    const receiverPhone = buildVietnamPhone(this.form.phoneCountryCode, this.form.phoneLocalNumber);
    const cleanText = value => String(value || '').trim();

    return {
      cart_item_ids: this.checkoutItems.map(item => this.cartItemId(item)),
      addressId: this.form.addressId,
      receiverName: cleanText(this.form.receiverName),
      receiverPhone,
      country: cleanText(this.form.country) || 'Vietnam',
      city: cleanText(this.form.city),
      district: cleanText(this.form.district),
      ward: cleanText(this.form.ward),
      addressLine: cleanText(this.form.addressLine),
      addressLabel: cleanText(this.form.addressLabel),
      saveAddress: !this.form.addressId && Boolean(this.form.saveAddress),
      updateSavedAddress: Boolean(this.form.addressId && this.form.updateSavedAddress),
      setDefaultAddress: false,
      shippingNote: cleanText(this.form.shippingNote),
      paymentMethod: this.form.paymentMethod,
      voucherCode: this.appliedVoucher ? this.appliedVoucher.voucherCode : ''
    };
  },
  async applyVoucher() {
    const code = String(this.voucherCode || '').trim().toUpperCase();

    if (!code || this.isVoucherApplying) return;

    this.isVoucherApplying = true;
    this.voucherError = '';
    const response = await checkoutApi.validateVoucher({
      code,
      cart_item_ids: this.checkoutItems.map(item => this.cartItemId(item))
    });
    this.isVoucherApplying = false;

    if (!response || response.error) {
      this.appliedVoucher = null;
      this.voucherError = response && response.message ? response.message : 'Voucher code is invalid.';
      return;
    }

    this.voucherCode = response.voucherCode;
    this.appliedVoucher = response;
  },
  useVoucher(coupon) {
    if (!coupon || !coupon.isEligible) {
      this.voucherError = Number(coupon && coupon.missingAmount) > 0
        ? `Add ${this.formatCurrency(coupon.missingAmount)} more to use this coupon`
        : 'This coupon is unavailable.';
      return;
    }

    if (this.appliedVoucher && this.appliedVoucher.voucherCode === coupon.code) {
      return;
    }

    this.voucherCode = coupon.code;
    this.applyVoucher();
  },
  clearVoucher() {
    this.appliedVoucher = null;
    this.voucherCode = '';
    this.voucherError = '';
  },
  openVoucherRemoveConfirm() {
    this.isVoucherRemoveConfirmOpen = true;
  },
  closeVoucherRemoveConfirm() {
    this.isVoucherRemoveConfirmOpen = false;
  },
  confirmVoucherRemoval() {
    this.closeVoucherRemoveConfirm();
    this.clearVoucher();
  },
  touchField(field) {
    this.touched = {
      ...this.touched,
      [field]: true
    };
    this.validateField(field);
  },
  clearFieldError(field) {
    if (!this.errors[field]) return;

    this.errors = {
      ...this.errors,
      [field]: ''
    };
  },
  fieldError(field) {
    return this.touched[field] && this.errors[field] ? this.errors[field] : '';
  },
  fieldStatusClass(field) {
    if (!this.touched[field]) return '';

    return this.errors[field] ? 'checkout-field--invalid' : 'checkout-field--valid';
  },
  validateField(field) {
    let message = '';

    if (field === 'receiverName' && !this.form.receiverName) message = 'Receiver name is required.';
    if (field === 'phoneLocalNumber' && !isValidVietnamPhoneParts(this.form.phoneCountryCode, this.form.phoneLocalNumber)) {
      message = 'Enter a valid Vietnamese mobile number, for example 0912345678.';
    }
    if (field === 'city' && !this.form.city) message = 'City or province is required.';
    if (field === 'district' && !this.form.district) message = 'District is required.';
    if (field === 'ward' && !this.form.ward) message = 'Ward is required.';
    if (field === 'addressLine' && !this.form.addressLine) message = 'Address line is required.';

    this.errors = {
      ...this.errors,
      [field]: message
    };

    return !message;
  },
  validateCheckoutForm() {
    const fields = REQUIRED_CHECKOUT_FIELDS;
    this.touched = fields.reduce((state, field) => ({ ...state, [field]: true }), this.touched);

    return fields.map(field => this.validateField(field)).every(Boolean);
  },
  validateCheckoutPayload() {
    return this.validateCheckoutForm();
  },
  openRemovePaymentConfirm() {
    this.isPaymentRemoveConfirmOpen = true;
  },
  closeRemovePaymentConfirm() {
    this.isPaymentRemoveConfirmOpen = false;
  },
  confirmRemoveSavedPayment() {
    this.closeRemovePaymentConfirm();
  },
  async activateBankTransferPayment() {
    if (
      this.isActivatingBankTransfer
      || !this.orderResult
      || this.orderResult.paymentMethod !== 'bank_transfer'
      || this.orderResult.paymentStatus !== 'pending_payment'
      || (this.orderResult.bankTransfer && this.orderResult.bankTransfer.activatedAt)
    ) return;

    this.isActivatingBankTransfer = true;
    try {
      const response = await checkoutApi.activateBankTransferPayment(this.orderResult.id);
      if (!response || !response.order) {
        this.flash('The QR payment window could not be started. Refresh the page to try again.', 'error');
        return;
      }
      this.orderResult = {
        ...this.orderResult,
        ...response.order,
        bankTransfer: response.bankTransfer || this.orderResult.bankTransfer,
        items: this.orderItems
      };
    } finally {
      this.isActivatingBankTransfer = false;
    }
  },
  guardPendingPaymentNavigation(to, next) {
    if (this.allowPaymentRouteLeave || !this.shouldConfirmPaymentLeave) {
      next();
      return;
    }
    this.pendingPaymentLeavePath = to.fullPath;
    this.isPaymentLeaveConfirmOpen = true;
    next(false);
  },
  closePaymentLeaveConfirm() {
    this.isPaymentLeaveConfirmOpen = false;
    this.pendingPaymentLeavePath = '';
  },
  async confirmPaymentPageLeave() {
    const target = this.pendingPaymentLeavePath || '/women';
    this.isPaymentLeaveConfirmOpen = false;
    this.pendingPaymentLeavePath = '';
    this.allowPaymentRouteLeave = true;
    try {
      await this.$router.push(target);
    } finally {
      this.allowPaymentRouteLeave = false;
    }
  },
  async markBankTransferPaid() {
    if (
      this.isMarkingPaymentPaid ||
      !this.orderResult ||
      this.orderResult.paymentMethod !== 'bank_transfer'
    ) return;

    this.isMarkingPaymentPaid = true;
    try {
      const response = await checkoutApi.markBankTransferPaid(this.orderResult.id);
      if (!response || !response.order) {
        this.flash('We could not submit your payment notification. Please try again.', 'error');
        return;
      }

      this.orderResult = {
        ...this.orderResult,
        ...response.order,
        bankTransfer: response.bankTransfer || this.orderResult.bankTransfer,
        items: this.orderItems
      };
      this.flash('Payment notification sent. HEM will verify your bank transfer soon.', 'success');
    } finally {
      this.isMarkingPaymentPaid = false;
    }
  },
  openPaymentCancelConfirm() {
    if (
      this.isCancellingPayment
      || !this.orderResult
      || this.orderResult.paymentMethod !== 'bank_transfer'
      || this.orderResult.paymentStatus !== 'pending_payment'
      || this.orderResult.orderStatus !== 'pending'
    ) return;

    this.isPaymentCancelConfirmOpen = true;
  },
  closePaymentCancelConfirm() {
    if (this.isCancellingPayment) return;
    this.isPaymentCancelConfirmOpen = false;
  },
  async confirmPaymentCancellation() {
    if (
      this.isCancellingPayment
      || !this.orderResult
      || this.orderResult.paymentMethod !== 'bank_transfer'
      || this.orderResult.paymentStatus !== 'pending_payment'
      || this.orderResult.orderStatus !== 'pending'
    ) return;

    this.isCancellingPayment = true;
    try {
      const response = await orderApi.cancelOrder(this.orderResult.id, {
        reason: 'Customer cancelled during QR payment.'
      });

      if (!response || !response.order) {
        this.flash('This payment could not be cancelled. Please refresh and try again.', 'error');
        return;
      }

      this.orderResult = {
        ...this.orderResult,
        ...response.order,
        bankTransfer: this.orderResult.bankTransfer,
        items: this.orderItems
      };
      this.isPaymentCancelConfirmOpen = false;
      this.flash('Payment and order cancelled successfully.', 'success');
    } finally {
      this.isCancellingPayment = false;
    }
  },
  async expireBankTransferPayment() {
    if (!this.orderResult || this.orderResult.paymentMethod !== 'bank_transfer') return;

    const response = await checkoutApi.expireBankTransferPayment(this.orderResult.id);
    if (!response || !response.order) return;

    this.orderResult = {
      ...this.orderResult,
      ...response.order,
      bankTransfer: this.orderResult.bankTransfer,
      items: this.orderItems
    };

    if (response.order.paymentStatus === 'payment_expired') {
      this.flash('The 10-minute payment window expired. This order was cancelled.', 'error');
    }
  },
  async refreshBankTransferStatus() {
    if (!this.orderResult || this.orderResult.paymentMethod !== 'bank_transfer') return;

    const response = await orderApi.getMyOrder(this.orderResult.id);
    if (!response || !response.order) return;

    this.orderResult = {
      ...this.orderResult,
      ...response.order,
      bankTransfer: response.bankTransfer || {
        ...this.orderResult.bankTransfer,
        expiresAt: response.order.paymentExpiresAt || (this.orderResult.bankTransfer && this.orderResult.bankTransfer.expiresAt) || null
      },
      items: Array.isArray(response.items) ? response.items : this.orderItems
    };
  },
  async submitCheckout() {
    if (this.isSubmitting) return;

    if (!this.checkoutItems.length) {
      this.flash('Select at least one item to checkout', 'error');
      return;
    }

    const checkoutPayload = this.buildCheckoutPayload();

    if (!this.validateCheckoutPayload()) return;

    this.isSubmitting = true;

    try {
      const response = await cartStore.checkout(checkoutPayload);

      if (!response || !response.order) return;

      this.orderResult = {
        ...response.order,
        bankTransfer: response.bankTransfer || null,
        items: Array.isArray(response.items) ? response.items : []
      };
      this.cartItems = cartStore.getItems();
      this.selectedCartItemIds = cartStore.getSelectedItemIds();
      this.form = createDefaultCheckoutForm();
      this.clearVoucher();
      this.flash(
        response.order.paymentMethod === 'bank_transfer'
          ? 'Order placed. Complete the bank transfer and tap I’ve Paid.'
          : 'Order placed successfully.',
        'success'
      );
      if (response.order.paymentMethod === 'bank_transfer') {
        await this.$router.replace(`/checkout/payment/${response.order.id}`);
      }
    } finally {
      this.isSubmitting = false;
    }
  }
};
