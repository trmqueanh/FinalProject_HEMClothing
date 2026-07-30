<template>
  <section v-if="groups.length" class="landing-group-showcases" aria-label="Department categories">
    <article
      v-for="group in groups"
      :key="group.key"
      class="landing-group"
      :aria-labelledby="`${group.key}-title`"
    >
      <header class="landing-group__head">
        <h2 :id="`${group.key}-title`">{{ group.label }}</h2>
      </header>

      <div v-if="group.categoryItems.length" class="landing-group__category-rail" role="list">
        <router-link
          v-for="category in group.categoryItems"
          :key="category.key"
          :to="category.route"
          class="landing-category-card"
          role="listitem"
        >
          <span class="landing-category-card__media">
            <img v-if="category.imageUrl" :src="category.imageUrl" :alt="category.label" loading="lazy" />
            <span v-else class="landing-category-card__fallback">{{ category.iconText }}</span>
          </span>
          <strong class="landing-category-card__label">{{ category.label }}</strong>
        </router-link>

        <router-link :to="group.route" class="landing-category-card landing-category-card--view-all" role="listitem">
          <span class="landing-category-card__arrow" aria-hidden="true">→</span>
          <strong class="landing-category-card__label">View all</strong>
        </router-link>
      </div>

      <div v-if="group.productSections && group.productSections.length" class="landing-group__product-sections">
        <section
          v-for="section in group.productSections"
          :key="section.key"
          class="landing-group__product-section"
          :aria-labelledby="`${group.key}-${section.key}-title`"
        >
          <header class="landing-group__section-head">
            <h3 :id="`${group.key}-${section.key}-title`">{{ section.label }}</h3>
            <router-link
              v-if="section.route"
              :to="section.route"
              class="landing-group__section-link"
              :aria-label="`View all ${section.label}`"
            >
              <svg viewBox="0 0 56 18" aria-hidden="true">
                <path d="M2 9h48" />
                <path d="M42 2l8 7-8 7" />
              </svg>
            </router-link>
          </header>

          <div class="landing-group__product-rail-shell">
            <button
              v-if="section.products.length > 4"
              type="button"
              class="landing-group__product-nav landing-group__product-nav--prev"
              aria-label="Scroll previous products"
              @click="scrollRail(group.key, section.key, -1)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div
              :ref="railRefName(group.key, section.key)"
              class="landing-group__product-rail"
              role="list"
              :aria-label="section.label"
            >
              <div
                v-for="product in section.products"
                :key="product.listingKey || product.favoriteKey || product.id || product.slug || product.name"
                class="landing-group__product-item"
                role="listitem"
              >
                <ProductCard :product="product" />
              </div>
            </div>

            <button
              v-if="section.products.length > 4"
              type="button"
              class="landing-group__product-nav landing-group__product-nav--next"
              aria-label="Scroll next products"
              @click="scrollRail(group.key, section.key, 1)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </section>
      </div>
    </article>
  </section>
</template>

<script>
import ProductCard from '../product/ProductCard.vue';

export default {
  name: 'ShopLandingGroupShowcase',
  components: {
    ProductCard
  },
  props: {
    groups: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    railRefName(groupKey, sectionKey) {
      return `landingGroupProductRail-${groupKey}-${sectionKey}`;
    },
    scrollRail(groupKey, sectionKey, direction) {
      const railRef = this.$refs[this.railRefName(groupKey, sectionKey)];
      const rail = Array.isArray(railRef) ? railRef[0] : railRef;

      if (!rail) return;

      rail.scrollBy({
        left: direction * Math.max(rail.clientWidth * 0.85, 260),
        behavior: 'smooth'
      });
    }
  }
};
</script>

<style scoped>
.landing-group-showcases {
  --lgs-radius: 3px;
  --lgs-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --landing-product-card-width: clamp(224px, 23vw, 304px);
  display: grid;
  gap: clamp(2.1rem, 4vw, 4.5rem);
  padding: clamp(1.6rem, 2.4vw, 2.6rem) clamp(0.85rem, 2.5vw, 3.5rem) 0;
  background: var(--color-paper);
}

