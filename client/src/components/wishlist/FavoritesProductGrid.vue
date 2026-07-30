<template>
  <div class="shop-results">
    <div class="shop-grid">
      <ProductCard
        v-for="product in products"
        :key="product.listingKey || product.favoriteKey || product.id"
        :product="product"
      />
    </div>
  </div>
</template>

<script>
import ProductCard from '../product/ProductCard.vue';

export default {
  name: 'FavoritesProductGrid',
  components: {
    ProductCard
  },
  props: {
    products: {
      type: Array,
      default: () => []
    }
  }
};
</script>

<style scoped>
/* Keep the favorites product presentation identical to the storefront catalog grid. */
.shop-results {
  width: 100%;
  padding: var(--sp-2) clamp(18px, 2.4vw, 44px) var(--sp-10);
  background: var(--color-paper);
}

.shop-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: auto;
  align-items: start;
  gap: 2px;
}

.shop-grid :deep(.product-card) {
  display: flex;
  flex-direction: column;
  height: auto;
  gap: 0;
  overflow: visible;
  background: var(--color-paper-warm);
  transition: background var(--t-fast);
}

.shop-grid :deep(.product-card:hover) {
  background: var(--color-paper);
}

.shop-grid :deep(.product-card__visual) {
  padding: 0;
}

.shop-grid :deep(.product-card__content) {
  padding: var(--sp-3) var(--sp-4) var(--sp-5);
}

.shop-grid :deep(.product-visual) {
  width: 100%;
  border-radius: 0;
  box-shadow: none;
  transition: none;
}

.shop-grid :deep(.product-card:hover .product-visual) {
  transform: none;
}

.shop-grid :deep(.product-card__meta-line) {
  color: var(--color-ink-30);
  font-size: var(--size-10);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.shop-grid :deep(.product-card__title) {
  color: var(--color-ink);
  font-size: var(--size-13);
  font-weight: 400;
  letter-spacing: 0;
}

.shop-grid :deep(.product-card__price-row) {
  color: var(--color-ink);
  font-size: var(--size-13);
}

@media (max-width: 1180px) {
  .shop-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .shop-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 560px) {
  .shop-results {
    padding-block: var(--sp-1) var(--sp-9);
  }

  .shop-grid :deep(.product-card__visual) {
    padding: 0;
  }

  .shop-grid :deep(.product-card__content) {
    padding: var(--sp-2) var(--sp-2) var(--sp-4);
  }
}
</style>
