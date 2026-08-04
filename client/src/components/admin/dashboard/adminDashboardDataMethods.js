import { DEFAULT_METRICS, DEFAULT_ORDER_STATS } from '../../../helpers/admin/adminDashboardConfig';
import { catalogStore } from '../../../stores/catalogStore';
import { primeAdminCustomerSummary } from '../../../stores/adminCustomerDetailStore';
import {
  fetchAdminOrderDetail,
  patchAdminOrderDetailOrder
} from '../../../stores/adminOrderDetailStore';
import { getVietnamCurrentYear } from '../../../helpers/dateTime';
import { adminApi } from '../../../services/adminApi';

// Dashboard and admin section data loading with pagination.
export const adminDashboardDataMethods = {
applyDashboardPayload(payload = {}, options = {}) {
      const shouldApplyMetrics = options.applyMetrics !== false;

      if (shouldApplyMetrics && payload.metrics) {
        this.metrics = payload.metrics || DEFAULT_METRICS();
      }

      if (Array.isArray(payload.recentOrders)) {
        this.recentOrders = payload.recentOrders;
      }

      if (Array.isArray(payload.recentProducts)) {
        this.recentProducts = payload.recentProducts;
      }

      if (Array.isArray(payload.recentUsers)) {
        this.recentUsers = payload.recentUsers;
      }

      if (Array.isArray(payload.orderTrend)) {
        this.orderTrend = payload.orderTrend;
      }

      if (Array.isArray(payload.orderStatusSummary)) {
        this.orderStatusSummary = payload.orderStatusSummary;
      }

      if (Array.isArray(payload.topProducts)) {
        this.topProducts = payload.topProducts;
      }

      if (payload.topProductsByGender && typeof payload.topProductsByGender === 'object') {
        this.topProductsByGender = {
          women: Array.isArray(payload.topProductsByGender.women) ? payload.topProductsByGender.women : [],
          men: Array.isArray(payload.topProductsByGender.men) ? payload.topProductsByGender.men : []
        };
      }

      if (Array.isArray(payload.topBuyers)) {
        this.topBuyers = payload.topBuyers;
      }

      this.recentOrdersPagination = payload.recentOrdersPagination || this.recentOrdersPagination;
      this.topProductsPagination = payload.topProductsPagination || this.topProductsPagination;
      this.topBuyersPagination = payload.topBuyersPagination || this.topBuyersPagination;
    },
async loadDashboard() {
      this.setSectionLoading('dashboard', true);
      try {
        const payload = await adminApi.getAdminDashboard({
          scope: 'summary',
          year: this.dashboardYear,
          recentOrderPage: this.dashboardOrderPage,
          buyerPage: this.dashboardBuyerPage,
          topProductPage: this.dashboardTopProductPage
        });
        this.applyDashboardPayload(payload);
        this.hasLoadedDashboard = true;
      } finally {
        this.setSectionLoading('dashboard', false);
      }

      if (this.currentSection === 'dashboard') {
        this.loadDashboardDetails();
      }
    },
async loadDashboardDetails() {
      this.isLoadingDashboardDetails = true;
      try {
        const payload = await adminApi.getAdminDashboard({
          scope: 'details',
          year: this.dashboardYear,
          recentOrderPage: this.dashboardOrderPage,
          buyerPage: this.dashboardBuyerPage,
          topProductPage: this.dashboardTopProductPage
        });
        this.applyDashboardPayload(payload, { applyMetrics: false });
      } finally {
        this.isLoadingDashboardDetails = false;
      }
    },
setDashboardBuyerPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.topBuyersPagination.totalPages || 1);

      if (nextPage === this.dashboardBuyerPage) return;
      this.dashboardBuyerPage = nextPage;
      this.loadDashboardDetails();
    },
setDashboardOrderPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.recentOrdersPagination.totalPages || 1);

      if (nextPage === this.dashboardOrderPage) return;
      this.dashboardOrderPage = nextPage;
      this.loadDashboardDetails();
    },
setDashboardTopProductPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.topProductsPagination.totalPages || 1);

      if (nextPage === this.dashboardTopProductPage) return;
      this.dashboardTopProductPage = nextPage;
      this.loadDashboardDetails();
    },
setDashboardYear(year) {
      const nextYear = Number(year) || getVietnamCurrentYear();

      this.dashboardYear = nextYear;
      this.dashboardBuyerPage = 1;
      this.dashboardOrderPage = 1;
      this.dashboardTopProductPage = 1;
      this.loadDashboard();
    },
async loadOrders(options = {}) {
      const background = Boolean(options.background);
      if (background && this.isSectionLoading('orders')) return;
      if (!background) this.setSectionLoading('orders', true);
      try {
        const response = await adminApi.getAdminOrders({
          page: this.orderPagination.page,
          limit: this.orderPagination.limit,
          search: this.orderSearch.trim(),
          orderStatus: this.orderStatusFilter,
          paymentStatus: this.orderPaymentFilter,
          dateRange: this.orderDateRange
        });
        this.orders = Array.isArray(response) ? response : response.items || [];
        this.orderStats = response && response.stats ? response.stats : DEFAULT_ORDER_STATS();
        this.orderPagination = response && response.pagination
          ? response.pagination
          : {
              ...this.orderPagination,
              totalItems: this.orders.length,
              totalPages: 1
            };
        this.syncOrderEdits();
      } finally {
        if (!background) this.setSectionLoading('orders', false);
      }
    },
async loadRequests(options = {}) {
      const background = Boolean(options.background);
      if (background && this.isSectionLoading('requests')) return;
      if (!background) this.setSectionLoading('requests', true);
      try {
        const [returnPayload, refundPayload] = await Promise.all([
          adminApi.getAdminReturnRequests({
            status: this.returnRequestStatusFilter,
            search: this.requestSearch.trim()
          }),
          adminApi.getAdminRefundRequests({
            status: this.refundRequestStatusFilter,
            search: this.requestSearch.trim()
          })
        ]);

        this.returnRequests = returnPayload && Array.isArray(returnPayload.items) ? returnPayload.items : [];
        this.refundRequests = refundPayload && Array.isArray(refundPayload.items) ? refundPayload.items : [];
      } finally {
        if (!background) this.setSectionLoading('requests', false);
      }
    },
async loadBankTransferPayments() {
      this.setSectionLoading('payments', true);
      try {
        const payload = await adminApi.getAdminBankTransferPayments({
          status: this.bankTransferPaymentStatusFilter,
          search: this.bankTransferPaymentSearch.trim()
        });
        this.bankTransferPayments = payload && Array.isArray(payload.items) ? payload.items : [];
      } finally {
        this.setSectionLoading('payments', false);
      }
    },
async confirmBankTransferPayment(order, payload = {}) {
      if (!order || !order.id) return null;

      const response = await adminApi.confirmAdminBankTransferPayment(order.id, payload);
      if (response && response.order) {
        patchAdminOrderDetailOrder(response.order);
        await fetchAdminOrderDetail(order.id, { force: true });
        patchAdminOrderDetailOrder(response.order);
        this.bankTransferPayments = this.bankTransferPayments.filter(item => item.id !== order.id);
        this.loadOrders();
        this.loadDashboard();
        return response.order;
      }
      return null;
    },
async rejectBankTransferPayment(order, payload = {}) {
      if (!order || !order.id) return;

      const response = await adminApi.rejectAdminBankTransferPayment(order.id, payload);
      const updated = response && response.order ? response.order : response;
      if (updated) {
        patchAdminOrderDetailOrder(updated);
        await fetchAdminOrderDetail(order.id, { force: true });
        patchAdminOrderDetailOrder(updated);
        this.bankTransferPayments = this.bankTransferPayments.filter(item => item.id !== order.id);
        this.loadOrders();
        this.loadDashboard();
      }
      return updated || null;
    },
