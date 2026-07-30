<template>
  <div class="studio-page">
    <div class="studio-page__header">
      <router-link :to="productBackTarget" class="studio-back">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        {{ productBackLabel }}
      </router-link>
    </div>

    <div class="studio-page__body">
      <div class="studio-page__title">
        <div class="studio-page__title-row">
          <span v-if="product && product.status" class="studio-status-badge" :class="product.status === 'active' ? 'studio-status-badge--active' : 'studio-status-badge--inactive'">
            {{ product.status === 'active' ? 'Live' : 'Inactive' }}
          </span>
        </div>
      </div>

      <product-form
        :product="product"
        heading="Update product"
        submit-label="Save changes"
        :is-submitting="isSaving"
        @createOrUpdate="createOrUpdate"
      />
    </div>
  </div>
</template>

<script>
import ProductForm from '../../../components/admin/ProductForm.vue';
import { catalogStore } from '../../../stores/catalogStore';
import { prepareProductImagesForSave } from '../../../helpers/cloudinary';
import { adminProductApi } from '../../../services/adminProductApi';
import { clearAdminProductListState } from '../../../helpers/admin/adminDashboardConfig';

export default {
  name: 'AdminEditProductView',
  components: {
    ProductForm
  },
  data() {
    return {
      product: {},
      isSaving: false
    };
  },
  computed: {
    productBackLabel() {
      return String(this.$route.query.from || '') === 'detail'
        ? 'Back to Product Detail'
        : 'Back to Products';
    },
    productBackTarget() {
      const returnFocus = String(this.$route.query.returnFocus || this.$route.params.id || '').trim();
      if (String(this.$route.query.from || '') === 'detail') {
        return {
          name: 'studio-product-detail',
          params: { productId: this.$route.params.id },
          query: returnFocus ? { returnFocus } : {}
        };
      }

      return {
        name: 'studio-products',
        query: returnFocus ? { focus: returnFocus } : {}
      };
    }
  },
  watch: {
    product: {
      deep: true,
      handler() {
        this.updateDocumentTitle();
      }
    }
  },
  async mounted() {
    this.updateDocumentTitle();
    this.product = await adminProductApi.getProduct(this.$route.params.id) || {};
    this.updateDocumentTitle();
  },
  beforeRouteLeave(to) {
    if (String(to.meta && to.meta.adminSection || '') !== 'products') {
      clearAdminProductListState();
    }
  },
  methods: {
    updateDocumentTitle() {
      const productName = String(this.product && this.product.name || '').trim();
      document.title = productName
        ? `Edit ${productName} | HEM. Studio`
        : 'Edit Product | HEM. Studio';
    },
    async createOrUpdate(product) {
      if (this.isSaving) {
        return;
      }

      this.isSaving = true;
      let response;

      try {
        const { productImages, ...payload } = product;
        const images = Array.isArray(productImages)
          ? await prepareProductImagesForSave(productImages)
          : [];
        response = await adminProductApi.updateProduct({
          ...payload,
          productImages: images,
          product_images: images
        });
      } catch (error) {
        this.flash(error && error.message ? error.message : 'Could not upload product images.', 'error');
        this.isSaving = false;
        return;
      }

      if (!response) {
        this.isSaving = false;
        return;
      }

      catalogStore.invalidate();
      this.flash('Product updated successfully.', 'success');
      this.$router.push(this.productBackTarget);
    }
  }
};
</script>

<style scoped src="@/assets/styles/admin/products/AdminEditProduct.css"></style>
