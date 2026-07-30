<template>
  <div
    class="page-section profile-view"
    :class="{ 'profile-view--order-detail': activeSection === 'orders' && orderDetailId }"
  >
    <PageBreadcrumbs :items="breadcrumbItems" />

    <ProfileSummaryHeader
      :current-user="currentUser"
      :member-code="memberCode"
      :total-orders="orderSummary.totalOrders"
      :total-spent="orderSummary.totalSpent"
      :format-currency="formatCurrency"
    />

    <section class="profile-layout">
      <ProfileSidebar
        :sections="sections"
        :is-section-active="isSectionActive"
        @select-section="setSection"
        @request-logout="requestLogout"
      />

      <main class="profile-content">
        <transition name="profile-panel" mode="out-in">
          <div :key="profilePanelKey" class="profile-content__panel">
            <OrderDetail
          v-if="activeSection === 'orders' && orderDetailId"
          :selected-order="selectedOrder"
          :order-items="selectedOrderItems"
          :timeline="orderTimeline"
          :is-loading="isLoadingOrderDetail"
          :focus-refund-account="focusRefundAccount"
          :is-saving="isSaving"
          :is-buying-again="isBuyingAgain"
          :short-id="shortId"
          :format-full-shipping-address="formatFullShippingAddress"
          :format-currency="formatCurrency"
          :product-link="productLink"
          :item-price="itemPrice"
          :price-label="priceLabel"
          :can-buy-again-order="canBuyAgainOrder"
          :can-review-order-item="canReviewOrderItem"
          :is-reviewed-order-item="isReviewedOrderItem"
          :is-timeline-cancellation="isTimelineCancellation"
          :format-order-timeline-title="formatOrderTimelineTitle"
          :format-timeline-role="formatTimelineRole"
          :format-date="formatDate"
          :format-timeline-note="formatTimelineNote"
          :order-status-badge-class="orderStatusBadgeClass"
          :format-label="formatLabel"
          :format-payment-method="formatPaymentMethod"
          :is-order-canceled="isOrderCanceled"
          :format-cancel-actor="formatCancelActor"
          :format-cancel-reason="formatCancelReason"
          :can-confirm-received="canConfirmReceived"
          :can-request-return="canRequestReturn"
          @back="$router.push('/profile/orders')"
          @request-buy-again="openBuyAgainDialog"
          @review="openOrderReviewForm(selectedOrder, $event)"
          @confirm-received="openConfirmReceivedConfirm"
          @request-return="openReturnRequestConfirm"
          @save-return-refund-account="saveReturnRefundAccount"
          @save-refund-account="saveOrderRefundAccount"
        />

            <OrdersList
          v-else-if="activeSection === 'orders'"
          :orders="orders"
          :order-search="orderSearch"
          :status-tabs="orderStatusTabs"
          :active-status-tab="orderStatusFilter"
          :pagination="ordersPagination"
          :is-loading="isLoadingOrders"
          :short-id="shortId"
          :format-date="formatDate"
          :format-currency="formatCurrency"
          :format-label="formatLabel"
          :order-status-badge-class="orderStatusBadgeClass"
          :product-link="productLink"
          :item-price="itemPrice"
          :price-label="priceLabel"
          :can-cancel-order="canCancelOrder"
          :can-confirm-received="canConfirmReceived"
          @update-order-search="orderSearch = $event"
          @select-status-tab="selectOrderStatusTab"
          @clear-search="orderSearch = ''"
          @cancel-order="openCancelOrderConfirm"
          @confirm-received="openConfirmReceivedConfirm"
          @view-detail="$router.push(`/profile/orders/${$event.id}`)"
          @set-page="setOrderPage"
        />

            <CouponList
          v-else-if="activeSection === 'coupons'"
          :coupons="coupons"
          :is-loading="isLoadingCoupons"
          :format-label="formatLabel"
          :format-currency="formatCurrency"
        />

            <ReviewList
          v-else-if="activeSection === 'reviews'"
          :reviews="reviews"
          :is-loading="isLoadingReviews"
          :editing-review-id="editingReviewId"
          :review-draft="reviewDraft"
          :is-saving="isSaving"
          :review-variant-label="reviewVariantLabel"
          :format-date="formatDate"
          :format-label="formatLabel"
          @update-review-draft="reviewDraft = { ...reviewDraft, ...$event }"
          @save-review="saveReviewEdit"
          @cancel-edit="cancelReviewEdit"
          @start-edit="startReviewEdit"
          @delete-review="openDeleteReviewConfirm"
        />

            <ProfileSettings
          v-else-if="activeSection === 'settings'"
          :current-user="currentUser"
          :form="form"
          :addresses="addresses"
          :has-saved-card="Boolean(hasSavedCard)"
          :saved-card-label="savedCardLabel"
          :saved-card-brand-short="savedCardBrandShort"
          :is-saving="isSaving"
          :display-date="displayDate"
          :format-address="formatAddress"
          @open-editor="openEditor"
          @add-address="startAddAddress"
          @edit-address="startEditAddress"
          @set-address-default="setAddressDefault"
          @delete-address="openDeleteAddressConfirm"
          @remove-card="openPaymentRemoveConfirm"
        />

            <ProfileInformationForm
          v-else-if="activeSection === 'edit-information'"
          :current-user="currentUser"
          :form="form"
          :is-saving="isSaving"
          @save="saveProfile('personal')"
          @cancel="setSection('settings')"
          @update-form="form[$event.field] = $event.value"
        />

            <AddressForm
          v-else-if="activeSection === 'add-address' || activeSection === 'edit-address'"
          :key="`${addressFormMode}-${editingAddressId || 'new'}`"
          :address-form="addressForm"
          :editing-address-id="editingAddressId"
          :mode="activeSection === 'edit-address' ? 'edit' : addressFormMode"
          :phone-country-code="addressPhoneCountryCode"
          :phone-local-number="addressPhoneLocalNumber"
          :phone-codes="phoneCodes"
          :city-options="cityOptions"
          :district-options="districtOptions"
          :ward-options="wardOptions"
          :is-loading-locations="isLoadingLocations"
          :is-saving="isSaving"
          @save="saveAddress"
          @cancel="setSection('settings')"
          @update-address-form="addressForm[$event.field] = $event.value"
          @update-phone-country-code="addressPhoneCountryCode = $event"
          @update-phone-local-number="addressPhoneLocalNumber = $event"
        />

            <ChangePasswordForm
          v-else
          :is-submitting="isChangingPassword"
          :server-error="passwordServerError"
          :success-message="passwordSuccessMessage"
          @submit="changePassword"
          @cancel="setSection('settings')"
          @clear-server-error="clearPasswordServerError"
            />
          </div>
        </transition>
      </main>
    </section>

    <PaymentRemoveDialog
      :open="isPaymentRemoveConfirmOpen"
      :is-saving="isSaving"
      @close="closePaymentRemoveConfirm"
      @confirm="confirmRemoveSavedPayment"
    />

    <ProfileConfirmDialog
      v-if="!pendingProfileConfirm || pendingProfileConfirm.type !== 'request-return'"
      :confirm="pendingProfileConfirm"
      :is-saving="isSaving"
      :is-disabled="isPendingConfirmDisabled"
      @close="closeProfileConfirm"
      @confirm="confirmProfileAction"
      @update-reason="pendingProfileConfirm.reason = $event"
      @update-return-reason="pendingProfileConfirm.returnReason = $event"
      @update-note="pendingProfileConfirm.note = $event"
    />

    <ReturnRequestDialog
      v-if="pendingProfileConfirm && pendingProfileConfirm.type === 'request-return'"
      :order="pendingProfileConfirm.order"
      :items="pendingProfileConfirm.items"
      :is-saving="isSaving"
      @close="closeProfileConfirm"
      @submit="confirmReturnRequest"
    />

    <BuyAgainDialog
      v-if="buyAgainDialogOrder"
      :order="buyAgainDialogOrder"
      :items="buyAgainDialogOrder.items || selectedOrderItems"
      :is-saving="isBuyingAgain"
      :results="buyAgainResults"
      :format-currency="formatCurrency"
      :item-price="itemPrice"
      :unavailable-text="buyAgainUnavailableText"
      @close="closeBuyAgainDialog"
      @submit="submitBuyAgain"
    />

    <OrderReviewModal
      :target="orderReviewTarget"
      :review-draft="reviewDraft"
      :is-saving="isSaving"
      @close="closeOrderReviewForm"
      @submit-review="submitOrderReview"
      @update-review-draft="reviewDraft = { ...reviewDraft, ...$event }"
    />
  </div>