setRequestPanelMode(mode) {
      if (!['returns', 'refunds'].includes(mode) || this.requestPanelMode === mode) {
        return;
      }

      this.requestPanelMode = mode;
      this.saveAdminListViewState('requests');
    },
setOrderPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.orderPagination.totalPages || 1);

      if (nextPage === this.orderPagination.page) {
        return;
      }

      this.orderPagination = {
        ...this.orderPagination,
        page: nextPage
      };
      this.saveAdminListViewState('orders');
      this.loadOrders();
    },
setProductPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.productPagination.totalPages || 1);

      if (nextPage === this.productPagination.page) return;
      this.productPagination = { ...this.productPagination, page: nextPage };
      this.saveProductListViewState();
      this.loadProducts();
    },
setProductReviewPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.productReviewPagination.totalPages || 1);

      if (nextPage === this.productReviewPagination.page) return;
      this.productReviewPagination = { ...this.productReviewPagination, page: nextPage };
      this.loadProductReviews();
    },
setCategoryPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.categoryPagination.totalPages || 1);

      if (nextPage === this.categoryPagination.page) return;
      this.categoryPagination = { ...this.categoryPagination, page: nextPage };
      this.saveAdminListViewState('categories');
      this.loadCategories();
    },
setCollectionPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.collectionPagination.totalPages || 1);

      if (nextPage === this.collectionPagination.page) return;
      this.collectionPagination = { ...this.collectionPagination, page: nextPage };
      this.saveAdminListViewState('collections');
      this.loadCollections();
    },
setInventoryPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.inventoryPagination.totalPages || 1);

      if (nextPage === this.inventoryPagination.page) return;
      this.inventoryPagination = { ...this.inventoryPagination, page: nextPage };
      this.loadInventory();
    },
setVoucherPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.voucherPagination.totalPages || 1);

      if (nextPage === this.voucherPagination.page) return;
      this.voucherPagination = { ...this.voucherPagination, page: nextPage };
      this.saveAdminListViewState('vouchers');
      this.loadVouchers();
    },
setProductPanelMode(mode) {
      if (!['products', 'stock', 'reviews'].includes(mode) || this.productPanelMode === mode) {
        return;
      }

      this.productPanelMode = mode;
      if (mode === 'stock') {
        this.inventoryPagination = { ...this.inventoryPagination, page: 1, limit: 10 };
        this.loadInventory();
      } else if (mode === 'reviews') {
        this.productReviewPagination = { ...this.productReviewPagination, page: 1, limit: 10 };
        this.loadProductReviews();
      } else {
        this.productPagination = { ...this.productPagination, page: 1 };
        this.loadProducts();
      }
    },
setAccountPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.accountPagination.totalPages || 1);

      if (nextPage === this.accountPagination.page) return;
      this.accountPagination = { ...this.accountPagination, page: nextPage };
      this.loadAccounts();
    },
setAdminAccountPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.adminAccountPagination.totalPages || 1);

      if (nextPage === this.adminAccountPagination.page) return;
      this.adminAccountPagination = { ...this.adminAccountPagination, page: nextPage };
      this.saveAdminListViewState('accounts');
      this.loadAccounts();
    },
setCustomerAccountPage(page) {
      const nextPage = Math.min(Math.max(1, Number(page) || 1), this.customerAccountPagination.totalPages || 1);

      if (nextPage === this.customerAccountPagination.page) return;
      this.customerAccountPagination = { ...this.customerAccountPagination, page: nextPage };
      this.saveAdminListViewState('accounts');
      this.loadAccounts();
    },
