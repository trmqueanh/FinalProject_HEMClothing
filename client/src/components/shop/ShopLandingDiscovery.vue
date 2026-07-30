<template>
  <section class="landing-discovery" aria-label="Landing discovery links">
    <ShopCircleRail
      v-if="popularCategoryItems.length"
      title="Most Searched Products"
      :items="popularCategoryItems"
    />
  </section>
</template>

<script>
import ShopCircleRail from './ShopCircleRail.vue';

export default {
  name: 'ShopLandingDiscovery',
  components: {
    ShopCircleRail
  },
  props: {
    popularCategoryItems: {
      type: Array,
      default: () => []
    }
  }
};
</script>

<style scoped>
.landing-discovery {
  display: grid;
  gap: clamp(1.35rem, 2vw, 2rem);
  padding: clamp(1.8rem, 3vw, 3rem) clamp(0.85rem, 2.5vw, 3.5rem) 0;
  background: var(--color-paper);
}

@media (max-width: 720px) {
  .landing-discovery {
    padding-inline: 1rem;
  }
}

@media (min-width: 1440px) {
  .landing-discovery {
    padding-inline: clamp(1rem, 1.2vw, 1.5rem);
  }
}
</style>