</template>

<script>
import { profileMethods } from "../../controllers/profile/profileMethods";
import AddressForm from '../../components/address/AddressForm.vue';
import PageBreadcrumbs from '../../components/common/PageBreadcrumbs.vue';
import ProfileConfirmDialog from '../../components/common/ProfileConfirmDialog.vue';
import BuyAgainDialog from '../../components/order/BuyAgainDialog.vue';
import OrderDetail from '../../components/order/OrderDetail.vue';
import OrderReviewModal from '../../components/order/OrderReviewModal.vue';
import OrdersList from '../../components/order/OrdersList.vue';
import ReturnRequestDialog from '../../components/order/ReturnRequestDialog.vue';
import PaymentRemoveDialog from '../../components/payment/PaymentRemoveDialog.vue';
import ChangePasswordForm from '../../components/profile/ChangePasswordForm.vue';
import CouponList from '../../components/profile/CouponList.vue';
import ProfileInformationForm from '../../components/profile/ProfileInformationForm.vue';
import ProfileSettings from '../../components/profile/ProfileSettings.vue';
import ProfileSidebar from '../../components/profile/ProfileSidebar.vue';
import ProfileSummaryHeader from '../../components/profile/ProfileSummaryHeader.vue';
import ReviewList from '../../components/profile/ReviewList.vue';
import { authStore } from '../../stores/authStore';
import {
  DEFAULT_ADDRESS_FORM,
  DEFAULT_PROFILE_FORM,
  ORDER_STATUS_TABS,
  isOrderRequestTab,
  detectCardBrand,
  resolveOrderStatusesForTab,
  resolveProfileRouteSection,
} from '../../helpers/profile/profilePageHelpers';
import { VIETNAM_PHONE_CODES } from '../../utils/vietnamLocations';