async loadProducts() {
      this.saveProductListViewState();
      this.setSectionLoading('products', true);
      const response = await adminApi.getAdminProducts({
        page: this.productPagination.page,
        limit: this.productPagination.limit,
        search: this.productSearch.trim(),
        gender: this.productGenderFilter,
        group: this.productGroupFilter,
        category: this.productCategoryFilter,
        collection: this.productCollectionFilter,
        style: this.productStyleFilter,
        status: this.productStatusFilter
      });
      this.products = response && Array.isArray(response.items) ? response.items : [];
      this.productPagination = response && response.pagination
        ? response.pagination
        : {
            ...this.productPagination,
            totalItems: this.products.length,
            totalPages: 1
          };

      if (!this.filterCategories.length) {
        this.loadFilterCategories();
      }

      if (!this.productGroups.length) {
        this.loadProductGroups();
      }

      if (!this.collections.length) {
        this.loadCollections();
      }

      if (!this.styles.length) {
        this.loadStyles();
      }

      this.setSectionLoading('products', false);
    },
async loadStyles() {
      const response = await adminApi.getAdminStyles();
      this.styles = response && Array.isArray(response.items) ? response.items : [];
    },
async loadProductReviews() {
      this.setSectionLoading('productReviews', true);

      if (!this.filterCategories.length) {
        this.loadFilterCategories();
      }

      if (!this.productGroups.length) {
        this.loadProductGroups();
      }

      const response = await adminApi.getAdminProductReviews({
        page: this.productReviewPagination.page,
        limit: this.productReviewPagination.limit,
        search: this.productReviewSearch.trim(),
        reviewId: this.productReviewIdFilter,
        gender: this.productReviewGenderFilter,
        group: this.productReviewProductGroupFilter,
        category: this.productReviewCategoryFilter,
        rating: this.productReviewRatingFilter,
        dateRange: this.productReviewDateRange
      });
      this.productReviews = response && Array.isArray(response.items) ? response.items : [];
      this.productReviewReplyDrafts = this.productReviews.reduce((drafts, review) => ({
        ...drafts,
        [review.id]: review.adminReply || ''
      }), {});
      this.productReviewPagination = response && response.pagination
        ? response.pagination
        : {
            ...this.productReviewPagination,
            totalItems: this.productReviews.length,
            totalPages: 1
          };
      this.setSectionLoading('productReviews', false);
    },
async loadCategories() {
      this.setSectionLoading('categories', true);
      const response = await adminApi.getAdminCategories({
        page: this.categoryPagination.page,
        limit: this.categoryPagination.limit,
        search: this.categorySearch.trim(),
        gender: this.categoryGenderFilter,
        group: this.categoryProductGroupFilter
      });
      this.categories = response && Array.isArray(response.items) ? response.items : [];
      this.categoryPagination = response && response.pagination
        ? response.pagination
        : {
            ...this.categoryPagination,
            totalItems: this.categories.length,
            totalPages: 1
          };

      if (!this.departments.length) {
        this.loadDepartments();
      }

      if (!this.productGroups.length) {
        this.loadProductGroups();
      }

      if (!this.filterCategories.length) {
        this.loadFilterCategories();
      }

      this.setSectionLoading('categories', false);
    },
async loadFilterCategories() {
      const response = await adminApi.getAdminCategories({
        page: 1,
        limit: 200
      });
      this.filterCategories = response && Array.isArray(response.items) ? response.items : [];
    },
async loadProductGroups() {
      const response = await adminApi.getAdminProductGroups();
      this.productGroups = response && Array.isArray(response.items) ? response.items : [];
    },
async loadCollections() {
      this.setSectionLoading('collections', true);
      const response = await adminApi.getAdminCollections({
        page: this.collectionPagination.page,
        limit: this.collectionPagination.limit,
        search: this.collectionSearch.trim()
      });
      this.collections = response && Array.isArray(response.items) ? response.items : [];
      this.collectionPagination = response && response.pagination
        ? response.pagination
        : {
            ...this.collectionPagination,
            totalItems: this.collections.length,
            totalPages: 1
          };
      this.setSectionLoading('collections', false);
    },
