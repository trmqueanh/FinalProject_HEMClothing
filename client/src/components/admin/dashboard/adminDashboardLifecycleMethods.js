import { resolveInitialProductMode, resolveInitialSection } from '../../../helpers/admin/adminDashboardConfig';

// Route synchronization and current-section orchestration.
export const adminDashboardLifecycleMethods = {
async refreshAdminCommerceSurfaces() {
      if (
        this.adminCommerceSyncInFlight ||
        this.isAdminActionConfirmSaving ||
        (typeof document !== 'undefined' && document.hidden)
      ) return;

      this.adminCommerceSyncInFlight = true;
      try {
        const detailOrderId = String(this.$route.params && this.$route.params.orderId || '').trim();
        if (this.$route.name === 'studio-order-detail' && detailOrderId) {
          if (this.selectedAdminOrderDetail) {
            await this.refreshSelectedAdminOrderDetail(detailOrderId);
          } else if (!this.isLoadingAdminOrderDetail) {
            await this.loadAdminOrderDetail(detailOrderId);
          }
          return;
        }

        if (this.currentSection === 'requests') {
          await this.loadRequests({ background: true });
        } else if (this.currentSection === 'orders') {
          await this.loadOrders({ background: true });
        }
      } finally {
        this.adminCommerceSyncInFlight = false;
      }
    },
handleAdminCommerceFocus() {
      this.refreshAdminCommerceSurfaces();
    },
handleAdminCommerceVisibilityChange() {
      if (typeof document !== 'undefined' && !document.hidden) {
        this.refreshAdminCommerceSurfaces();
      }
    },
startAdminCommerceSync() {
      this.stopAdminCommerceSync();
      this.adminCommerceSyncTimer = window.setInterval(
        () => this.refreshAdminCommerceSurfaces(),
        15000
      );
    },
stopAdminCommerceSync() {
      if (this.adminCommerceSyncTimer) window.clearInterval(this.adminCommerceSyncTimer);
      this.adminCommerceSyncTimer = null;
    },
async loadAdminData() {
      this.applyNotificationRouteFilters();
      const detailProductId = String(this.$route.params && this.$route.params.productId || '').trim();
      if (this.currentSection === 'products' && detailProductId) {
        await this.openAdminProductPreview({ id: detailProductId });
        return;
      }

      const detailOrderId = String(this.$route.params && this.$route.params.orderId || '').trim();
      if (this.currentSection === 'orders' && detailOrderId) {
        await this.loadAdminOrderDetail(detailOrderId);
        return;
      }

      const linkedOrderId = String(this.$route.query && this.$route.query.orderId || '').trim();
      if (this.currentSection === 'orders' && linkedOrderId) {
        await this.openAdminOrderFromLink(linkedOrderId);
        return;
      }

      await this.loadCurrentSection();
    },
async syncAdminRouteState() {
      if (
        this.$options.name === 'AdminDashboardView' &&
        ['studio-order-detail', 'studio-product-detail'].includes(this.$route.name)
      ) {
        return;
      }

      const nextSection = resolveInitialSection(this.$route);
      const nextMode = resolveInitialProductMode(this.$route);
      const sectionChanged = nextSection !== this.currentSection;
      const modeChanged = nextMode !== this.productPanelMode;

      if (!sectionChanged && !modeChanged) {
        const detailProductId = String(this.$route.params && this.$route.params.productId || '').trim();
        if (nextSection === 'products' && detailProductId) {
          await this.openAdminProductPreview({ id: detailProductId });
          return;
        }

        const detailOrderId = String(this.$route.params && this.$route.params.orderId || '').trim();
        if (nextSection === 'orders' && detailOrderId) {
          await this.loadAdminOrderDetail(detailOrderId);
          return;
        }

        const filtersChanged = this.applyNotificationRouteFilters();
        const linkedOrderId = String(this.$route.query && this.$route.query.orderId || '').trim();
        if (nextSection === 'orders' && linkedOrderId) {
          await this.openAdminOrderFromLink(linkedOrderId);
          return;
        }
        if (filtersChanged) await this.loadCurrentSection();
        return;
      }

      const previousSection = this.currentSection;
      const previousProductMode = this.productPanelMode;

      this.currentSection = nextSection;
      this.productPanelMode = nextMode;
      this.applyNotificationRouteFilters();

      if (previousSection === 'orders' && nextSection !== 'orders') {
        clearTimeout(this.searchTimers.orders);
        this.saveAdminListViewState('orders');
      }

      const leftProductList = previousSection === 'products' &&
        previousProductMode === 'products' &&
        (nextSection !== 'products' || nextMode !== 'products');

      if (leftProductList) {
        this.resetProductListFilters();
      } else if (previousSection === 'products' && nextSection !== 'products') {
        this.clearProductListViewState();
      }

      if (nextSection === 'products') {
        this.isProductMenuOpen = true;
      }

      this.updateAdminTitle();
      await this.loadCurrentSection();
    },
applyNotificationRouteFilters() {
      const query = this.$route.query || {};
      const hasSearch = Object.prototype.hasOwnProperty.call(query, 'search');
      const search = String(query.search || '').trim();
      const requestMode = String(this.$route.query && this.$route.query.mode || '').trim().toLowerCase();
      const stockRange = String(this.$route.query && this.$route.query.stockRange || '').trim().toLowerCase();
      const paymentStatus = String(this.$route.query && this.$route.query.status || '').trim().toLowerCase();
      const reviewId = String(this.$route.query && this.$route.query.reviewId || '').trim();
      let changed = false;
      const assign = (key, value) => {
        if (this[key] === value) return;
        this[key] = value;
        changed = true;
      };

      if (this.currentSection === 'orders' && hasSearch) assign('orderSearch', search);
      if (this.currentSection === 'payments') {
        if (hasSearch) assign('bankTransferPaymentSearch', search);
        if (paymentStatus === 'payment_under_review') {
          assign('bankTransferPaymentStatusFilter', paymentStatus);
        }
      }
      if (this.currentSection === 'requests') {
        if (hasSearch) assign('requestSearch', search);
        if (requestMode === 'refunds' || requestMode === 'returns') {
          assign('requestPanelMode', requestMode);
        }
      }
      if (this.currentSection === 'products' && this.productPanelMode === 'reviews') {
        if (hasSearch) assign('productReviewSearch', search);
        assign('productReviewIdFilter', reviewId);
      }
      if (this.currentSection === 'inventory' || (this.currentSection === 'products' && this.productPanelMode === 'stock')) {
        if (hasSearch) assign('inventorySearch', search);
        if (['low', 'out', 'available'].includes(stockRange)) assign('inventoryStockRangeFilter', stockRange);
      }

      return changed;
    },
async loadCurrentSection() {
      let result;

      if (this.currentSection === 'dashboard') result = await this.loadDashboard();
      else if (this.currentSection === 'orders') result = await this.loadOrders();
      else if (this.currentSection === 'payments') result = await this.loadBankTransferPayments();
      if (this.currentSection === 'products') {
        if (this.productPanelMode === 'stock') result = await this.loadInventory();
        else if (this.productPanelMode === 'reviews') result = await this.loadProductReviews();
        else result = await this.loadProducts();
      }
      else if (this.currentSection === 'categories') result = await this.loadCategories();
      else if (this.currentSection === 'requests') result = await this.loadRequests();
      else if (this.currentSection === 'collections') result = await this.loadCollections();
      else if (this.currentSection === 'inventory') result = await this.loadInventory();
      else if (this.currentSection === 'notifications') result = null;
      else if (this.currentSection === 'vouchers') result = await this.loadVouchers();
      else if (this.currentSection === 'accounts') result = await this.loadAccounts();

      this.restoreAdminListPosition(this.currentSection);
      return result;
    }
};
