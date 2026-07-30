<template>
  <section class="product-preview-grid" :aria-labelledby="sectionId">
    <h2 :id="sectionId">{{ label }}</h2>

    <div class="product-preview-grid__items" role="list" :aria-label="label">
      <div
        v-for="product in products"
        :key="product.listingKey || product.favoriteKey || product.id"
        class="product-preview-grid__item"
        role="listitem"
      >
        <ProductCard :product="product" :compact="compact" />
      </div>
    </div>
  </section>
</template>

<script>
import ProductCard from '../product/ProductCard.vue';

export default {
  name: 'ShopProductPreviewGrid',
  components: {
    ProductCard
  },
  props: {
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
    compact: {
      type: Boolean,
      default: false
    }
  }
};
</script>

<style scoped>
.product-preview-grid {
  --color-ink: #0a0a0a;
  --color-ink-30: rgba(10, 10, 10, 0.30);
  --color-paper: #ffffff;
  --color-paper-warm: #ffffff;
  --font: Abel, sans-serif;
  --size-10: 0.625rem;
  --size-11: 0.6875rem;
  --size-13: 0.8125rem;
  --sp-2: 0.5rem;
  --sp-3: 0.75rem;
  --sp-4: 1rem;
  --sp-5: 1.25rem;

  display: grid;
  gap: clamp(0.85rem, 1.2vw, 1.15rem);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  background: var(--color-paper);
  font-family: var(--font, Abel, sans-serif);
}

.product-preview-grid h2 {
  margin: 0;
  color: var(--color-ink);
  font-size: clamp(1.05rem, 1.25vw, 1.25rem);
  line-height: 1.05;
  letter-spacing: 0;
  font-weight: 800;
}

.product-preview-grid__items {
  display: grid;
  grid-template-columns: repeat(var(--preview-grid-columns, 4), minmax(0, 1fr));
  align-items: start;
  gap: 2px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.product-preview-grid__item {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  background: var(--color-paper-warm);
}

.product-preview-grid__item :deep(.product-card) {
  width: 100%;
  max-width: 100%;
  height: auto;
  overflow: hidden;
  background: var(--color-paper-warm);
}

.product-preview-grid__item :deep(.product-card__visual) {
  padding: 0;
}

.product-preview-grid__item :deep(.product-card__content) {
  padding: var(--sp-3) var(--sp-4) var(--sp-5);
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}

.product-preview-grid__item :deep(.product-visual) {
  width: 100%;
  border-radius: 0;
  box-shadow: none;
  transition: none;
}

.product-preview-grid__item :deep(.product-card:hover .product-visual) {
  transform: none;
}

.product-preview-grid__item :deep(.product-card__meta-line) {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  color: var(--color-ink-30) !important;
  font-size: var(--size-10) !important;
  font-weight: 500 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase;
}

.product-preview-grid__item :deep(.product-card__meta-line > span:first-child) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-preview-grid__item :deep(.product-card__title) {
  color: var(--color-ink) !important;
  font-family: var(--font, Abel, sans-serif) !important;
  font-size: var(--size-13) !important;
  font-weight: 400 !important;
  letter-spacing: 0 !important;
  line-height: 1.45 !important;
  text-transform: uppercase;
}

.product-preview-grid__item :deep(.product-card__price-row),
.product-preview-grid__item :deep(.product-card__price-amount) {
  max-width: 100%;
  overflow: hidden;
  color: var(--color-ink);
  font-family: var(--font, Abel, sans-serif) !important;
  font-size: var(--size-13) !important;
  letter-spacing: 0.01em !important;
  line-height: 1.35 !important;
}

.product-preview-grid__item :deep(.product-card__price-main),
.product-preview-grid__item :deep(.product-card__price-stack),
.product-preview-grid__item :deep(.product-card__price-promo) {
  min-width: 0;
  max-width: 100%;
}

.product-preview-grid__item :deep(.product-card__price-promo) {
  flex-wrap: wrap;
  row-gap: 4px;
}

.product-preview-grid__item :deep(.product-card__price-original) {
  font-family: var(--font, Abel, sans-serif) !important;
  font-size: var(--size-11) !important;
  letter-spacing: 0.01em !important;
}

.product-preview-grid__item :deep(.product-card__discount) {
  font-family: var(--font, Abel, sans-serif) !important;
  font-size: var(--size-10) !important;
  letter-spacing: 0 !important;
}

@media (max-width: 1180px) {
  .product-preview-grid {
    --preview-grid-columns: 3;
  }

  .product-preview-grid__items {
    grid-template-columns: repeat(var(--preview-grid-columns, 3), minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .product-preview-grid__items {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .product-preview-grid__item :deep(.product-card__content) {
    padding: var(--sp-2) var(--sp-2) var(--sp-4);
  }
}
</style>