async loadInventory(options = {}) {
      const isSilent = Boolean(options.silent);

      if (!isSilent) {
        this.setSectionLoading('inventory', true);
      }

      const response = await adminApi.getAdminInventory({
        page: this.inventoryPagination.page,
        limit: this.inventoryPagination.limit,
        search: this.inventorySearch.trim(),
        gender: this.inventoryGenderFilter,
        group: this.inventoryProductGroupFilter,
        category: this.inventoryCategoryFilter,
        stockRange: this.inventoryStockRangeFilter,
        dateRange: this.inventoryDateRangeFilter
      });
      this.inventoryItems = response && Array.isArray(response.items) ? response.items : [];
      this.inventoryLogs = response && Array.isArray(response.logs) ? response.logs : [];
      this.inventoryStats = response && response.stats
        ? response.stats
        : {
            totalProducts: 0,
            inStockProducts: 0,
            lowStockProducts: 0,
            outOfStockProducts: 0
          };
      this.inventoryPagination = response && response.pagination
        ? response.pagination
        : {
            ...this.inventoryPagination,
            totalItems: this.inventoryItems.length,
            totalPages: 1
          };

      if (!this.inventoryImport.variantId && this.inventoryItems.length) {
        this.inventoryImport.variantId = this.inventoryItems[0].id;
      }

      if (!this.filterCategories.length) {
        this.loadFilterCategories();
      }

      if (!this.productGroups.length) {
        this.loadProductGroups();
      }

      if (!isSilent) {
        this.setSectionLoading('inventory', false);
      }
    },
async loadVouchers() {
      this.setSectionLoading('vouchers', true);
      const response = await adminApi.getAdminVouchers({
        page: this.voucherPagination.page,
        limit: this.voucherPagination.limit,
        search: this.voucherSearch.trim()
      });
      this.vouchers = response && Array.isArray(response.items) ? response.items : [];
      this.voucherPagination = response && response.pagination
        ? response.pagination
        : {
            ...this.voucherPagination,
            totalItems: this.vouchers.length,
            totalPages: 1
          };

      this.setSectionLoading('vouchers', false);
    },
async loadDepartments() {
      const departments = await catalogStore.getDepartments();
      this.departments = Array.isArray(departments) ? departments : [];
    },
async loadAccounts() {
      this.setSectionLoading('accounts', true);
      const [adminPayload, customerPayload] = await Promise.all([
        adminApi.getAdminAccounts({
          page: this.adminAccountPagination.page,
          limit: this.adminAccountPagination.limit,
          search: this.accountSearch.trim(),
          dateRange: this.accountDateRange,
          role: 'admin'
        }),
        adminApi.getAdminAccounts({
          page: this.customerAccountPagination.page,
          limit: this.customerAccountPagination.limit,
          search: this.accountSearch.trim(),
          dateRange: this.accountDateRange,
          role: 'user'
        })
      ]);

      this.accountSummary = adminPayload.summary || customerPayload.summary || {
        total: 0,
        admins: 0,
        users: 0
      };

      this.adminAccounts = Array.isArray(adminPayload.accounts) ? adminPayload.accounts : adminPayload.items || [];
      this.customerAccounts = Array.isArray(customerPayload.accounts) ? customerPayload.accounts : customerPayload.items || [];
      this.customerAccounts.forEach(primeAdminCustomerSummary);
      this.accounts = [...this.adminAccounts, ...this.customerAccounts];
      this.adminAccountPagination = adminPayload && adminPayload.pagination
        ? adminPayload.pagination
        : {
            ...this.adminAccountPagination,
            totalItems: this.adminAccounts.length,
            totalPages: 1
          };
      this.customerAccountPagination = customerPayload && customerPayload.pagination
        ? customerPayload.pagination
        : {
            ...this.customerAccountPagination,
            totalItems: this.customerAccounts.length,
            totalPages: 1
      };
      this.setSectionLoading('accounts', false);
    }
};
