<template>
  <section class="related-products">
    <div class="page-intro page-intro--compact">
      <h2>{{ title }}</h2>
    </div>

    <div class="related-product-rail-shell">
      <button
        v-if="showRailControls"
        type="button"
        class="related-product-rail__nav related-product-rail__nav--prev"
        :aria-label="`Scroll previous ${title}`"
        @click="scrollRail(-1)"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div ref="productRail" class="related-product-rail" role="list" :aria-label="title">
        <div
          v-for="item in relatedProducts"
          :key="item.listingKey || item.favoriteKey || item.id"
          class="related-product-rail__item"
          role="listitem"
        >
          <product-card :product="item" />
        </div>
      </div>

      <button
        v-if="showRailControls"
        type="button"
        class="related-product-rail__nav related-product-rail__nav--next"
        :aria-label="`Scroll next ${title}`"
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
import ProductCard from './ProductCard.vue';

export default {
  name: 'RelatedProducts',
  components: {
    ProductCard
  },
  props: {
    title: {
      type: String,
      default: 'Similar Items'
    },
    relatedProducts: {
      type: Array,
      default: () => []
    }
  },
  computed: {
    showRailControls() {
      return this.relatedProducts.length > 4;
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
.related-products {
  --related-product-card-width: clamp(224px, 23vw, 304px);

  display: grid;
  gap: clamp(0.9rem, 1.4vw, 1.2rem);
  width: 100%;
  max-width: 100%;
  padding: clamp(1.6rem, 2.4vw, 2.6rem) 0 0;
  border-top: 1px solid var(--color-border-subtle);
  margin-top: clamp(2rem, 4vw, 3rem);
  overflow: hidden;
  min-width: 0;
}

.related-products .page-intro {
  width: 100%;
  max-width: none;
  margin: 0;
}

.related-products .page-intro h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(1.05rem, 1.2vw, 1.35rem) !important;
  line-height: 1.05;
  letter-spacing: 0;
  font-weight: 800;
}

.related-product-rail-shell {
  position: relative;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.related-product-rail {
  width: 100%;
  max-width: 100%;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: var(--related-product-card-width);
  gap: 2px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline proximity;
  padding-bottom: 0.5rem;
  scrollbar-width: none;
}

.related-product-rail::-webkit-scrollbar {
  display: none;
}

.related-product-rail__item {
  width: var(--related-product-card-width);
  min-width: 0;
  scroll-snap-align: start;
  background: var(--color-paper-warm);
}

.related-product-rail__nav {
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

.related-product-rail__nav:hover {
  background: var(--color-white);
  transform: translateY(-50%) scale(1.04);
}

.related-product-rail__nav:focus-visible {
  outline: 2px solid var(--color-ink);
  outline-offset: 2px;
}

.related-product-rail__nav svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.related-product-rail__nav--prev {
  left: 10px;
}

.related-product-rail__nav--next {
  right: 10px;
}

.related-product-rail__item :deep(.product-card) {
  height: auto;
  background: var(--color-paper-warm);
}

.related-product-rail__item :deep(.product-card__visual) {
  padding: 0;
}

.related-product-rail__item :deep(.product-card__content) {
  padding: var(--sp-3) var(--sp-4) var(--sp-5);
}

.related-product-rail__item :deep(.product-visual) {
  width: 100%;
  border-radius: 0;
  box-shadow: none;
  transition: none;
}

.related-product-rail__item :deep(.product-card:hover .product-visual) {
  transform: none;
}

.related-product-rail__item :deep(.product-card__meta-line) {
  font-size: 10px !important;
  color: var(--color-ink-30);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.related-product-rail__item :deep(.product-card__rating) {
  font-size: 11px !important;
}

.related-product-rail__item :deep(.product-card__title) {
  font-size: 13px !important;
  font-weight: 400 !important;
  letter-spacing: 0 !important;
  line-height: 1.45 !important;
  color: var(--color-ink);
}

.related-product-rail__item :deep(.product-card__price-row) {
  font-size: 13px !important;
  color: var(--color-ink);
}

.related-product-rail__item :deep(.product-card__price-amount) {
  font-size: 13px !important;
}

.related-product-rail__item :deep(.product-card__price-original) {
  font-size: 11px !important;
}

.related-product-rail__item :deep(.product-card__price-label) {
  font-size: 9px !important;
}

.related-product-rail__item :deep(.product-card__discount) {
  min-height: 21px;
  font-size: 11px !important;
}

@media (max-width: 1180px) {
  .related-products {
    --related-product-card-width: clamp(214px, 30vw, 276px);
  }
}

@media (max-width: 860px) {
  .related-products {
    --related-product-card-width: clamp(190px, 44vw, 244px);
  }
}

@media (max-width: 560px) {
  .related-products {
    --related-product-card-width: min(72vw, 238px);
  }

  .related-product-rail__item :deep(.product-card__visual) {
    padding: 0;
  }

  .related-product-rail__item :deep(.product-card__content) {
    padding: var(--sp-2) var(--sp-2) var(--sp-4);
  }

  .related-product-rail__nav {
    display: none;
  }
}
</style>
