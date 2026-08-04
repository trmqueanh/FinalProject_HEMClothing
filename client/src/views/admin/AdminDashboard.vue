<template>
  <div class="admin-dashboard">
    <admin-shell
      :current-section="currentSection"
      :current-user="currentUser"
      :current-user-initials="currentUserInitials"
      :is-product-menu-open="isProductMenuOpen"
      :product-panel-mode="productPanelMode"
      :sections="sections"
      @request-logout="requestLogout"
      @select-product-mode="selectProductMode"
      @set-section="setSection"
      @toggle-product-menu="toggleProductMenu"
    >
        <AdminDashboardHome
          v-if="currentSection === 'dashboard'"
          :metrics="metrics"
          :dashboard-metric="dashboardMetric"
          :order-status-summary="orderStatusSummary"
          :pie-slices="pieSlices"
          :hovered-status="hoveredStatus"
          :status-color="statusColor"
          :format-label="formatLabel"
          :dashboard-year="dashboardYear"
          :dashboard-year-options="dashboardYearOptions"
          :chart-points="chartPoints"
          :chart-hover="chartHover"
          :on-bar-hover="onBarHover"
          :format-currency="formatCurrency"
          :top-products-by-gender="topProductsByGender"
          :top-buyers="topBuyers"
          :top-buyers-pagination="topBuyersPagination"
          :recent-orders="recentOrders"
          :recent-orders-pagination="recentOrdersPagination"
          :short-order-id="shortOrderId"
          :format-date="formatDate"
          :payment-status-class="paymentStatusClass"
          :order-status-class="orderStatusClass"
          @update-hovered-status="hoveredStatus = $event"
          @clear-chart-hover="chartHover = null"
          @set-dashboard-year="setDashboardYear"
          @set-buyer-page="setDashboardBuyerPage"
          @set-order-page="setDashboardOrderPage"
        />

        <div v-else class="admin-section-frame">
          <AdminProductsSection v-if="currentSection === 'products'" />
          <AdminOrdersSection v-else-if="currentSection === 'orders'" />
          <AdminPaymentsSection v-else-if="currentSection === 'payments'" />
          <AdminRequestsSection v-else-if="currentSection === 'requests'" />
          <AdminCategoriesSection v-else-if="currentSection === 'categories'" />
          <AdminCollectionsSection v-else-if="currentSection === 'collections'" />
          <AdminInventorySection v-else-if="currentSection === 'inventory'" />
          <AdminVouchersSection v-else-if="currentSection === 'vouchers'" />
          <AdminNotificationsSection v-else-if="currentSection === 'notifications'" />
          <AdminAccountsSection v-else-if="currentSection === 'accounts'" />
        </div>
    </admin-shell>

    <AdminInventoryHistoryDialog />
    <AdminStockImportDialog />
    <AdminConfirmDialogs />
  </div>
</template>

