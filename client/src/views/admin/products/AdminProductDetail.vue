<template>
  <div class="studio-page admin-product-detail-page">
    <header class="studio-page__header admin-product-detail-page__header">
      <router-link :to="productDetailBackTarget" class="studio-back">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back to Products
      </router-link>

      <div class="admin-product-detail-page__header-actions">
        <div class="admin-product-detail-page__title">
          <span>Product Detail</span>
          <strong>{{ selectedAdminProductPreview ? selectedAdminProductPreview.name : 'Loading product...' }}</strong>
        </div>
        <router-link
          v-if="selectedAdminProductPreview"
          :to="productEditTarget"
          class="admin-hero__primary admin-product-detail-page__edit"
        >
          Edit Product
        </router-link>
      </div>
    </header>

    <main class="studio-page__body admin-product-detail-page__body">
      <AdminProductPreviewDialog
        v-if="selectedAdminProductPreview || isLoadingAdminProductPreview"
        embedded
      />

      <section
        v-else
        class="admin-product-detail-page__state"
        aria-live="polite"
      >
        <strong>Product details are unavailable</strong>
        <p>The product may have been removed or could not be loaded.</p>
        <router-link :to="productDetailBackTarget">Return to All Products</router-link>
      </section>
    </main>
  </div>
</template>

<script>
import AdminDashboard from '../AdminDashboard.vue';
import AdminProductPreviewDialog from '../../../components/admin/dialogs/AdminProductPreviewDialog.vue';
import { clearAdminProductListState } from '../../../helpers/admin/adminDashboardConfig';

export default {
  name: 'AdminProductDetailView',
  extends: AdminDashboard,
  components: {
    AdminProductPreviewDialog
  },
  data() {
    return {
      isLoadingAdminProductPreview: true
    };
  },
  computed: {
    productDetailId() {
      return String(this.$route.params.productId || '').trim();
    },
    productDetailBackTarget() {
      const returnFocus = String(this.$route.query.returnFocus || this.productDetailId).trim();
      return {
        name: 'studio-products',
        query: returnFocus ? { focus: returnFocus } : {}
      };
    },
    productEditTarget() {
      return {
        name: 'edit-product',
        params: { id: this.productDetailId },
        query: {
          from: 'detail',
          returnFocus: this.productDetailId
        }
      };
    }
  },
  beforeRouteLeave(to) {
    if (String(to.meta && to.meta.adminSection || '') !== 'products') {
      clearAdminProductListState();
    }
  }
};
</script>

<style scoped src="@/assets/styles/admin/products/AdminCreateProduct.css"></style>
<style scoped>
.admin-product-detail-page__header {
  justify-content: space-between;
}

.admin-product-detail-page__header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 18px;
  margin-left: auto;
}

.admin-product-detail-page__title {
  display: grid;
  justify-items: end;
  gap: 2px;
  min-width: 0;
  text-align: right;
}

.admin-product-detail-page__title span {
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.admin-product-detail-page__title strong {
  max-width: min(42vw, 620px);
  overflow: hidden;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-product-detail-page__edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 136px;
  height: 40px;
  padding: 0 18px;
  border: 1px solid #a88b72;
  border-radius: var(--radius-sm);
  background: #a88b72;
  color: #fff;
  font-family: var(--font);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.admin-product-detail-page__edit:hover {
  border-color: #987c64;
  background: #987c64;
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(168, 139, 114, 0.35);
}

.admin-product-detail-page__edit:focus-visible {
  outline: 2px solid rgba(168, 139, 114, 0.35);
  outline-offset: 2px;
}

.admin-product-detail-page__body {
  display: grid;
  gap: 20px;
  width: min(100%, 1800px);
  margin: 0 auto;
}

.admin-product-detail-page__state {
  display: grid;
  justify-items: start;
  gap: 8px;
  padding: 28px;
  border: 1px solid var(--card-border);
  border-radius: 14px;
  background: #fff;
}

.admin-product-detail-page__state strong,
.admin-product-detail-page__state p {
  margin: 0;
}

.admin-product-detail-page__state p {
  color: var(--text-secondary);
}

.admin-product-detail-page__state a {
  color: #6b5643;
  font-weight: 700;
}

@media (max-width: 640px) {
  .admin-product-detail-page__header {
    align-items: flex-start;
  }

  .admin-product-detail-page__header-actions {
    align-items: flex-end;
    flex-direction: column;
    gap: 8px;
  }

  .admin-product-detail-page__title strong {
    max-width: 48vw;
  }
}

@media (min-width: 1440px) {
  .admin-product-detail-page__header {
    height: 64px;
    padding-right: 40px;
    padding-left: 40px;
  }

  .admin-product-detail-page__body {
    padding-right: 40px;
    padding-left: 40px;
  }

  .admin-product-detail-page__title span {
    font-size: 11px;
  }

  .admin-product-detail-page__title strong {
    font-size: 16px;
  }

  .admin-product-detail-page__edit {
    min-width: 150px;
    height: 44px;
    padding: 0 22px;
    font-size: 15px;
  }
}

@media (min-width: 1920px) {
  .admin-product-detail-page__header {
    height: 72px;
    padding-right: 48px;
    padding-left: 48px;
  }

  .admin-product-detail-page__body {
    padding-right: 48px;
    padding-left: 48px;
  }

  .admin-product-detail-page__title span {
    font-size: 14px;
  }

  .admin-product-detail-page__title strong {
    font-size: 20px;
  }

  .admin-product-detail-page__edit {
    min-width: 170px;
    height: 50px;
    padding: 0 26px;
    font-size: 17px;
  }
}

@media (min-width: 2560px) {
  .admin-product-detail-page__header {
    height: 84px;
    padding-right: 64px;
    padding-left: 64px;
  }

  .admin-product-detail-page__body {
    padding-right: 64px;
    padding-left: 64px;
  }

  .admin-product-detail-page__title span {
    font-size: 17px;
  }

  .admin-product-detail-page__title strong {
    font-size: 24px;
  }

  .admin-product-detail-page__edit {
    min-width: 200px;
    height: 58px;
    padding: 0 30px;
    font-size: 20px;
  }
}
</style>
