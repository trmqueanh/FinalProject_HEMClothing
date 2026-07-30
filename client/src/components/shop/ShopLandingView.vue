<template>
  <!-- ShopLandingView: render landing page /women hoặc /men, không xử lý filter/listing. -->
  <ShopLandingHero
    :active-department-label="activeDepartmentLabel"
    :all-products-link="allProductsLink"
  />

  <ShopLandingDiscovery
    :popular-category-items="popularCategoryItems"
  />

  <ShopLandingProductSection
    v-for="collection in featuredCollections"
    :key="collection.key"
    :section-id="`${collection.key}-title`"
    :label="collection.label"
    banner-mode
    :banner-image="collection.bannerImage"
    :view-all-route="collection.route"
    :products="collection.products"
  />

  <ShopLandingGroupShowcase :groups="groupShowcases" />

  <section v-if="saleCircleItems.length" class="landing-sale-circles">
    <ShopCircleRail :title="saleCircleTitle" :items="saleCircleItems" />
  </section>

  <ShopLandingProductSection
    v-if="saleHighlights.length"
    section-id="section-sales"
    label="Sale"
    :products="saleHighlights"
  />

  <ShopCouponSection
    :coupons="coupons"
    :is-loading="isLoadingCoupons"
    :format-currency="formatCurrency"
  />
</template>

<script>
import ShopLandingDiscovery from './ShopLandingDiscovery.vue';
import ShopLandingHero from './ShopLandingHero.vue';
import ShopLandingProductSection from './ShopLandingProductSection.vue';
import ShopCircleRail from './ShopCircleRail.vue';
import ShopCouponSection from './ShopCouponSection.vue';
import ShopLandingGroupShowcase from './ShopLandingGroupShowcase.vue';

export default {
  name: 'ShopLandingView',
  components: {
    ShopLandingDiscovery,
    ShopLandingHero,
    ShopLandingProductSection,
    ShopCircleRail,
    ShopCouponSection,
    ShopLandingGroupShowcase
  },
  emits: ['collection-image-error', 'video-error'],
  props: {
    activeDepartmentLabel: { type: String, required: true },
    allProductsLink: { type: Object, required: true },
    collectionImageUrl: { type: Function, required: true },
    coupons: { type: Array, default: () => [] },
    departmentCategories: { type: Array, default: () => [] },
    editorialContent: { type: Object, required: true },
    formatCategoryLabel: { type: Function, required: true },
    formatCurrency: { type: Function, required: true },
    featuredCollections: { type: Array, default: () => [] },
    heroCollections: { type: Array, required: true },
    groupShowcases: { type: Array, default: () => [] },
    heroMediaKey: { type: String, required: true },
    heroVideoSources: { type: Array, required: true },
    isCollectionImageFailed: { type: Function, required: true },
    isLoadingCoupons: { type: Boolean, default: false },
    popularCategoryItems: { type: Array, default: () => [] },
    saleCircleItems: { type: Array, default: () => [] },
    saleCircleTitle: { type: String, default: 'Sale Picks' },
    saleHighlights: { type: Array, required: true },
    showHeroVideo: { type: Boolean, required: true }
  }
};
</script>

<style scoped>
.landing-sale-circles {
  padding: clamp(1.6rem, 2.4vw, 2.6rem) clamp(0.85rem, 2.5vw, 3.5rem) 0;
  background: var(--color-paper);
}

@media (min-width: 1440px) {
  .landing-sale-circles {
    padding-inline: clamp(1rem, 1.2vw, 1.5rem);
  }
}

@media (max-width: 720px) {
  .landing-sale-circles {
    padding-inline: 1rem;
  }
}
</style>
