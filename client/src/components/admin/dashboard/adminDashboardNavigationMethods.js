import { authStore } from '../../../stores/authStore';
import { fetchAdminCustomerDetail, primeAdminCustomerSummary } from '../../../stores/adminCustomerDetailStore';
import {
  ADMIN_PRODUCT_MODE_ROUTES,
  ADMIN_SECTION_ROUTES,
  ADMIN_TITLE_SUFFIX,
  clearAdminProductListState,
  readAdminListState,
  writeAdminListState,
  writeAdminProductListState
} from '../../../helpers/admin/adminDashboardConfig';
import { flash } from '../../../helpers/flash';

// Studio route navigation, loading flags, search scheduling, and logout.
export const adminDashboardNavigationMethods = {
setAdminDocumentTitle(title) {
      if (typeof document === 'undefined') {
        return;
      }

      document.title = `${title || 'Dashboard'} | ${ADMIN_TITLE_SUFFIX}`;
    },
updateAdminTitle() {
      if (this.selectedAdminProductPreview) {
        this.setAdminDocumentTitle(this.selectedAdminProductPreview.name || 'Product Detail');
        return;
      }

      if (this.isLoadingAdminProductPreview && this.$route.name === 'studio-product-detail') {
        this.setAdminDocumentTitle('Product Detail');
        return;
      }

      if (this.selectedAdminOrderDetail && this.selectedAdminOrderDetail.order) {
        this.setAdminDocumentTitle(`Order #${this.shortOrderId(this.selectedAdminOrderDetail.order.id)}`);
        return;
      }

      if (this.isLoadingAdminOrderDetail) {
        this.setAdminDocumentTitle('Order Detail');
        return;
      }

      this.setAdminDocumentTitle(this.adminPageTitle);
    },
adminSectionRoute(section) {
      return ADMIN_SECTION_ROUTES[section] || ADMIN_SECTION_ROUTES.dashboard;
    },
adminProductModeRoute(mode) {
      return ADMIN_PRODUCT_MODE_ROUTES[mode] || ADMIN_PRODUCT_MODE_ROUTES.products;
    },
setSection(section) {
      if (this.currentSection === 'products' && section !== 'products') {
        this.clearProductListViewState();
      }

      const targetPath = this.adminSectionRoute(section);

      if (this.$route.path === targetPath) {
        return;
      }

      this.$router.push(targetPath);
    },
async selectProductMode(mode) {
      const targetPath = this.adminProductModeRoute(mode);

      if (this.$route.path === targetPath) {
        return;
      }

      this.isProductMenuOpen = true;
      await this.$router.push(targetPath);
    },
toggleProductMenu() {
      if (this.currentSection !== 'products') {
        this.isProductMenuOpen = true;
        this.setSection('products');
        return;
      }

      this.isProductMenuOpen = !this.isProductMenuOpen;
    },
setSectionLoading(section, value) {
      this.loadingSections = {
        ...this.loadingSections,
        [section]: value
      };
    },
isSectionLoading(section) {
      return Boolean(this.loadingSections[section]);
    },
scheduleSectionSearch(section) {
      if (this.currentSection !== section) {
        return;
      }

      if (section === 'products' && this.productPanelMode !== 'products') {
        return;
      }

      if (section === 'products') {
        this.saveProductListViewState();
      }

      if (['orders', 'payments', 'requests', 'categories', 'collections', 'vouchers', 'accounts'].includes(section)) {
        this.saveAdminListViewState(section);
      }

      clearTimeout(this.searchTimers[section]);
      this.searchTimers = {
        ...this.searchTimers,
        [section]: setTimeout(() => {
          if (section === 'orders') this.orderPagination.page = 1;
          if (section === 'payments') this.loadBankTransferPayments();
          if (section === 'products') {
            this.productPagination.page = 1;
            this.saveProductListViewState();
          }
          if (section === 'categories') this.categoryPagination.page = 1;
          if (section === 'collections') this.collectionPagination.page = 1;
          if (section === 'inventory') this.inventoryPagination.page = 1;
          if (section === 'vouchers') this.voucherPagination.page = 1;
          if (section === 'accounts') {
            this.accountPagination.page = 1;
            this.adminAccountPagination.page = 1;
            this.customerAccountPagination.page = 1;
          }
          if (['orders', 'payments', 'requests', 'categories', 'collections', 'vouchers', 'accounts'].includes(section)) {
            this.saveAdminListViewState(section);
          }
          if (section !== 'payments') this.loadCurrentSection();
        }, 300)
      };
    },
saveAdminListViewState(section) {
      const states = {
        orders: {
          search: this.orderSearch,
          payment: this.orderPaymentFilter,
          status: this.orderStatusFilter,
          dateRange: this.orderDateRange,
          page: this.orderPagination.page
        },
        payments: {
          search: this.bankTransferPaymentSearch,
          status: this.bankTransferPaymentStatusFilter
        },
        requests: {
          search: this.requestSearch,
          mode: this.requestPanelMode,
          returnStatus: this.returnRequestStatusFilter,
          refundStatus: this.refundRequestStatusFilter
        },
        categories: {
          search: this.categorySearch,
          gender: this.categoryGenderFilter,
          group: this.categoryProductGroupFilter,
          page: this.categoryPagination.page
        },
        collections: {
          search: this.collectionSearch,
          page: this.collectionPagination.page
        },
        vouchers: {
          search: this.voucherSearch,
          page: this.voucherPagination.page
        },
        accounts: {
          search: this.accountSearch,
          dateRange: this.accountDateRange,
          adminPage: this.adminAccountPagination.page,
          customerPage: this.customerAccountPagination.page
        }
      };

      if (states[section]) {
        const previousState = readAdminListState(section);
        writeAdminListState(section, {
          ...previousState,
          ...states[section],
          scrollY: typeof window !== 'undefined' ? window.scrollY : previousState.scrollY
        });
      }
    },
    saveProductListViewState() {
      const previousState = readAdminListState('products');
      const isReturningToFocusedProduct = Boolean(String(this.$route.query && this.$route.query.focus || '').trim());
      writeAdminProductListState({
        ...previousState,
        search: this.productSearch,
        gender: this.productGenderFilter,
        group: this.productGroupFilter,
        category: this.productCategoryFilter,
        collection: this.productCollectionFilter,
        style: this.productStyleFilter,
        status: this.productStatusFilter,
        page: this.productPagination.page,
        scrollY: isReturningToFocusedProduct
          ? previousState.scrollY
          : (typeof window !== 'undefined' ? window.scrollY : previousState.scrollY)
      });
    },
restoreAdminListPosition(section) {
      if (typeof window === 'undefined') return;

      const focusedId = String(this.$route.query && this.$route.query.focus || '').trim();
      if (!focusedId) return;

      const state = readAdminListState(section);
      this.$nextTick(() => {
        window.requestAnimationFrame(() => {
          const target = [...document.querySelectorAll('[data-admin-focus-id]')]
            .find(element => element.getAttribute('data-admin-focus-id') === focusedId);
          const savedScrollY = Number(state.scrollY);

          if (Number.isFinite(savedScrollY) && savedScrollY >= 0) {
            window.scrollTo({ top: savedScrollY, behavior: 'auto' });
          } else if (target) {
            target.scrollIntoView({ block: 'center' });
          }
        });
      });
    },
isAdminListFocus(section, itemId) {
      if (this.currentSection !== section) return false;
      return String(this.$route.query && this.$route.query.focus || '') === String(itemId || '');
    },
prefetchAdminCustomerDetail(account) {
      if (!account || !account.id) return;

      primeAdminCustomerSummary(account);
      import('../../../views/admin/customers/AdminCustomerDetail.vue');
      fetchAdminCustomerDetail(account.id, { page: 1, limit: 10 });
    },
clearProductListViewState() {
      clearAdminProductListState();
    },
resetProductListFilters() {
      clearTimeout(this.searchTimers.products);
      this.productSearch = '';
      this.productGenderFilter = '';
      this.productGroupFilter = '';
      this.productCategoryFilter = '';
      this.productCollectionFilter = '';
      this.productStyleFilter = '';
      this.productStatusFilter = '';
      this.productPagination = {
        ...this.productPagination,
        page: 1
      };
      this.clearProductListViewState();
    },
scheduleProductStockSearch() {
      clearTimeout(this.searchTimers.productStock);
      this.searchTimers = {
        ...this.searchTimers,
        productStock: setTimeout(() => {
          this.inventoryPagination.page = 1;
          this.loadInventory();
        }, 300)
      };
    },
scheduleProductReviewSearch() {
      clearTimeout(this.searchTimers.productReviews);
      this.searchTimers = {
        ...this.searchTimers,
        productReviews: setTimeout(() => {
          this.productReviewPagination.page = 1;
          this.loadProductReviews();
        }, 300)
      };
    },
scheduleInventoryReload() {
      if (this.currentSection === 'products' && this.productPanelMode === 'stock') {
        this.scheduleProductStockSearch();
        return;
      }

      this.scheduleSectionSearch('inventory');
    },
logout() {
      authStore.clear();
      flash('Signed out successfully.', 'success');
      this.$router.push('/women');
    },
requestLogout() {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('request-logout-confirm'));
        return;
      }

      this.logout();
    }
};
