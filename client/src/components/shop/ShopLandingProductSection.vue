<template>
  <section
    class="landing-section"
    :class="{ 'landing-section--banner': bannerMode }"
    :aria-labelledby="sectionId"
  >
    <router-link
      v-if="bannerMode"
      :to="viewAllRoute"
      class="landing-section__banner"
      :aria-label="`View ${label} collection`"
    >
      <img
        v-if="bannerImage"
        :src="bannerImage"
        :alt="`${label} collection banner`"
        loading="lazy"
      />
      <span v-else class="landing-section__banner-fallback" aria-hidden="true"></span>
      <span :id="sectionId" class="landing-section__sr-only">{{ label }}</span>
    </router-link>

    <header v-else class="landing-section__header">
      <div class="landing-section__heading">
        <p v-if="eyebrow" class="landing-section__eyebrow">{{ eyebrow }}</p>
        <h2 :id="sectionId">{{ label }}</h2>
        <p v-if="description" class="landing-section__description">{{ description }}</p>
      </div>

      <router-link
        v-if="viewAllRoute"
        :to="viewAllRoute"
        class="landing-section__link"
      >
        <span>{{ viewAllLabel }}</span>
        <svg viewBox="0 0 56 18" aria-hidden="true">
          <path d="M2 9h48" />
          <path d="M42 2l8 7-8 7" />
        </svg>
      </router-link>
    </header>

    <div class="landing-product-rail-shell">
      <button
        v-if="showRailControls"
        type="button"
        class="landing-product-rail__nav landing-product-rail__nav--prev"
        aria-label="Scroll previous products"
        @click="scrollRail(-1)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div ref="productRail" class="landing-product-rail" role="list" :aria-label="label">
        <div
          v-for="product in products"
          :key="product.listingKey || product.favoriteKey || product.id"
          class="landing-product-rail__item"
          role="listitem"
        >
          <ProductCard :product="product" />
        </div>
      </div>

      <button
        v-if="showRailControls"
        type="button"
        class="landing-product-rail__nav landing-product-rail__nav--next"
        aria-label="Scroll next products"
        @click="scrollRail(1)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  </section>
</template>

<script>
import ProductCard from '../product/ProductCard.vue';

export default {
  name: 'ShopLandingProductSection',
  components: {
    ProductCard
  },
  props: {
    bannerImage: {
      type: String,
      default: ''
    },
    bannerMode: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      default: ''
    },
    eyebrow: {
      type: String,
      default: ''
    },
    sectionId: {
      type: String,
      required: true
    },
    label: {
      type: String,
      required: true
    },
    products: {
      type: Array,
      default: () => []
    },
    viewAllLabel: {
      type: String,
      default: 'View all'
    },
    viewAllRoute: {
      type: [Object, String],
      default: null
    }
  },
  computed: {
    showRailControls() {
      return this.products.length > 4;
    }
  },
  methods: {
    scrollRail(direction) {
      const rail = this.$refs.productRail;
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
.landing-section {
  --landing-product-card-width: clamp(224px, 23vw, 304px);
  --color-ink: #0a0a0a;
  --color-ink-30: rgba(10, 10, 10, 0.30);
  --color-ink-12: rgba(10, 10, 10, 0.12);
  --color-paper: #ffffff;
  --color-paper-warm: #ffffff;
  --color-white: #ffffff;
  --font: Abel, sans-serif;
  --size-10: 0.625rem;
  --size-11: 0.6875rem;
  --size-13: 0.8125rem;
  --sp-2: 0.5rem;
  --sp-3: 0.75rem;
  --sp-4: 1rem;
  --sp-5: 1.25rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --t-fast: 180ms;

  display: grid;
  gap: clamp(0.9rem, 1.4vw, 1.2rem);
  width: 100%;
  max-width: 100%;
  padding: clamp(1.6rem, 2.4vw, 2.6rem) clamp(0.85rem, 2.5vw, 3.5rem) 0;
  overflow: hidden;
  background: var(--color-paper);
  box-sizing: border-box;
  font-family: var(--font, Abel, sans-serif);
}

.landing-section__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: clamp(1rem, 3vw, 3rem);
}

.landing-section__banner {
  position: relative;
  display: block;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  aspect-ratio: 64 / 15;
  overflow: hidden;
  background: #eeeae4;
  color: inherit;
  text-decoration: none;
}

.landing-section--banner {
  overflow: visible;
}

.landing-section__banner img {
  display: block;
  width: 100%;
  height: 100%;
}

.landing-section__banner img {
  object-fit: cover;
  object-position: center;
  transition: transform 0.6s var(--ease-out);
}

.landing-section__banner:hover img {
  transform: scale(1.008);
}

.landing-section__banner:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 4px;
}

.landing-section__banner-fallback {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 1;
  background:
    linear-gradient(110deg, rgba(255, 255, 255, 0.25), transparent 52%),
    #e4dfd7;
}

.landing-section__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.landing-section__heading {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.landing-section__eyebrow {
  margin: 0;
  color: rgba(10, 10, 10, 0.5);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.landing-section h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(1.35rem, 1.7vw, 1.9rem);
  line-height: 1.05;
  letter-spacing: 0;
  font-weight: 800;
}

.landing-section__description {
  max-width: 42rem;
  margin: 0.1rem 0 0;
  color: rgba(10, 10, 10, 0.58);
  font-size: clamp(0.83rem, 0.9vw, 0.96rem);
  line-height: 1.5;
}

.landing-section__link {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding-bottom: 0.2rem;
  color: var(--color-ink);
  font-size: clamp(0.72rem, 0.78vw, 0.84rem);
  font-weight: 700;
  letter-spacing: 0.04em;
  text-decoration: none;
  text-transform: uppercase;
}

.landing-section__link svg {
  width: clamp(2.7rem, 3.5vw, 3.5rem);
  height: 1.1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform var(--t-fast) var(--ease-out);
}

.landing-section__link:hover svg {
  transform: translateX(4px);
}

.landing-section__link:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 4px;
}