export default {
  name: 'ProfileView',
  components: {
    AddressForm,
    CouponList,
    PageBreadcrumbs,
    ProfileConfirmDialog,
    BuyAgainDialog,
    OrderDetail,
    OrderReviewModal,
    OrdersList,
    ReturnRequestDialog,
    PaymentRemoveDialog,
    ProfileInformationForm,
    ProfileSettings,
    ProfileSidebar,
    ProfileSummaryHeader,
    ReviewList,
    ChangePasswordForm
  },
  data() {
    return {
      session: authStore.getSession(),
      activeSection: resolveProfileRouteSection(this.$route),
      editingSection: '',
      form: DEFAULT_PROFILE_FORM(),
      addressForm: DEFAULT_ADDRESS_FORM(),
      addressFormMode: 'add',
      editingAddressId: '',
      addresses: [],
      locations: [],
      orderSearch: '',
      orderStatusFilter: 'all',
      isLoadingLocations: false,
      phoneCodes: VIETNAM_PHONE_CODES,
      addressPhoneCountryCode: '+84',
      addressPhoneLocalNumber: '',
      orders: [],
      selectedOrder: null,
      orderTimeline: [],
      currentOrderPage: 1,
      ordersPagination: {
        page: 1,
        limit: 6,
        totalItems: 0,
        totalPages: 1
      },
      orderSummary: {
        totalOrders: 0,
        totalSpent: 0
      },
      reviews: [],
      coupons: [],
      editingReviewId: '',
      reviewDraft: {
        rating: 5,
        comment: ''
      },
      orderReviewTarget: null,
      isLoadingOrders: true,
      isLoadingOrderDetail: false,
      buyAgainDialogOrder: null,
      buyAgainResults: [],
      isBuyingAgain: false,
      isLoadingReviews: true,
      isLoadingCoupons: true,
      isSaving: false,
      isChangingPassword: false,
      isPaymentRemoveConfirmOpen: false,
      pendingProfileConfirm: null,
      orderSearchTimer: null,
      paymentTouched: {},
      paymentErrors: {},
      passwordServerError: null,
      passwordSuccessMessage: ''
    };
  },
  computed: {
    currentUser() {
      return this.session.user || { id: '', name: 'Customer', email: '' };
    },
    orderDetailId() {
      return String(this.$route.params.orderId || '').trim();
    },
    returnDetailId() {
      return String(this.$route.params.returnRequestId || '').trim();
    },
    focusRefundAccount() {
      return String(this.$route.query.focus || '').trim().toLowerCase() === 'refund-account';
    },
    selectedOrderItems() {
      return this.selectedOrder && Array.isArray(this.selectedOrder.items) ? this.selectedOrder.items : [];
    },
    profilePanelKey() {
      if (this.orderDetailId) return `order-${this.orderDetailId}`;
      if (this.returnDetailId) return `return-${this.returnDetailId}`;
      if (this.activeSection === 'edit-address') return `edit-address-${this.editingAddressId || 'unknown'}`;
      return this.activeSection;
    },
    orderStatusTabs() {
      return ORDER_STATUS_TABS;
    },
    selectedOrderStatuses() {
      return resolveOrderStatusesForTab(this.orderStatusFilter);
    },
    isOrderRequestFilter() {
      return isOrderRequestTab(this.orderStatusFilter);
    },
    breadcrumbItems() {
      return [
        {
          label: 'hem.com',
          route: {
            path: '/women'
          }
        },
        {
          label: 'account',
          current: true
        }
      ];
    },
    sections() {
      return [
        { key: 'orders', label: 'Orders' },
        { key: 'coupons', label: 'Coupons' },
        { key: 'reviews', label: 'My Reviews' },
        { key: 'settings', label: 'Account settings' }
      ];
    },
    memberCode() {
      return this.currentUser.id ? `HEM-${String(this.currentUser.id).slice(0, 8).toUpperCase()}` : 'HEM-MEMBER';
    },
    defaultAddress() {
      return this.addresses.find(address => address.isDefault) || this.addresses[0] || null;
    },
    displayPaymentProvider() {
      if (this.form.paymentProvider === 'cod') return 'Cash on Delivery';
      if (this.form.paymentProvider === 'bank_transfer') return 'Bank Transfer (QR Code)';
      return '';
    },
    hasSavedCard() {
      return false;
    },
    savedCardBrandLabel() {
      if (this.form.cardBrand === 'visa') return 'Visa';
      if (this.form.cardBrand === 'mastercard') return 'Mastercard';
      return 'Card';
    },
    savedCardBrandShort() {
      if (this.form.cardBrand === 'visa') return 'VISA';
      if (this.form.cardBrand === 'mastercard') return 'MC';
      return 'CARD';
    },
    savedCardLabel() {
      return ` •••• •••• •••• ${this.form.cardLast4}`;
    },
    profileCardBrand() {
      return detectCardBrand(this.form.cardNumber);
    },
    profileSavedCardLabel() {
      if (!this.form.cardLast4) {
        return '';
      }

      return `Saved card ending in ${this.form.cardLast4}`;
    },
    cityOptions() {
      if (!this.addressForm.city || this.locations.some(location => location.name === this.addressForm.city)) {
        return this.locations;
      }

      return [
        {
          name: this.addressForm.city,
          districts: []
        },
        ...this.locations
      ];
    },
    districtOptions() {
      const city = this.locations.find(location => location.name === this.addressForm.city);
      const districts = city ? city.districts : [];

      if (!this.addressForm.district || districts.some(district => district.name === this.addressForm.district)) {
        return districts;
      }

      return [
        {
          name: this.addressForm.district,
          wards: []
        },
        ...districts
      ];
    },
    wardOptions() {
      const district = this.districtOptions.find(item => item.name === this.addressForm.district);
      const wards = district ? district.wards : [];

      if (!this.addressForm.ward || wards.includes(this.addressForm.ward)) {
        return wards;
      }

      return [this.addressForm.ward, ...wards];
    },
    isPendingConfirmDisabled() {
      if (!this.pendingProfileConfirm) {
        return false;
      }

      if (this.pendingProfileConfirm.requiresReason && !String(this.pendingProfileConfirm.reason || '').trim()) {
        return true;
      }

      if (this.pendingProfileConfirm.returnReasons && !String(this.pendingProfileConfirm.returnReason || '').trim()) {
        return true;
      }

      return false;
    }
  },
  watch: {
    '$route.query.section'() {
      this.activeSection = resolveProfileRouteSection(this.$route);
      this.editingSection = '';
      this.syncAddressEditFromRoute();
    },
    '$route.fullPath'() {
      this.activeSection = resolveProfileRouteSection(this.$route);
      this.editingSection = '';
      this.syncAddressEditFromRoute();

      if (this.orderDetailId) {
        this.loadOrderDetail();
      }
      if (this.returnDetailId) {
        this.redirectLegacyReturnDetail();
      }
    },
    orderSearch() {
      this.scheduleOrderSearch();
    },
    'addressForm.city'(value, previousValue) {
      if (previousValue && value !== previousValue) {
        this.addressForm.district = '';
        this.addressForm.ward = '';
      }
    },
    'addressForm.district'(value, previousValue) {
      if (previousValue && value !== previousValue) {
        this.addressForm.ward = '';
      }
    },
    'form.paymentProvider'(value) {
      if (value === 'cod') {
        this.form.cardHolderName = '';
        this.form.cardNumber = '';
        this.form.cardLast4 = '';
        this.paymentTouched = {};
        this.paymentErrors = {};
      }
    }
  },
  methods: profileMethods,
  async mounted() {
    await Promise.all([this.loadLocations(), this.loadProfile(), this.loadOrders(), this.loadReviews(), this.loadCoupons()]);
    await this.syncAddressEditFromRoute();
    if (this.orderDetailId) {
      await this.loadOrderDetail();
    }
    if (this.returnDetailId) {
      await this.redirectLegacyReturnDetail();
    }
  },
  beforeUnmount() {
    window.clearTimeout(this.orderSearchTimer);
  }
};
</script>

<style scoped src="@/assets/styles/profile/Profile.css"></style>
