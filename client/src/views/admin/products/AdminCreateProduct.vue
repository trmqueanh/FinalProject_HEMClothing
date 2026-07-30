<template>
  <div class="studio-page">
    <div class="studio-page__header">
      <router-link :to="productBackTarget" class="studio-back">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        Back to products
      </router-link>
    </div>

    <div class="studio-page__body">

      <product-form
        heading="Create a new product"
        submit-label="Publish product"
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
  name: 'AdminCreateProductView',
  components: {
    ProductForm
  },
  data() {
    return {
      isSaving: false
    };
  },
  computed: {
    productBackTarget() {
      const returnFocus = String(this.$route.query.returnFocus || '').trim();
      return {
        name: 'studio-products',
        query: returnFocus ? { focus: returnFocus } : {}
      };
    }
  },
  mounted() {
    document.title = 'Create Product | HEM. Studio';
  },
  beforeRouteLeave(to) {
    if (String(to.meta && to.meta.adminSection || '') !== 'products') {
      clearAdminProductListState();
    }
  },
  methods: {
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
        response = await adminProductApi.createProduct({
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
      this.flash('Product created successfully.', 'success');
      this.$router.push(this.productBackTarget);
    }
  }
};
</script>

<style scoped src="@/assets/styles/admin/products/AdminCreateProduct.css"></style>