<script>
import AdminProductsSection from '../../components/admin/sections/products/AdminProductsSection.vue';
import AdminOrdersSection from '../../components/admin/sections/orders/AdminOrdersSection.vue';
import AdminPaymentsSection from '../../components/admin/sections/payments/AdminPaymentsSection.vue';
import AdminRequestsSection from '../../components/admin/sections/requests/AdminRequestsSection.vue';
import AdminNotificationsSection from '../../components/admin/sections/notifications/AdminNotificationsSection.vue';
import AdminCategoriesSection from '../../components/admin/sections/catalog/AdminCategoriesSection.vue';
import AdminCollectionsSection from '../../components/admin/sections/catalog/AdminCollectionsSection.vue';
import AdminInventorySection from '../../components/admin/sections/inventory/AdminInventorySection.vue';
import AdminVouchersSection from '../../components/admin/sections/vouchers/AdminVouchersSection.vue';
import AdminInventoryHistoryDialog from '../../components/admin/dialogs/AdminInventoryHistoryDialog.vue';
import AdminStockImportDialog from '../../components/admin/dialogs/AdminStockImportDialog.vue';
import AdminConfirmDialogs from '../../components/admin/dialogs/AdminConfirmDialogs.vue';
import AdminAccountsSection from '../../components/admin/sections/accounts/AdminAccountsSection.vue';
import AdminDashboardHome from '../../components/admin/dashboard/AdminDashboardHome.vue';
import { adminDashboardMethods } from '../../components/admin/dashboard/adminDashboardMethods';
import AdminShell from '../../components/admin/layout/AdminShell.vue';
import { authStore } from '../../stores/authStore';
import {
  ADMIN_SECTIONS,
  ADMIN_SECTION_TITLES,
  DEFAULT_METRICS,
  DEFAULT_ORDER_STATS,
  EMPTY_CATEGORY_FORM,
  EMPTY_COLLECTION_FORM,
  EMPTY_VOUCHER_FORM,
  LEGACY_ADMIN_LOCATION_STORAGE_KEY,
  readAdminListState,
  readAdminProductListState,
  resolveInitialProductMode,
  resolveInitialSection
} from '../../helpers/admin/adminDashboardConfig';
import { buildAdminPieSlices } from '../../helpers/admin/adminChartPresentation';
import { getVietnamCurrentYear } from '../../helpers/dateTime';
import { primeAdminOrderDetail } from '../../stores/adminOrderDetailStore';