.landing-group {
  display: grid;
  gap: clamp(0.9rem, 1.4vw, 1.2rem);
}

@media (min-width: 1440px) {
  .landing-group-showcases {
    padding-inline: clamp(1rem, 1.2vw, 1.5rem);
  }
}

.landing-group__head {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

.landing-group h2 {
  margin: 0;
  padding: 0;
  background: transparent !important;
  color: var(--color-ink);
  font-size: clamp(1.35rem, 1.7vw, 1.9rem);
  line-height: 1.05;
  letter-spacing: 0;
  font-weight: 800;
  text-transform: uppercase;
}

.landing-group__category-rail {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: clamp(112px, 12vw, 152px);
  gap: clamp(0.45rem, 0.8vw, 0.7rem);
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline proximity;
  padding-bottom: 0.35rem;
  scrollbar-width: none;
}

.landing-group__category-rail::-webkit-scrollbar {
  display: none;
}

.landing-group__product-sections {
  display: grid;
  gap: clamp(1.35rem, 2vw, 2rem);
  margin-top: clamp(0.55rem, 1vw, 0.95rem);
}

.landing-group__product-section {
  display: grid;
  gap: clamp(0.75rem, 1vw, 1rem);
}

.landing-group__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
  border: 0 !important;
  box-shadow: none !important;
  background: transparent !important;
}

.landing-group__section-head::before,
.landing-group__section-head::after {
  display: none !important;
  content: none !important;
}

.landing-group__section-head h3 {
  margin: 0;
  color: rgba(17, 17, 17, 0.56);
  font-size: clamp(1.32rem, 1.5vw, 1.85rem);
  font-weight: 850;
  line-height: 1.05;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.landing-group__section-link {
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  width: clamp(3.25rem, 4vw, 4.25rem);
  height: 1.5rem;
  color: rgba(17, 17, 17, 0.56);
  text-decoration: none;
  border: 0;
  border-radius: 0 !important;
  background: transparent;
  box-shadow: none;
}

.landing-group__section-link svg {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.landing-group__section-link:hover {
  color: rgba(17, 17, 17, 0.72);
  background: transparent;
  transform: translateX(4px);
}

.landing-category-card {
  position: relative;
  display: block;
  aspect-ratio: 4 / 5;
  min-width: 0;
  overflow: hidden;
  padding: 0;
  border: 1px solid rgba(17, 17, 17, 0.1);
  background: var(--color-paper-warm);
  text-decoration: none;
  scroll-snap-align: start;
  transition:
    border-color 0.2s var(--lgs-ease),
    background-color 0.2s var(--lgs-ease);
}

.landing-category-card__media {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  width: 100%;
  overflow: hidden;
  background: var(--color-paper-warm);
}

.landing-category-card__media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.45s var(--lgs-ease);
}

.landing-category-card:hover .landing-category-card__media img {
  transform: scale(1.015);
}

.landing-category-card__fallback {
  color: rgba(17, 17, 17, 0.3);
  font-size: clamp(1.1rem, 2vw, 1.5rem);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.landing-category-card__label {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  padding: 2.15rem 0.62rem 0.7rem;
  color: var(--color-white);
  font-size: clamp(0.84rem, 0.78vw, 0.98rem);
  font-weight: 780;
  line-height: 1.16;
  letter-spacing: 0;
  text-align: center;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0));
}

.landing-category-card:hover {
  border-color: rgba(17, 17, 17, 0.24);
  background: var(--color-paper-warm);
}

.landing-category-card--view-all {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 132px;
  gap: 0.7rem;
  background: var(--color-paper);
  color: var(--color-ink);
  transition: border-color 0.2s var(--lgs-ease), background-color 0.2s var(--lgs-ease);
}

.landing-category-card--view-all:hover {
  border-color: var(--color-ink);
  background: var(--color-ink);
}

.landing-category-card--view-all:hover .landing-category-card__label,
.landing-category-card--view-all:hover .landing-category-card__arrow {
  color: var(--color-paper);
}

