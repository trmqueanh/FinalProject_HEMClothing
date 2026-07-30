<template>
  <div class="page-section checkout-view">
    <PageBreadcrumbs :items="breadcrumbItems" />

    <div class="checkout-heading-row">
      <router-link to="/cart" class="checkout-back-button" aria-label="Back to cart">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </router-link>
      <h1 class="checkout-heading">CHECK OUT</h1>
    </div>

    <CheckoutSuccess
      v-if="orderResult"
      :order-result="orderResult"
      :order-items="orderItems"
      :customer-email="customerEmail"
      :continue-shopping-link="continueShoppingLink"
      :format-currency="formatCurrency"
      :is-marking-payment-paid="isMarkingPaymentPaid"
      @activate-bank-transfer="activateBankTransferPayment"
      @mark-bank-transfer-paid="markBankTransferPaid"
      @expire-bank-transfer="expireBankTransferPayment"
      @refresh-bank-transfer="refreshBankTransferStatus"
    />

    <section v-else-if="isCartLoading || isOrderResultLoading" class="shell-card checkout-loading" aria-live="polite">
      <span class="checkout-loading__spinner" aria-hidden="true"></span>
      <div>
        <h2>{{ loadingTitle }}</h2>
        <p>{{ loadingMessage }}</p>
      </div>
    </section>

    <CheckoutEmptyState
      v-else-if="!checkoutItems.length"
      :title="cartItems.length ? 'No items selected.' : 'Your bag is empty.'"
      :message="cartItems.length ? 'Select at least one item to checkout' : 'Add products to your cart before checkout.'"
      action-label="Back to shop"
      action-to="/women"
      :show-action="!cartItems.length"
    />

    <section v-else class="checkout-layout">
      <form id="checkout-form" class="checkout-form" @submit.prevent="submitCheckout">
        <CheckoutAddressForm
          :customer-email="customerEmail"
          :form="form"
          :saved-addresses="savedAddresses"
          :phone-codes="phoneCodes"
          :city-options="cityOptions"
          :district-options="districtOptions"
          :ward-options="wardOptions"
          :is-loading-locations="isLoadingLocations"
          :touched="touched"
          :errors="errors"
          @update-form="updateFormField"
          @select-saved-address="applySelectedAddress"
          @touch-field="touchField"
          @clear-field-error="clearFieldError"
        />

        <CheckoutCouponSection
          :applied-voucher="appliedVoucher"
          :voucher-code="voucherCode"
          :is-voucher-applying="isVoucherApplying"
          :voucher-error="voucherError"
          :has-checked-eligible-vouchers="hasCheckedEligibleVouchers"
          :available-coupons="availableCoupons"
          :format-currency="formatCurrency"
          :coupon-maximum-discount="couponMaximumDiscount"
          @update-voucher-code="voucherCode = $event"
          @apply="applyVoucher"
          @remove="openVoucherRemoveConfirm"
          @use-voucher="useVoucher"
        />

        <CheckoutPaymentSection
          :form="form"
          @update-form="updateFormField"
        />

      </form>

      <CheckoutOrderSummary
        :item-count="itemCount"
        :subtotal="subtotal"
        :shipping="shipping"
        :discount="discountAmount"
        :total="total"
        :items="summaryItems"
        :is-submitting="isSubmitting"
        @submit-checkout="submitCheckout"
      />
    </section>

    <PaymentRemoveDialog
      variant="checkout"
      :open="isPaymentRemoveConfirmOpen"
      @close="closeRemovePaymentConfirm"
      @confirm="confirmRemoveSavedPayment"
    />

    <PaymentRemoveDialog
      variant="checkout"
      :open="isVoucherRemoveConfirmOpen"
      eyebrow-text="Coupon"
      title-text="Remove applied coupon?"
      message-text="The coupon discount will be removed and the order total will return to its original amount."
      confirm-text="Remove coupon"
      danger-tone
      @close="closeVoucherRemoveConfirm"
      @confirm="confirmVoucherRemoval"
    />

    <PaymentRemoveDialog
      variant="checkout"
      :open="isPaymentLeaveConfirmOpen"
      eyebrow-text="Payment in progress"
      title-text="Leave this payment page?"
      message-text="Your bank transfer is not complete. The payment timer will continue while you are away, and you can return from your order details before it expires."
      cancel-text="Continue payment"
      confirm-text="Leave page"
      @close="closePaymentLeaveConfirm"
      @confirm="confirmPaymentPageLeave"
    />
  </div>
