<template>
  <section class="page-section not-found-view">
    <PageBreadcrumbs :items="breadcrumbItems" />

    <div class="shell-card not-found-view__card">
      <p class="eyebrow">404</p>
      <h1>Page not found.</h1>
      <p>The page may have moved, or the route does not exist in the storefront yet.</p>
      <router-link to="/women" class="primary-button">Back to shopping</router-link>
    </div>
  </section>
</template>

<script>
import PageBreadcrumbs from '../../components/common/PageBreadcrumbs.vue';

export default {
  name: 'NotFoundView',
  components: {
    PageBreadcrumbs
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
          label: 'page not found',
          current: true
        }
      ];
    }
  }
};
</script>

<style scoped src="@/assets/styles/system/NotFound.css"></style>