export default {
  name: 'AdminDashboardView',
  components: {
    AdminAccountsSection,
    AdminConfirmDialogs,
    AdminInventoryHistoryDialog,
    AdminStockImportDialog,
    AdminCategoriesSection,
    AdminCollectionsSection,
    AdminDashboardHome,
    AdminInventorySection,
    AdminNotificationsSection,
    AdminOrdersSection,
    AdminPaymentsSection,
    AdminProductsSection,
    AdminRequestsSection,
    AdminShell,
    AdminVouchersSection
  },
  provide() {
    return {
      adminDashboard: this
    };
  },
  data() {
    const productListState = readAdminProductListState();
    const orderListState = readAdminListState('orders');
    const paymentListState = readAdminListState('payments');
    const requestListState = readAdminListState('requests');
    const categoryListState = readAdminListState('categories');
    const collectionListState = readAdminListState('collections');
    const voucherListState = readAdminListState('vouchers');
    const accountListState = readAdminListState('accounts');
    const initialSection = resolveInitialSection(this.$route);
    const initialProductMode = resolveInitialProductMode(this.$route);
    const routeSearch = String(this.$route.query && this.$route.query.search || '').trim();
    const routeRequestMode = String(this.$route.query && this.$route.query.mode || '').trim().toLowerCase();

    return {
      currentSection: initialSection,
      hasActivatedOnce: false,
      metrics: DEFAULT_METRICS(),
      hasLoadedDashboard: false,
      dashboardYear: getVietnamCurrentYear(),
      dashboardBuyerPage: 1,
      dashboardOrderPage: 1,
      dashboardTopProductPage: 1,
      recentOrders: [],
      recentOrdersPagination: {
        page: 1,
        limit: 5,
        totalItems: 0,
        totalPages: 1
      },
      recentProducts: [],
      recentUsers: [],
      orderTrend: [],
      orderStatusSummary: [],
      topProducts: [],
      topProductsByGender: {
        women: [],
        men: []
      },
      topProductsPagination: {
        page: 1,
        limit: 5,
        totalItems: 0,
        totalPages: 1
      },
      topBuyers: [],
      topBuyersPagination: {
        page: 1,
        limit: 5,
        totalItems: 0,
        totalPages: 1
      },
      hoveredStatus: null,
      pieHoverX: 0,
      pieHoverY: 0,
      chartHover: null,
      orders: [],
      orderStats: DEFAULT_ORDER_STATS(),
      orderPagination: {
        page: Math.max(1, Number(orderListState.page || 1)),
        limit: 10,
        totalItems: 0,
        totalPages: 1
      },
      requestPanelMode: routeRequestMode === 'refunds'
        ? 'refunds'
        : String(requestListState.mode || '') === 'refunds' ? 'refunds' : 'returns',
      requestSearch: initialSection === 'requests' && routeSearch
        ? routeSearch
        : String(requestListState.search || ''),
      bankTransferPayments: [],
      bankTransferPaymentStatusFilter: String(paymentListState.status || 'payment_under_review'),
      bankTransferPaymentSearch: initialSection === 'payments' && routeSearch
        ? routeSearch
        : String(paymentListState.search || ''),
      returnRequests: [],
      refundRequests: [],
      returnRequestStatusFilter: String(requestListState.returnStatus || ''),
      refundRequestStatusFilter: String(requestListState.refundStatus || ''),
      products: [],
      productPanelMode: initialProductMode,
      isProductMenuOpen: true,
      productReviews: [],
      productReviewReplyDrafts: {},
      editingProductReviewReplyIds: {},
      expandedProductReviewReplyIds: {},
      savingProductReviewReplies: {},
      productReviewSearch: initialSection === 'products' && initialProductMode === 'reviews' ? routeSearch : '',
      productReviewIdFilter: initialSection === 'products' && initialProductMode === 'reviews'
        ? String(this.$route.query && this.$route.query.reviewId || '').trim()
        : '',
      productReviewGenderFilter: '',
      productReviewProductGroupFilter: '',
      productReviewCategoryFilter: '',
      productReviewRatingFilter: '',
      productReviewDateRange: '',
      productReviewPagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1
      },
      productGenderFilter: String(productListState.gender || ''),
      productGroupFilter: String(productListState.group || ''),
      productCategoryFilter: String(productListState.category || ''),
      productCollectionFilter: String(productListState.collection || ''),
      productStyleFilter: String(productListState.style || ''),
      productStatusFilter: String(productListState.status || ''),
      productPagination: {
        page: Math.max(1, Number(productListState.page || 1)),
        limit: 10,
        totalItems: 0,
        totalPages: 1
      },
      categories: [],
      filterCategories: [],
      productGroups: [],
      categoryGenderFilter: String(categoryListState.gender || ''),
      categoryProductGroupFilter: String(categoryListState.group || ''),
      categoryPagination: {
        page: Math.max(1, Number(categoryListState.page || 1)),
        limit: 10,
        totalItems: 0,
        totalPages: 1
      },
      collections: [],
      styles: [],
      collectionPagination: {
        page: Math.max(1, Number(collectionListState.page || 1)),
        limit: 10,
        totalItems: 0,
        totalPages: 1
      },
      accounts: [],
      adminAccounts: [],
      customerAccounts: [],
      adminAccountPagination: {
        page: Math.max(1, Number(accountListState.adminPage || 1)),
        limit: 10,
        totalItems: 0,
        totalPages: 1
      },
      customerAccountPagination: {
        page: Math.max(1, Number(accountListState.customerPage || 1)),
        limit: 10,
        totalItems: 0,
        totalPages: 1
      },
      accountPagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1
      },
      accountSummary: {
        total: 0,
        admins: 0,
        users: 0
      },
      orderEdits: {},
      savingOrders: {},
      inventoryItems: [],
      inventoryLogs: [],
      inventoryStats: {
        totalProducts: 0,
        inStockProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0
      },
      inventoryPagination: {
        page: 1,
        limit: 10,
        totalItems: 0,
        totalPages: 1
      },
      inventorySearch: initialSection === 'inventory' || initialProductMode === 'stock' ? routeSearch : '',
      inventoryGenderFilter: '',
      inventoryProductGroupFilter: '',
      inventoryCategoryFilter: '',
      inventoryStockRangeFilter: '',
      inventoryDateRangeFilter: '',
      inventoryImport: {
        variantId: '',
        quantity: 1,
        note: ''
      },
      selectedInventoryImportVariant: null,
      isImportingInventory: false,
      vouchers: [],
      voucherPagination: {
        page: Math.max(1, Number(voucherListState.page || 1)),
        limit: 10,
        totalItems: 0,
        totalPages: 1
      },
      voucherSearch: String(voucherListState.search || ''),
      voucherForm: EMPTY_VOUCHER_FORM(),
      categoryForm: EMPTY_CATEGORY_FORM(),
      collectionForm: EMPTY_COLLECTION_FORM(),
      departments: [],
      orderSearch: initialSection === 'orders' && routeSearch ? routeSearch : String(orderListState.search || ''),
      orderStatusFilter: String(orderListState.status || ''),
      orderPaymentFilter: String(orderListState.payment || ''),
      orderDateRange: String(orderListState.dateRange || ''),
      productSearch: String(productListState.search || ''),
      categorySearch: String(categoryListState.search || ''),
      collectionSearch: String(collectionListState.search || ''),
      accountSearch: String(accountListState.search || ''),
      accountDateRange: String(accountListState.dateRange || ''),
      pendingProductDelete: null,
      pendingOrderSave: null,
      pendingOrderCancel: null,
      pendingOrderCancelReason: '',
      pendingActionConfirm: null,
      isAdminActionConfirmSaving: false,
      selectedAdminOrderDetail: null,
      isLoadingAdminOrderDetail: false,
      selectedAdminProductPreview: null,
      isLoadingAdminProductPreview: false,
      selectedInventoryHistory: null,
      isLoadingInventoryHistory: false,
      isLoadingDashboardDetails: false,
      loadingSections: {},
      searchTimers: {}
    };
  },
  computed: {
    sections() {
      return ADMIN_SECTIONS;
    },
    currentUser() {
      return authStore.getUser() || { name: 'Admin', email: '' };
    },
    currentUserInitials() {
      return String(this.currentUser.name || 'Admin')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('') || 'A';
    },
    dashboardYearOptions() {
      const currentYear = getVietnamCurrentYear();
      const firstYear = Math.min(2020, this.dashboardYear || currentYear);
      const lastYear = Math.max(currentYear + 1, this.dashboardYear || currentYear);
      const years = [];

      for (let year = lastYear; year >= firstYear; year -= 1) {
        years.push(year);
      }

      return years;
    },
    productPanelTitle() {
      if (this.productPanelMode === 'stock') {
        return `${this.inventoryPagination.totalItems || this.filteredInventoryItems.length} stock products`;
      }

      if (this.productPanelMode === 'reviews') {
        return `${this.productReviewPagination.totalItems || this.productReviews.length} product reviews`;
      }

      return `${this.productPagination.totalItems || this.filteredProducts.length} products`;
    },
    productPanelHeading() {
      if (this.productPanelMode === 'stock') return 'Stock Products';
      if (this.productPanelMode === 'reviews') return 'Product Review';
      return 'Product List';
    },
    adminPageTitle() {
      if (this.currentSection === 'products') {
        if (this.productPanelMode === 'stock') return 'Stock Products';
        if (this.productPanelMode === 'reviews') return 'Product Reviews';
        return 'Products';
      }

      return ADMIN_SECTION_TITLES[this.currentSection] || 'Dashboard';
    },
    productPanelEyebrow() {
      return this.productPanelTitle;
    },
    currentSectionLabel() {
      return this.adminPageTitle;
    },
    categoryFilterOptions() {
      return this.filterCategories.length ? this.filterCategories : this.categories;
    },
    productCategoryOptions() {
      return this.categoryOptionsForGenderAndGroup(this.productGenderFilter, this.productGroupFilter);
    },
    productGroupOptions() {
      return this.productGroupOptionsForGender(this.productGenderFilter);
    },
    inventoryCategoryOptions() {
      return this.categoryOptionsForGenderAndGroup(this.inventoryGenderFilter, this.inventoryProductGroupFilter);
    },
    inventoryProductGroupOptions() {
      return this.productGroupOptionsForGender(this.inventoryGenderFilter);
    },
    productReviewCategoryOptions() {
      return this.categoryOptionsForGenderAndGroup(this.productReviewGenderFilter, this.productReviewProductGroupFilter);
    },
    productReviewProductGroupOptions() {
      return this.productGroupOptionsForGender(this.productReviewGenderFilter);
    },
    categoryProductGroupOptions() {
      return this.productGroupOptionsForGender(this.categoryGenderFilter);
    },
    categoryFormProductGroupOptions() {
      return this.productGroupOptionsForGender('');
    },

    breadcrumbItems() {
      if (this.currentSection === 'dashboard') {
        return [
          {
            label: 'hem.com',
            route: {
              path: '/women'
            }
          },
          {
            label: 'studio',
            current: true
          }
        ];
      }

      return [
        {
          label: 'hem.com',
          route: {
            path: '/women'
          }
        },
        {
          label: 'studio',
          route: {
            path: '/studio'
          }
        },
        {
          label: this.currentSectionLabel.toLowerCase(),
          current: true
        }
      ];
    },
    filteredProducts() {
      const searchTerm = this.productSearch.trim().toLowerCase();

      if (!searchTerm) {
        return this.products;
      }

      return this.products.filter(product =>
        [product.name, product.collection, product.category, product.gender]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm)
      );
    },
    chartPoints() {
      if (!this.orderTrend.length) {
        return [];
      }

      const maxRevenue = Math.max(...this.orderTrend.map(point => Number(point.revenue || 0)), 1);
      const maxOrders = Math.max(...this.orderTrend.map(point => Number(point.orderCount || 0)), 1);

      return this.orderTrend.map(point => ({
        ...point,
        label: this.formatMonthLabel(point.month || point.day),
        revenueHeight: point.revenue > 0 ? Math.max(12, Math.round((point.revenue / maxRevenue) * 100)) : 4,
        orderHeight: point.orderCount > 0 ? Math.max(12, Math.round((point.orderCount / maxOrders) * 100)) : 4
      }));
    },
    filteredOrders() {
      return this.orders;
    },
    orderStatCards() {
      const stats = this.orderStats || DEFAULT_ORDER_STATS();

      return [
        { key: 'total', label: 'Total Orders', value: Number(stats.totalOrders || 0) },
        { key: 'pending', label: 'Pending', value: Number(stats.pending || 0) },
        { key: 'confirmed', label: 'Confirmed', value: Number(stats.confirmed || 0) },
        { key: 'processing', label: 'Processing', value: Number(stats.processing || 0) },
        { key: 'shipping', label: 'Shipping', value: Number(stats.shipping || 0) },
        { key: 'delivery_failed', label: 'Delivery Failed', value: Number(stats.deliveryFailed || 0) },
        { key: 'delivered', label: 'Delivered', value: Number(stats.delivered || 0) },
        { key: 'completed', label: 'Completed', value: Number(stats.completed || 0) },
        { key: 'return_orders', label: 'Return Orders', value: Number(stats.returnOrders || 0) },
        { key: 'cancelled', label: 'Canceled', value: Number(stats.cancelled || 0) },
      ];
    },
    filteredCategories() {
      const searchTerm = this.categorySearch.trim().toLowerCase();

      if (!searchTerm) {
        return this.categories;
      }

      return this.categories.filter(category =>
        [category.name, category.label, category.description, ...(category.collections || [])]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm)
      );
    },
    filteredCollections() {
      const searchTerm = this.collectionSearch.trim().toLowerCase();

      if (!searchTerm) {
        return this.collections;
      }

      return this.collections.filter(collection =>
        [collection.name, collection.slug, collection.status]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm)
      );
    },
    filteredAccounts() {
      const searchTerm = this.accountSearch.trim().toLowerCase();

      if (!searchTerm) {
        return this.accounts;
      }

      return this.accounts.filter(account =>
        [account.name, account.email, account.role]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm)
      );
    },
    filteredInventoryItems() {
      return this.inventoryItems;
    },
    filteredVouchers() {
      return this.vouchers;
    },
    statusChartStyle() {
      const total = this.orderStatusSummary.reduce((sum, item) => sum + Number(item.count || 0), 0);
      let cursor = 0;
      const segments = this.orderStatusSummary.map((item, index) => {
        const size = total ? (Number(item.count || 0) / total) * 360 : 0;
        const segment = `${this.statusColor(index, item.status)} ${cursor}deg ${cursor + size}deg`;
        cursor += size;
        return segment;
      });

      return {
        background: segments.length ? `conic-gradient(${segments.join(', ')})` : 'rgba(17, 17, 17, 0.08)'
      };
    },
    pieSlices() {
      return buildAdminPieSlices(this.orderStatusSummary);
    },
    departmentOptions() {
      return this.departments.map(department => ({
        id: department.id,
        label: department.label || this.formatLabel(department.name)
      }));
    },
    voucherSubmitLabel() {
      return this.voucherForm.id ? 'Save voucher' : 'Create voucher';
    },
    categorySubmitLabel() {
      return this.categoryForm.id ? 'Save category' : 'Create category';
    },
    collectionSubmitLabel() {
      return this.collectionForm.id ? 'Save collection' : 'Create collection';
    }
  },
  watch: {
    '$route.fullPath'() {
      this.syncAdminRouteState();
    },
    currentSection() {
      this.updateAdminTitle();
    },
    productPanelMode() {
      this.updateAdminTitle();
    },
    selectedAdminOrderDetail: {
      deep: true,
      handler(detail) {
        primeAdminOrderDetail(detail);
        this.updateAdminTitle();
      }
    },
    isLoadingAdminOrderDetail() {
      this.updateAdminTitle();
    },
    selectedAdminProductPreview() {
      this.updateAdminTitle();
    },
    isLoadingAdminProductPreview() {
      this.updateAdminTitle();
    },
    orderSearch() {
      this.scheduleSectionSearch('orders');
    },
    orderStatusFilter() {
      this.scheduleSectionSearch('orders');
    },
    orderPaymentFilter() {
      this.scheduleSectionSearch('orders');
    },
    orderDateRange() {
      this.scheduleSectionSearch('orders');
    },
    bankTransferPaymentStatusFilter() {
      this.scheduleSectionSearch('payments');
    },
    bankTransferPaymentSearch() {
      this.scheduleSectionSearch('payments');
    },
    requestSearch() {
      this.scheduleSectionSearch('requests');
    },
    returnRequestStatusFilter() {
      this.scheduleSectionSearch('requests');
    },
    refundRequestStatusFilter() {
      this.scheduleSectionSearch('requests');
    },
    productSearch() {
      this.scheduleSectionSearch('products');
    },
    productGenderFilter() {
      if (!this.productGenderFilter || !this.productGroupOptions.some(group => group.value === this.productGroupFilter)) {
        this.productGroupFilter = '';
      }

      if (!this.productGenderFilter || !this.productCategoryOptions.some(category => category.slug === this.productCategoryFilter)) {
        this.productCategoryFilter = '';
      }
      this.scheduleSectionSearch('products');
    },
    productGroupFilter() {
      if (!this.productCategoryOptions.some(category => category.slug === this.productCategoryFilter)) {
        this.productCategoryFilter = '';
      }

      this.scheduleSectionSearch('products');
    },
    productCategoryFilter() {
      this.scheduleSectionSearch('products');
    },
    productCollectionFilter() {
      this.scheduleSectionSearch('products');
    },
    productStyleFilter() {
      this.scheduleSectionSearch('products');
    },
    productStatusFilter() {
      this.scheduleSectionSearch('products');
    },
    productReviewSearch() {
      if (this.currentSection === 'products' && this.productPanelMode === 'reviews') {
        const routeSearch = String(this.$route.query && this.$route.query.search || '').trim();
        if (this.productReviewIdFilter && this.productReviewSearch !== routeSearch) {
          this.productReviewIdFilter = '';
        }
        this.scheduleProductReviewSearch();
      }
    },
    productReviewGenderFilter() {
      if (!this.productReviewGenderFilter || !this.productReviewProductGroupOptions.some(group => group.value === this.productReviewProductGroupFilter)) {
        this.productReviewProductGroupFilter = '';
      }

      if (!this.productReviewGenderFilter || !this.productReviewCategoryOptions.some(category => category.slug === this.productReviewCategoryFilter)) {
        this.productReviewCategoryFilter = '';
      }

      if (this.currentSection === 'products' && this.productPanelMode === 'reviews') {
        this.scheduleProductReviewSearch();
      }
    },
    productReviewProductGroupFilter() {
      if (!this.productReviewCategoryOptions.some(category => category.slug === this.productReviewCategoryFilter)) {
        this.productReviewCategoryFilter = '';
      }

      if (this.currentSection === 'products' && this.productPanelMode === 'reviews') {
        this.scheduleProductReviewSearch();
      }
    },
    productReviewCategoryFilter() {
      if (this.currentSection === 'products' && this.productPanelMode === 'reviews') {
        this.scheduleProductReviewSearch();
      }
    },
    productReviewRatingFilter() {
      if (this.currentSection === 'products' && this.productPanelMode === 'reviews') {
        this.scheduleProductReviewSearch();
      }
    },
    productReviewDateRange() {
      if (this.currentSection === 'products' && this.productPanelMode === 'reviews') {
        this.scheduleProductReviewSearch();
      }
    },
    categorySearch() {
      this.scheduleSectionSearch('categories');
    },
    categoryGenderFilter() {
      if (!this.categoryGenderFilter || !this.categoryProductGroupOptions.some(group => group.value === this.categoryProductGroupFilter)) {
        this.categoryProductGroupFilter = '';
      }

      this.scheduleSectionSearch('categories');
    },
    categoryProductGroupFilter() {
      this.scheduleSectionSearch('categories');
    },
    collectionSearch() {
      this.scheduleSectionSearch('collections');
    },
    accountSearch() {
      this.scheduleSectionSearch('accounts');
    },
    accountDateRange() {
      this.scheduleSectionSearch('accounts');
    },
    inventorySearch() {
      if (this.currentSection === 'products' && this.productPanelMode === 'stock') {
        this.scheduleProductStockSearch();
        return;
      }
      this.scheduleSectionSearch('inventory');
    },
    inventoryCategoryFilter() {
      this.scheduleInventoryReload();
    },
    inventoryGenderFilter() {
      if (!this.inventoryGenderFilter || !this.inventoryProductGroupOptions.some(group => group.value === this.inventoryProductGroupFilter)) {
        this.inventoryProductGroupFilter = '';
      }

      if (!this.inventoryGenderFilter || !this.inventoryCategoryOptions.some(category => category.slug === this.inventoryCategoryFilter)) {
        this.inventoryCategoryFilter = '';
      }
      this.scheduleInventoryReload();
    },
    inventoryProductGroupFilter() {
      if (!this.inventoryCategoryOptions.some(category => category.slug === this.inventoryCategoryFilter)) {
        this.inventoryCategoryFilter = '';
      }

      this.scheduleInventoryReload();
    },
    inventoryStockRangeFilter() {
      this.scheduleInventoryReload();
    },
    inventoryDateRangeFilter() {
      this.scheduleInventoryReload();
    },
    voucherSearch() {
      this.scheduleSectionSearch('vouchers');
    }
  },
  methods: adminDashboardMethods,
  mounted() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LEGACY_ADMIN_LOCATION_STORAGE_KEY);
    }

    this.updateAdminTitle();
    this.loadAdminData();
  },
  activated() {
    this.updateAdminTitle();
    if (this.hasActivatedOnce && this.currentSection === 'vouchers') {
      this.loadVouchers();
    }
    this.hasActivatedOnce = true;
    this.restoreAdminListPosition(this.currentSection);
  }
};
</script>

<style scoped>
.admin-section-frame {
  width: min(100%, 1480px);
  margin-right: auto;
  margin-left: auto;
  box-sizing: border-box;
}

.admin-section-frame > :deep(.admin-panel) {
  width: 100%;
}

@media (min-width: 1920px) {
  .admin-section-frame {
    width: min(100%, 1520px);
  }
}
</style>

<style src="@/assets/styles/admin/AdminDashboard.css"></style>
