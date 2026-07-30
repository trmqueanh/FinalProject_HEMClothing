<template>
  <div class="studio-page admin-order-detail-page">
    <header class="studio-page__header admin-order-detail-page__header">
      <router-link :to="orderDetailBackTarget" class="studio-back">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        {{ orderDetailBackLabel }}
      </router-link>

      <div class="admin-order-detail-page__title">
        <span>Order Detail</span>
        <strong>
          {{ selectedAdminOrderDetail ? `#${shortOrderId(selectedAdminOrderDetail.order.id)}` : 'Loading order...' }}
        </strong>
      </div>
    </header>

    <main class="studio-page__body admin-order-detail-page__body">
      <AdminOrderDetailDialog />
    </main>

    <AdminConfirmDialogs />
  </div>
</template>

<script>
import AdminDashboard from '../AdminDashboard.vue';
import AdminOrderDetailDialog from '../../../components/admin/dialogs/AdminOrderDetailDialog.vue';
import AdminConfirmDialogs from '../../../components/admin/dialogs/AdminConfirmDialogs.vue';

export default {
  name: 'AdminOrderDetailView',
  extends: AdminDashboard,
  components: {
    AdminConfirmDialogs,
    AdminOrderDetailDialog
  },
  computed: {
    isOpenedFromCustomerDetail() {
      const query = this.$route.query || {};
      return String(query.from || '') === 'customer' && Boolean(String(query.customerId || '').trim());
    },
    orderDetailSourceSection() {
      const source = String(this.$route.query.from || '').trim();
      return ['orders', 'payments', 'requests'].includes(source) ? source : 'orders';
    },
    orderDetailBackLabel() {
      if (this.isOpenedFromCustomerDetail) return 'Back to Customer Detail';

      return {
        orders: 'Back to Orders',
        payments: 'Back to Payments',
        requests: 'Back to Requests'
      }[this.orderDetailSourceSection];
    },
    orderDetailBackTarget() {
      if (!this.isOpenedFromCustomerDetail) {
        const returnFocus = String(this.$route.query.returnFocus || this.$route.params.orderId || '').trim();
        const routeNames = {
          orders: 'studio-orders',
          payments: 'studio-payments',
          requests: 'studio-requests'
        };
        return {
          name: routeNames[this.orderDetailSourceSection],
          query: returnFocus ? { focus: returnFocus } : {}
        };
      }

      const query = this.$route.query || {};
      const customerId = String(query.customerId || '').trim();
      const orderPage = Math.max(1, Number(query.customerOrderPage) || 1);
      const orderId = String(this.$route.params.orderId || '').trim();

      return {
        name: 'studio-customer-detail',
        params: { customerId },
        query: {
          orderPage: String(orderPage),
          focusOrder: orderId,
          from: String(query.customerFrom || '') === 'customers' ? 'customers' : undefined,
          returnFocus: String(query.customerReturnFocus || '').trim() || undefined
        }
      };
    }
  }
};
</script>

<style scoped src="@/assets/styles/admin/products/AdminCreateProduct.css"></style>
<style scoped>
.admin-order-detail-page__header {
  justify-content: space-between;
}

.admin-order-detail-page__title {
  display: grid;
  justify-items: end;
  gap: 1px;
  margin-left: auto;
  text-align: right;
}

.admin-order-detail-page__title span {
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.admin-order-detail-page__title strong {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
}

.admin-order-detail-page__body {
  display: grid;
  gap: 18px;
  width: min(100%, 1800px);
  margin: 0 auto;
}

@media (min-width: 1440px) {
  .admin-order-detail-page__header {
    height: 64px;
    padding-right: 40px;
    padding-left: 40px;
  }

  .admin-order-detail-page__body {
    padding-right: 40px;
    padding-left: 40px;
  }

  .admin-order-detail-page__title span {
    font-size: 11px;
  }

  .admin-order-detail-page__title strong {
    font-size: 16px;
  }
}

@media (min-width: 1920px) {
  .admin-order-detail-page__header {
    height: 72px;
    padding-right: 48px;
    padding-left: 48px;
  }

  .admin-order-detail-page__body {
    padding-right: 48px;
    padding-left: 48px;
  }

  .admin-order-detail-page__title span {
    font-size: 14px;
  }

  .admin-order-detail-page__title strong {
    font-size: 20px;
  }
}

@media (min-width: 2560px) {
  .admin-order-detail-page__header {
    height: 84px;
    padding-right: 64px;
    padding-left: 64px;
  }

  .admin-order-detail-page__body {
    padding-right: 64px;
    padding-left: 64px;
  }

  .admin-order-detail-page__title span {
    font-size: 17px;
  }

  .admin-order-detail-page__title strong {
    font-size: 24px;
  }
}
</style>