.landing-category-card--view-all .landing-category-card__arrow {
  display: grid;
  place-items: center;
  width: clamp(2.55rem, 2.7vw, 3rem);
  height: clamp(2.55rem, 2.7vw, 3rem);
  border: 1px solid currentColor;
  border-radius: 50%;
  color: var(--color-ink);
  font-size: clamp(1.25rem, 1.45vw, 1.55rem);
  line-height: 1;
  transition: color 0.2s var(--lgs-ease), transform 0.2s var(--lgs-ease);
}

.landing-category-card--view-all:hover .landing-category-card__arrow {
  transform: translateX(3px);
}

.landing-category-card--view-all .landing-category-card__label {
  position: static;
  padding: 0;
  color: var(--color-ink);
  font-size: clamp(0.92rem, 0.85vw, 1.05rem);
  font-weight: 800;
  background: none;
}

.landing-group__product-rail-shell {
  position: relative;
  min-width: 0;
}

.landing-group__product-rail {
  width: 100%;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: var(--landing-product-card-width);
  gap: 2px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline proximity;
  padding-bottom: 0.5rem;
  scrollbar-width: none;
}

.landing-group__product-rail::-webkit-scrollbar {
  display: none;
}

.landing-group__product-nav {
  position: absolute;
  top: 38%;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  padding: 0;
  border: 1px solid rgba(17, 17, 17, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-ink);
  box-shadow: 0 12px 28px rgba(17, 24, 39, 0.12);
  cursor: pointer;
  transform: translateY(-50%);
  transition:
    background var(--t-fast) var(--ease-out),
    transform var(--t-fast) var(--ease-out);
}

.landing-group__product-nav:hover {
  background: var(--color-white);
  transform: translateY(-50%) scale(1.04);
}

.landing-group__product-nav:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 2px;
}

.landing-group__product-nav svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.landing-group__product-nav--prev {
  left: 10px;
}

.landing-group__product-nav--next {
  right: 10px;
}

.landing-group__product-item {
  width: var(--landing-product-card-width);
  min-width: 0;
  scroll-snap-align: start;
  background: var(--color-paper);
}

.landing-group__product-item :deep(.product-card) {
  height: auto;
  background: var(--color-paper);
}

.landing-group__product-item :deep(.product-card__visual) {
  padding: 0;
}

.landing-group__product-item :deep(.product-card__content) {
  padding: var(--sp-3) var(--sp-4) var(--sp-5);
}

.landing-group__product-item :deep(.product-visual) {
  width: 100%;
  border-radius: 0;
  box-shadow: none;
  transition: none;
}

.landing-group__product-item :deep(.product-card:hover .product-visual) {
  transform: none;
}

.landing-group__product-item :deep(.product-card__meta-line) {
  font-size: var(--size-10);
  color: var(--color-ink-30);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.landing-group__product-item :deep(.product-card__title) {
  font-size: var(--size-13);
  font-weight: 400;
  letter-spacing: 0;
  color: var(--color-ink);
}

.landing-group__product-item :deep(.product-card__price-row) {
  font-size: var(--size-13);
  color: var(--color-ink);
}

@media (max-width: 1180px) {
  .landing-group-showcases {
    --landing-product-card-width: clamp(214px, 30vw, 276px);
  }
}

@media (max-width: 780px) {
  .landing-group-showcases {
    --landing-product-card-width: clamp(190px, 44vw, 244px);
    padding-inline: 1rem;
  }
}

@media (max-width: 520px) {
  .landing-group-showcases {
    --landing-product-card-width: min(72vw, 238px);
  }

  .landing-group__category-rail {
    grid-auto-columns: min(34vw, 128px);
  }

  .landing-group__product-item :deep(.product-card__visual) {
    padding: 0;
  }

  .landing-group__product-item :deep(.product-card__content) {
    padding: var(--sp-2) var(--sp-2) var(--sp-4);
  }

  .landing-group__product-nav {
    display: none;
  }
}
</style>