@media (min-width: 1440px) {
  .landing-section {
    padding-inline: clamp(1rem, 1.2vw, 1.5rem);
  }
}

.landing-product-rail-shell {
  position: relative;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.landing-product-rail {
  width: 100%;
  max-width: 100%;
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

.landing-product-rail__nav {
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

.landing-product-rail__nav:hover {
  background: var(--color-white);
  transform: translateY(-50%) scale(1.04);
}

.landing-product-rail__nav:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 2px;
}

.landing-product-rail__nav svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.landing-product-rail__nav--prev {
  left: 10px;
}

.landing-product-rail__nav--next {
  right: 10px;
}

.landing-product-rail::-webkit-scrollbar {
  display: none;
}

.landing-product-rail__item {
  width: var(--landing-product-card-width);
  min-width: 0;
  max-width: var(--landing-product-card-width);
  scroll-snap-align: start;
  background: var(--color-paper-warm);
  overflow: hidden;
}

.landing-product-rail__item :deep(.product-card) {
  height: auto;
  width: 100%;
  max-width: 100%;
  background: var(--color-paper-warm);
  overflow: hidden;
}

.landing-product-rail__item :deep(.product-card__visual) {
  padding: 0;
}

.landing-product-rail__item :deep(.product-card__content) {
  padding: var(--sp-3) var(--sp-4) var(--sp-5);
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.landing-product-rail__item :deep(.product-visual) {
  width: 100%;
  border-radius: 0;
  box-shadow: none;
  transition: none;
}

.landing-product-rail__item :deep(.product-card:hover .product-visual) {
  transform: none;
}

.landing-product-rail__item :deep(.product-card__meta-line) {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  font-size: var(--size-10) !important;
  color: var(--color-ink-30);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.landing-product-rail__item :deep(.product-card__meta-line > span:first-child) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.landing-product-rail__item :deep(.product-card__title) {
  font-size: var(--size-13) !important;
  font-weight: 400 !important;
  letter-spacing: 0 !important;
  line-height: 1.45 !important;
  color: var(--color-ink);
}

.landing-product-rail__item :deep(.product-card__price-row) {
  max-width: 100%;
  overflow: hidden;
  font-size: var(--size-13) !important;
  color: var(--color-ink);
}

.landing-section .landing-product-rail__item :deep(.product-card__meta-line) {
  color: var(--color-ink-30) !important;
  font-size: var(--size-10) !important;
  font-weight: 500 !important;
  letter-spacing: 0.08em !important;
}

.landing-section .landing-product-rail__item :deep(.product-card__title) {
  color: var(--color-ink) !important;
  font-family: var(--font, Abel, sans-serif) !important;
  font-size: var(--size-13) !important;
  font-weight: 400 !important;
  letter-spacing: 0 !important;
  line-height: 1.45 !important;
  text-transform: uppercase;
}

.landing-section .landing-product-rail__item :deep(.product-card__price-row),
.landing-section .landing-product-rail__item :deep(.product-card__price-amount) {
  font-family: var(--font, Abel, sans-serif) !important;
  font-size: var(--size-13) !important;
  letter-spacing: 0.01em !important;
  line-height: 1.35 !important;
}

.landing-section .landing-product-rail__item :deep(.product-card__price-original) {
  font-family: var(--font, Abel, sans-serif) !important;
  font-size: var(--size-11) !important;
  letter-spacing: 0.01em !important;
}

.landing-section .landing-product-rail__item :deep(.product-card__discount) {
  font-family: var(--font, Abel, sans-serif) !important;
  font-size: var(--size-10) !important;
  letter-spacing: 0 !important;
}

.landing-product-rail__item :deep(.product-card__price-main),
.landing-product-rail__item :deep(.product-card__price-stack),
.landing-product-rail__item :deep(.product-card__price-promo) {
  min-width: 0;
  max-width: 100%;
}

.landing-product-rail__item :deep(.product-card__price-promo) {
  flex-wrap: wrap;
  row-gap: 4px;
}

.landing-product-rail__item :deep(.product-card__price-amount) {
  min-width: 0;
  font-size: var(--size-13) !important;
  overflow-wrap: anywhere;
}

.landing-product-rail__item :deep(.product-card__price-original) {
  font-size: var(--size-11) !important;
}

.landing-product-rail__item :deep(.product-card__discount) {
  font-size: var(--size-10) !important;
}

@media (max-width: 1180px) {
  .landing-section {
    --landing-product-card-width: clamp(214px, 30vw, 276px);
  }
}
@media (max-width: 860px) {
  .landing-section {
    --landing-product-card-width: clamp(190px, 44vw, 244px);
  }
}
@media (max-width: 560px) {
  .landing-section {
    --landing-product-card-width: min(72vw, 238px);
    padding-inline: 1rem;
  }

  .landing-section__header {
    align-items: flex-start;
  }

  .landing-section__link {
    margin-top: 1.05rem;
  }

  .landing-section__link span {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .landing-product-rail__item :deep(.product-card__visual) {
    padding: 0;
  }

  .landing-product-rail__item :deep(.product-card__content) {
    padding: var(--sp-2) var(--sp-2) var(--sp-4);
  }

  .landing-product-rail__nav {
    display: none;
  }
}
</style>