</template>

<script>
import { checkoutMethods } from "../../controllers/checkout/checkoutMethods";
import CheckoutAddressForm from '../../components/checkout/CheckoutAddressForm.vue';
import CheckoutCouponSection from '../../components/checkout/CheckoutCouponSection.vue';
import CheckoutEmptyState from '../../components/checkout/CheckoutEmptyState.vue';
import CheckoutOrderSummary from '../../components/checkout/CheckoutOrderSummary.vue';
import CheckoutPaymentSection from '../../components/checkout/CheckoutPaymentSection.vue';
import CheckoutSuccess from '../../components/checkout/CheckoutSuccess.vue';
import PageBreadcrumbs from '../../components/common/PageBreadcrumbs.vue';
import PaymentRemoveDialog from '../../components/payment/PaymentRemoveDialog.vue';
import { cartShipping } from '../../helpers/cart/cartItemHelpers';
import { authStore } from '../../stores/authStore';
import { cartStore } from '../../stores/cartStore';
import {
  createDefaultCheckoutForm
} from '../../helpers/checkout/checkoutForm';
import { VIETNAM_PHONE_CODES } from '../../utils/vietnamLocations';

export default {
  name: 'CheckoutView',
  components: {
    CheckoutAddressForm,
    CheckoutCouponSection,
    CheckoutEmptyState,
    CheckoutOrderSummary,
    CheckoutPaymentSection,
    CheckoutSuccess,
    PageBreadcrumbs,
    PaymentRemoveDialog
  },
  data() {
    return {
      cartItems: cartStore.getItems(),
      selectedCartItemIds: cartStore.getSelectedItemIds(),
      isCartLoading: !cartStore.isHydrated(),
      session: authStore.getSession(),
      form: createDefaultCheckoutForm(),
      savedAddresses: [],
      locations: [],
      isLoadingLocations: false,
      isProfileLoaded: false,
      phoneCodes: VIETNAM_PHONE_CODES,
      touched: {},
      errors: {},
      selectedPaymentOption: '',
      isSubmitting: false,
      isMarkingPaymentPaid: false,
      isActivatingBankTransfer: false,
      isPaymentLeaveConfirmOpen: false,
      pendingPaymentLeavePath: '',
      allowPaymentRouteLeave: false,
      isPaymentRemoveConfirmOpen: false,
      isVoucherRemoveConfirmOpen: false,
      voucherCode: '',
      appliedVoucher: null,
      coupons: [],
      voucherError: '',
      isVoucherApplying: false,
      hasCheckedEligibleVouchers: false,
      orderResult: null,
      isOrderResultLoading: Boolean(this.$route.params.orderId)
    };
  },
  computed: {
    breadcrumbItems() {
      return [
        {
          label: 'hem.com',
          route: {
            path: '/women'
          }
        },
        {
          label: 'cart',
          route: {
            path: '/cart'
          }
        },
        {
          label: 'checkout',
          current: true
        }
      ];
    },
    itemCount() {
      return this.checkoutItems.reduce((total, item) => total + item.quantity, 0);
    },
    checkoutItems() {
      const selectedIds = new Set(this.selectedCartItemIds);
      return this.cartItems.filter(item => selectedIds.has(this.cartItemId(item)));
    },
    subtotal() {
      return this.checkoutItems.reduce((total, item) => total + item.price * item.quantity, 0);
    },
    shipping() {
      return cartShipping(this.subtotal);
    },
    total() {
      return this.subtotal + this.shipping - this.discountAmount;
    },
    discountAmount() {
      return this.appliedVoucher ? Number(this.appliedVoucher.discountAmount || 0) : 0;
    },
    availableCoupons() {
      return this.coupons
        .filter(coupon => coupon.status === 'active');
    },
    isBankTransferPayment() {
      return this.form.paymentMethod === 'bank_transfer';
    },
    cityOptions() {
      if (!this.form.city || this.locations.some(location => location.name === this.form.city)) {
        return this.locations;
      }

      return [
        {
          name: this.form.city,
          districts: []
        },
        ...this.locations
      ];
    },
    districtOptions() {
      const city = this.locations.find(location => location.name === this.form.city);
      const districts = city ? city.districts : [];

      if (!this.form.district || districts.some(district => district.name === this.form.district)) {
        return districts;
      }

      return [
        {
          name: this.form.district,
          wards: []
        },
        ...districts
      ];
    },
    wardOptions() {
      const district = this.districtOptions.find(item => item.name === this.form.district);
      const wards = district ? district.wards : [];

      if (!this.form.ward || wards.includes(this.form.ward)) {
        return wards;
      }

      return [this.form.ward, ...wards];
    },
    submitLabel() {
      return this.isBankTransferPayment ? 'Place order and show QR' : 'Place order';
    },
    summaryItems() {
      return this.checkoutItems.map(item => ({
        ...item,
        brand: item.brand || 'HEM',
        productId: item.productId || item.product_id || item.id,
        productCode: item.productCode || item.product_code || item.articleNumber || item.article_number || '',
        articleNumber: item.articleNumber || item.article_number || item.productCode || item.product_code || '',
        color: item.color || item.colorName || item.color_name || '',
        size: item.size || item.sizeLabel || item.size_label || ''
      }));
    },
    orderItems() {
      return this.orderResult && Array.isArray(this.orderResult.items) ? this.orderResult.items : [];
    },
    continueShoppingLink() {
      const firstItem = this.orderItems[0];
      return firstItem && firstItem.product && firstItem.product.gender === 'men' ? '/men' : '/women';
    },
    customerEmail() {
      return this.session.user && this.session.user.email ? this.session.user.email : '';
    },
    paymentOrderId() {
      return String(this.$route.params.orderId || '').trim();
    },
    shouldConfirmPaymentLeave() {
      return this.$route.name === 'checkout-payment'
        && Boolean(this.orderResult)
        && this.orderResult.paymentMethod === 'bank_transfer'
        && this.orderResult.paymentStatus === 'pending_payment';
    },
    loadingTitle() {
      return this.paymentOrderId ? 'Loading payment details...' : 'Loading your bag...';
    },
    loadingMessage() {
      return this.paymentOrderId
        ? 'Restoring the QR code and payment time remaining.'
        : 'Preparing your checkout details.';
    }
  },
  watch: {
    'form.city'(value, previousValue) {
      if (previousValue && value !== previousValue) {
        this.form.district = '';
        this.form.ward = '';
      }
    },
    'form.district'(value, previousValue) {
      if (previousValue && value !== previousValue) {
        this.form.ward = '';
      }
    },
    'form.paymentMethod'(value) {
      this.selectedPaymentOption = value === 'bank_transfer' ? 'bank_transfer' : '';
    },
    subtotal(value, previousValue) {
      if (this.appliedVoucher && value !== previousValue) {
        this.clearVoucher();
      }

      if (this.hasCheckedEligibleVouchers && value !== previousValue) {
        this.loadCoupons();
      }
    },
    '$route.params.orderId'(value, previousValue) {
      if (value && value !== previousValue && String(this.orderResult && this.orderResult.id || '') !== String(value)) {
        this.loadBankTransferOrder();
      }
    }
  },
  methods: checkoutMethods,
  created() {
    this.handleCartUpdate = () => {
      this.cartItems = cartStore.getItems();
      this.selectedCartItemIds = cartStore.getSelectedItemIds();
      this.isCartLoading = false;
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('cart-updated', this.handleCartUpdate);
      this.handleCheckoutBeforeUnload = event => {
        if (!this.shouldConfirmPaymentLeave) return;
        event.preventDefault();
        event.returnValue = '';
      };
      window.addEventListener('beforeunload', this.handleCheckoutBeforeUnload);
    }
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('cart-updated', this.handleCartUpdate);
      window.removeEventListener('beforeunload', this.handleCheckoutBeforeUnload);
    }
  },
  beforeRouteLeave(to, from, next) {
    this.guardPendingPaymentNavigation(to, next);
  },
  beforeRouteUpdate(to, from, next) {
    this.guardPendingPaymentNavigation(to, next);
  },
  mounted() {
    if (this.paymentOrderId) {
      this.isCartLoading = false;
      this.loadBankTransferOrder();
      return;
    }

    this.syncCart()
      .catch(() => {
        this.isCartLoading = false;
      })
      .finally(() => {
        this.loadCoupons().catch(() => {
          this.coupons = [];
          this.hasCheckedEligibleVouchers = true;
        });
        this.loadProfile()
          .catch(() => {
            this.isProfileLoaded = true;
          });
      });
    this.loadLocations();
  }
};
</script>

<style scoped src="@/assets/styles/checkout/Checkout.css"></style>
